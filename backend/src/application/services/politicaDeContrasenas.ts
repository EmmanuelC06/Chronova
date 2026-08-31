import { ErrorDeValidacion } from '../../domain/shared/errores.js';

const LONGITUD_MINIMA = 8;
const LONGITUD_MAXIMA = 128;

/**
 * Politica de contrasenas.
 *
 * Vive en la capa de aplicacion (no en el dominio) porque el dominio
 * nunca maneja contrasenas en claro: solo conoce el texto ya cifrado.
 *
 * El requisito se mantiene deliberadamente sencillo. Para un publico de
 * adultos mayores, exigir simbolos raros y mayusculas produce
 * contrasenas anotadas en un papel pegado al telefono, que es peor. Se
 * prioriza longitud y se bloquean las contrasenas mas obvias.
 */
const CONTRASENAS_PROHIBIDAS = new Set([
  '12345678',
  '123456789',
  '1234567890',
  'password',
  'contrasena',
  'chronova',
  'qwertyui',
  'abcd1234',
]);

export function validarFortalezaDeContrasena(contrasena: string): void {
  const valor = contrasena ?? '';

  if (valor.length < LONGITUD_MINIMA) {
    throw new ErrorDeValidacion(
      `La contrasena debe tener al menos ${LONGITUD_MINIMA} caracteres.`,
      'contrasena',
    );
  }
  if (valor.length > LONGITUD_MAXIMA) {
    throw new ErrorDeValidacion('La contrasena es demasiado larga.', 'contrasena');
  }
  if (CONTRASENAS_PROHIBIDAS.has(valor.toLowerCase())) {
    throw new ErrorDeValidacion(
      'Esa contrasena es demasiado facil de adivinar. Elige otra.',
      'contrasena',
    );
  }
  if (/^(.)\1+$/.test(valor)) {
    throw new ErrorDeValidacion(
      'La contrasena no puede ser el mismo caracter repetido.',
      'contrasena',
    );
  }
}
