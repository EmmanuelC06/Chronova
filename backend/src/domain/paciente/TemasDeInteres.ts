import { ErrorDeValidacion } from '../shared/errores.js';

/**
 * Los temas que una persona puede marcar como de su interes.
 *
 * El servidor guarda CLAVES, no textos. Los titulos y los contenidos
 * viven en la aplicacion, y es a proposito: si manana se reescribe el
 * texto de "El sueño" no hay que migrar ninguna fila, y una version
 * vieja de la app que no conozca una clave nueva simplemente no la
 * dibuja, en vez de enseñar una cadena rara.
 *
 * La lista es CERRADA. No es texto libre, y no debe serlo nunca: un
 * campo abierto aqui seria un sitio donde la gente escribiria el nombre
 * de su enfermedad, y eso convertiria una preferencia de lectura en un
 * dato de salud guardado sin que nadie lo decidiera.
 */
export const TEMAS_DISPONIBLES = [
  'MEMORIA',
  'CITA',
  'SUENO',
  'ALIMENTACION',
  'MOVIMIENTO',
  'ANIMO',
] as const;

export type Tema = (typeof TEMAS_DISPONIBLES)[number];

/**
 * Cuantos se pueden marcar a la vez.
 *
 * El tope no es tecnico. Marcarlos todos equivale a no elegir nada, y
 * ademas el reporte tiene que caber en una linea legible: "le interesan
 * el sueño, la alimentacion, moverse, el animo, la memoria y la cita"
 * no le dice nada a quien lo lee. Cuatro obliga a elegir, que es lo que
 * hace util el dato.
 */
export const MAXIMO_DE_TEMAS = 4;

/**
 * Value Object: los temas que marco un paciente.
 *
 * Que no haya ninguno es un estado valido y es el de salida. No se
 * eligen temas por defecto: suponer que a alguien le interesa el sueño
 * porque tiene setenta años es exactamente la clase de suposicion que
 * esta funcion existe para evitar.
 */
export class TemasDeInteres {
  private constructor(readonly lista: readonly Tema[]) {}

  static ninguno(): TemasDeInteres {
    return new TemasDeInteres([]);
  }

  static desde(claves: readonly unknown[]): TemasDeInteres {
    if (!Array.isArray(claves)) {
      throw new ErrorDeValidacion('Los temas de interés deben venir en una lista.', 'temasDeInteres');
    }

    const limpias: Tema[] = [];
    for (const clave of claves) {
      if (typeof clave !== 'string') {
        throw new ErrorDeValidacion('Cada tema de interés debe ser un texto.', 'temasDeInteres');
      }
      const normalizada = clave.trim().toUpperCase();
      if (!TEMAS_DISPONIBLES.includes(normalizada as Tema)) {
        throw new ErrorDeValidacion(
          `"${clave}" no es un tema de los que ofrece la aplicación.`,
          'temasDeInteres',
        );
      }
      // Repetir un tema no es un error del usuario, es ruido de la red
      // o un doble toque. Se ignora en vez de rechazar la peticion.
      if (!limpias.includes(normalizada as Tema)) limpias.push(normalizada as Tema);
    }

    if (limpias.length > MAXIMO_DE_TEMAS) {
      throw new ErrorDeValidacion(
        `Se pueden elegir como máximo ${MAXIMO_DE_TEMAS} temas.`,
        'temasDeInteres',
      );
    }

    /*
      Se guardan en el ORDEN DEL CATALOGO y no en el de llegada.

      Asi la frase del reporte sale siempre igual para la misma eleccion,
      y dos reportes del mismo mes no se diferencian solo en que una vez
      se toco antes el sueño que la cita. Un documento que cambia sin que
      haya cambiado nada hace dudar de todo lo demas que dice.
    */
    return new TemasDeInteres(
      TEMAS_DISPONIBLES.filter((tema) => limpias.includes(tema)),
    );
  }

  /** Para leer lo guardado, tolerando filas antiguas o corruptas. */
  static desdePlano(valor: unknown): TemasDeInteres {
    if (!Array.isArray(valor)) return TemasDeInteres.ninguno();
    try {
      return TemasDeInteres.desde(valor);
    } catch {
      /*
        Una fila ilegible no debe impedir iniciar sesion.

        Esto es una preferencia de lectura: si se corrompio, lo peor que
        pasa es que la persona vuelva a marcar sus temas. Dejar que
        reviente aqui bloquearia el perfil entero, y con el la agenda y
        los recordatorios, por culpa de la parte menos importante del
        sistema.
      */
      return TemasDeInteres.ninguno();
    }
  }

  get estanVacios(): boolean {
    return this.lista.length === 0;
  }

  toJSON(): Tema[] {
    return [...this.lista];
  }
}
