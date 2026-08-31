import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { cargarEntorno } from '../../../config/entorno.js';
import { crearPool } from './pool.js';

/**
 * Crea las tablas si no existen.
 *
 * Se ejecuta con:  npm run db:migrate
 */
async function migrar(): Promise<void> {
  const entorno = cargarEntorno();

  if (entorno.persistencia !== 'postgres') {
    console.log(
      'PERSISTENCE no es "postgres": no hay nada que migrar.\n' +
        'Cambia PERSISTENCE=postgres en tu archivo .env si quieres usar base de datos real.',
    );
    return;
  }

  const rutaDelEsquema = fileURLToPath(new URL('./esquema.sql', import.meta.url));
  const sql = await readFile(rutaDelEsquema, 'utf8');

  const pool = crearPool(entorno);
  try {
    await pool.query(sql);
    console.log('Tablas de Chronova creadas o ya existentes. Todo listo.');
  } finally {
    await pool.end();
  }
}

migrar().catch((error) => {
  console.error('No se pudo migrar la base de datos:', error instanceof Error ? error.message : error);
  process.exit(1);
});
