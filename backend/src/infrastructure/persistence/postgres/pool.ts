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
  return new Pool({
    connectionString: entorno.urlDeBaseDeDatos,
    ssl: entorno.baseDeDatosConSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

export type Pool = pg.Pool;
