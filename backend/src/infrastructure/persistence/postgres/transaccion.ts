import type pg from 'pg';

/**
 * Ejecuta un trabajo dentro de una transaccion, sin que una conexion
 * rota se lleve por delante el proceso entero.
 *
 * Existe por un fallo reproducible, y conviene contarlo entero porque el
 * sintoma no se parece a la causa.
 *
 * `crearPool` ya trae un `pool.on('error')`, y eso basta para las
 * conexiones que estan OCIOSAS dentro del pool: cuando el servidor las
 * cierra (Neon suspende la base de datos, PgBouncer recicla, un
 * cortafuegos corta lo inactivo), el pool captura el evento y repone la
 * conexion sin que nadie se entere.
 *
 * Pero una conexion SACADA del pool con `pool.connect()` es otra cosa.
 * Mientras esta prestada, `pg` le quita al cliente el oyente del pool, y
 * si la conexion se cae en ese rato el cliente emite 'error' sin nadie
 * escuchando. En Node, un EventEmitter que emite 'error' sin oyente
 * TERMINA EL PROCESO. El servidor se cae con "Connection terminated
 * unexpectedly" y un `Unhandled 'error' event`, sin pasar por ningun
 * try/catch, porque no es una promesa rechazada: es un evento suelto.
 *
 * Comprobado con las dos situaciones lado a lado: con la conexion ociosa
 * el proceso sobrevive; con la conexion prestada, muere.
 *
 * Lo que hace esta funcion, y que no hacia el codigo que reemplaza:
 *
 *  1. **Escucha al cliente mientras lo tiene prestado.** Es lo unico que
 *     de verdad impide la caida.
 *  2. **Protege el ROLLBACK.** Si la conexion ya esta muerta, el ROLLBACK
 *     tambien falla, y ese segundo error tapaba al primero: en el log
 *     aparecia el problema de la limpieza y no el que lo causo.
 *  3. **Devuelve el cliente roto DESTRUIDO,** con `release(error)`. Sin
 *     eso, una conexion inservible vuelve al pool y la siguiente
 *     operacion la vuelve a sacar, fallando igual. Un fallo puntual se
 *     convertia en uno permanente hasta reiniciar.
 */
export async function enTransaccion<T>(
  pool: pg.Pool,
  trabajo: (cliente: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const cliente = await pool.connect();

  /**
   * El oyente que evita que el proceso muera.
   *
   * No hace falta que haga nada util: basta con que exista. Se deja
   * constancia en el log porque una conexion que se cae en mitad de una
   * transaccion es informacion, no ruido.
   */
  let conexionRota: Error | null = null;
  const alRomperse = (error: Error) => {
    conexionRota = error;
    console.error(
      '[pg] La conexión se cortó en mitad de una transacción:',
      error.message,
    );
  };
  cliente.on('error', alRomperse);

  try {
    await cliente.query('BEGIN');
    const resultado = await trabajo(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    // El ROLLBACK es limpieza, no puede robarle el sitio al error real.
    // Si la conexion ya esta caida fallara tambien, y da igual: la
    // transaccion muere con ella de todas formas.
    try {
      await cliente.query('ROLLBACK');
    } catch {
      /* se ignora a proposito: manda el error de arriba */
    }
    throw error;
  } finally {
    cliente.removeListener('error', alRomperse);
    // Con un argumento, `release` DESTRUYE el cliente en vez de
    // devolverlo al pool. Es lo que hay que hacer con una conexion que
    // ya no sirve.
    cliente.release(conexionRota ?? undefined);
  }
}
