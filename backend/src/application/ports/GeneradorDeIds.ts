import type { Identificador } from '../../domain/shared/Identificador.js';

/**
 * PUERTO para crear identificadores.
 *
 * Igual que el reloj: en produccion genera UUID aleatorios, en pruebas
 * puede generar ids predecibles para poder afirmar resultados exactos.
 */
export interface GeneradorDeIds {
  nuevo(): Identificador;
}
