import pg from 'pg';
import type { Entorno } from '../../../config/entorno.js';

const { Pool } = pg;

/**
 * Pool de conexiones a PostgreSQL.
 *
 * Un pool reutiliza conexiones abiertas en lugar de crear una nueva por
 * cada consulta, que es lento y termina agotando los recursos de la base
 * de datos. Es el mismo objeto para toda la aplicacion.
 */
export function crearPool(entorno: Entorno): pg.Pool {
  const pool = new Pool({
    connectionString: entorno.urlDeBaseDeDatos,
    ssl: entorno.baseDeDatosConSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    /*
      Mantiene viva la conexion a nivel de TCP.

      Sin esto, una conexion que pasa un rato sin trafico la puede cortar
      cualquiera que este en medio sin avisar a nadie: el enrutador de
      casa, el NAT del operador, o el propio PgBouncer de Neon. El
      resultado es una conexion que parece buena hasta que se usa y
      entonces falla. Los 10 segundos iniciales son un margen para no
      empezar a insistir antes de que la conexion se asiente.
    */
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });

  /**
   * Sin este oyente, el servidor entero se cae.
   *
   * Cuando PostgreSQL cierra una conexion que estaba ociosa —un reinicio
   * de mantenimiento, un failover del proveedor, un cortafuegos que corta
   * las conexiones inactivas— la libreria emite un evento 'error' en el
   * pool. En Node, un EventEmitter que emite 'error' sin nadie
   * escuchando TERMINA EL PROCESO.
   *
   * El pool sabe reponer la conexion por su cuenta; lo unico que hacia
   * falta era no morirse mientras tanto. Para una aplicacion de
   * recordatorios de medicacion, un reinicio rutinario de la base de
   * datos no puede ser un apagon.
   */
  pool.on('error', (error) => {
    console.error(
      '[pg] Error en una conexión ociosa (el pool la repondrá):',
      error instanceof Error ? error.message : error,
    );
  });

  return pool;
}

export type Pool = pg.Pool;
