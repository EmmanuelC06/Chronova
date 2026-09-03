/**
 * Pequenas ayudas para presentar texto.
 *
 * Viven aparte porque estaban repetidas: `primerNombre` existia como
 * funcion local en la pantalla de perfil del paciente y otra vez, escrita
 * distinto (`nombre.split(' ')[0]!`), dentro del contexto del cuidador.
 * Dos copias de la misma idea que no fallaban igual: una devolvia el
 * nombre completo si venia vacio y la otra reventaba.
 */

/**
 * El nombre de pila, para hablarle a alguien en vez de citarlo.
 *
 * "Rosa Elena Valencia Ospina" es como se escribe en un documento;
 * "Rosa" es como se le habla. En una app para adultos mayores la
 * diferencia importa: los mensajes se leen como los diria una persona.
 */
export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] || nombre;
}
