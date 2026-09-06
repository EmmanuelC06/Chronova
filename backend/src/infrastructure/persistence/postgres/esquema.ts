import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type pg from 'pg';

/**
 * Aplica esquema.sql sobre la base de datos.
 *
 * El archivo esta escrito entero con CREATE TABLE IF NOT EXISTS,
 * CREATE INDEX IF NOT EXISTS y ALTER TABLE ... ADD COLUMN IF NOT EXISTS,
 * de modo que ejecutarlo cien veces seguidas deja el mismo resultado que
 * ejecutarlo una. Eso es lo que permite lanzarlo en cada arranque sin
 * llevar la cuenta de que migraciones se han corrido ya.
 *
 * Por que en el arranque y no a mano:
 *
 * Costo un defecto real encontrarlo. Se agregaron dos columnas al
 * esquema —la constancia de la autorizacion de datos— y la base de datos
 * en la nube se quedo sin ellas, porque aplicar el cambio dependia de
 * que alguien se acordara de escribir "npm run db:migrate". El servidor
 * arranco tan campante, /api/salud respondio "ok", y todo lo que solo
 * LEE siguio funcionando. El fallo salio por el sitio mas alejado de la
 * causa: una persona mayor tocando "Muy grande" en su telefono y viendo
 * que la letra no cambiaba.
 *
 * Un servidor que no puede escribir en su base de datos no esta "ok". O
 * el esquema esta al dia antes de aceptar la primera peticion, o el
 * proceso no arranca y el fallo se ve donde se puede arreglar.
 *
 * Esto vale mas todavia en el despliegue: en un servicio en la nube no
 * hay una terminal a mano donde correr comandos sueltos entre despliegue
 * y despliegue.
 */
export async function aplicarEsquema(pool: pg.Pool): Promise<void> {
  const ruta = fileURLToPath(new URL('./esquema.sql', import.meta.url));
  const sql = await readFile(ruta, 'utf8');
  await pool.query(sql);
}
