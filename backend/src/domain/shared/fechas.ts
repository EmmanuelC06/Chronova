/**
 * Utilidades de fecha del dominio.
 *
 * Se mantienen aqui, sin librerias externas, para que el nucleo del
 * negocio no dependa de nada de afuera (esa es la regla de oro de la
 * arquitectura hexagonal).
 */

/** Devuelve una copia de la fecha con la hora puesta en 00:00:00.000. */
export function aMedianoche(fecha: Date): Date {
  const copia = new Date(fecha);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

/** Dias calendario completos entre dos fechas (ignora la hora). */
export function diasEntre(desde: Date, hasta: Date): number {
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  return Math.round((aMedianoche(hasta).getTime() - aMedianoche(desde).getTime()) / MS_POR_DIA);
}

/** True si ambas fechas caen en el mismo dia calendario. */
export function esElMismoDia(a: Date, b: Date): boolean {
  return aMedianoche(a).getTime() === aMedianoche(b).getTime();
}

/** Suma (o resta, con numeros negativos) dias a una fecha. */
export function sumarDias(fecha: Date, dias: number): Date {
  const copia = new Date(fecha);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

/** Diferencia absoluta en minutos entre dos instantes. */
export function minutosEntre(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / 60000;
}
