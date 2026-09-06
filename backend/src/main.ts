import { cargarEntorno } from './config/entorno.js';
import { construirContenedor } from './contenedor.js';
import { crearServidor } from './infrastructure/http/servidor.js';
import { aplicarEsquema } from './infrastructure/persistence/postgres/esquema.js';

/**
 * Punto de entrada del backend de Chronova.
 *
 * Su unica responsabilidad es arrancar: leer la configuracion, construir
 * el contenedor, levantar el servidor y programar la tarea periodica.
 */
const MINUTOS_ENTRE_CIERRES = 15;
/** Margen para que el servidor termine de levantarse antes de la primera pasada. */
const SEGUNDOS_ANTES_DEL_PRIMER_CIERRE = 10;

async function arrancar(): Promise<void> {
  const entorno = cargarEntorno();
  const contenedor = construirContenedor(entorno);

  // El esquema se pone al dia ANTES de escuchar. Si falla, no se levanta
  // el servidor: mas vale un arranque que se cae con el motivo escrito
  // que una API que responde "ok" y no puede guardar nada.
  if (contenedor.pool) {
    try {
      await aplicarEsquema(contenedor.pool);
    } catch (error) {
      await contenedor.cerrar();
      throw new Error(
        'No se pudo poner al dia el esquema de la base de datos. ' +
          'Comprueba DATABASE_URL y que el usuario tenga permiso para crear y alterar tablas.\n' +
          `Detalle: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const app = crearServidor(contenedor);

  const servidor = app.listen(entorno.puerto, () => {
    console.log('');
    console.log('  Chronova API');
    console.log(`  Escuchando en   http://localhost:${entorno.puerto}`);
    console.log(`  Persistencia    ${entorno.persistencia}${contenedor.pool ? ' (esquema al dia)' : ''}`);
    console.log(`  Entorno         ${entorno.entornoDeEjecucion}`);
    console.log(`  Comprobacion    http://localhost:${entorno.puerto}/api/salud`);
    if (entorno.persistencia === 'memory') {
      console.log('');
      console.log('  Aviso: los datos estan solo en memoria y se pierden al reiniciar.');
      console.log('  Para usar una base de datos real, pon PERSISTENCE=postgres en .env');
    }
    console.log('');
  });

  /**
   * Tarea periodica: cerrar las tomas que nadie confirmo.
   *
   * En un despliegue serio esto seria un trabajo aparte (un cron), no un
   * temporizador dentro del servidor web, para que no se duplique si hay
   * varias instancias. Para el alcance del proyecto es suficiente.
   */
  const cerrarVencidas = () => {
    contenedor.casosDeUso.cerrarTomasVencidas
      .ejecutar()
      .then(({ tomasCerradas, avisosEnviados }) => {
        if (tomasCerradas > 0) {
          console.log(
            `[tarea] ${tomasCerradas} toma(s) cerrada(s) por falta de respuesta, ${avisosEnviados} aviso(s) enviado(s).`,
          );
        }
      })
      .catch((error) => console.error('[tarea] Fallo el cierre de tomas vencidas:', error));
  };

  // Una pasada al arrancar, ademas de las periodicas.
  //
  // Sin esto, un servidor que se reinicia deja sin cerrar las tomas que
  // vencieron mientras estaba apagado hasta que pasan quince minutos, y
  // el cuidador recibe su aviso con ese retraso. Tambien hace practicable
  // probar las notificaciones: reiniciar el servidor las dispara en vez
  // de obligar a esperar el siguiente ciclo.
  //
  // La operacion es idempotente: solo toca tomas realmente vencidas, asi
  // que repetirla no tiene efecto.
  setTimeout(cerrarVencidas, SEGUNDOS_ANTES_DEL_PRIMER_CIERRE * 1_000);

  const temporizador = setInterval(cerrarVencidas, MINUTOS_ENTRE_CIERRES * 60_000);

  // Apagado ordenado: se deja de aceptar peticiones y se cierran las
  // conexiones a la base de datos antes de terminar el proceso.
  const apagar = async (senal: string) => {
    console.log(`\nRecibida senal ${senal}. Cerrando Chronova...`);
    clearInterval(temporizador);
    servidor.close();
    await contenedor.cerrar();
    process.exit(0);
  };

  process.on('SIGINT', () => void apagar('SIGINT'));
  process.on('SIGTERM', () => void apagar('SIGTERM'));
}

arrancar().catch((error) => {
  console.error('No se pudo arrancar Chronova:', error instanceof Error ? error.message : error);
  process.exit(1);
});
