/**
 * PUERTO de generacion de codigos numericos aleatorios.
 *
 * Separado del generador de identificadores porque el proposito es otro:
 * un identificador solo tiene que ser unico, y un codigo de recuperacion
 * tiene que ser IMPREDECIBLE. El adaptador real usa el generador
 * criptografico del sistema, no Math.random.
 *
 * Ser un puerto permite ademas fijarlo en las pruebas y comprobar el
 * flujo completo sin adivinar nada.
 */
export interface GeneradorDeCodigos {
  /** Un codigo de la longitud pedida, solo digitos. */
  nuevo(longitud: number): string;
}
