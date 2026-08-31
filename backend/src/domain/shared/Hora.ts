import { ErrorDeValidacion } from './errores.js';

/**
 * Value Object Hora del dia (formato 24h, "HH:mm").
 *
 * No es un instante en el tiempo: es "las 8 de la manana", que se repite
 * todos los dias. Por eso no usamos Date, que siempre arrastra una fecha.
 */
export class Hora {
  private constructor(
    readonly horas: number,
    readonly minutos: number,
  ) {}

  static desde(texto: string): Hora {
    const limpio = (texto ?? '').trim();
    const coincidencia = /^(\d{1,2}):(\d{2})$/.exec(limpio);
    if (!coincidencia) {
      throw new ErrorDeValidacion(
        `La hora "${texto}" debe tener el formato HH:mm, por ejemplo 08:30.`,
        'hora',
      );
    }
    const horas = Number(coincidencia[1]);
    const minutos = Number(coincidencia[2]);
    if (horas > 23) {
      throw new ErrorDeValidacion(`La hora "${texto}" no existe: las horas van de 00 a 23.`, 'hora');
    }
    if (minutos > 59) {
      throw new ErrorDeValidacion(
        `La hora "${texto}" no existe: los minutos van de 00 a 59.`,
        'hora',
      );
    }
    return new Hora(horas, minutos);
  }

  /** Minutos transcurridos desde la medianoche. Util para ordenar. */
  get minutosDesdeMedianoche(): number {
    return this.horas * 60 + this.minutos;
  }

  /**
   * Combina esta hora con una fecha concreta para obtener un instante.
   * Se usa al generar la agenda de tomas de un dia.
   */
  enLaFecha(fecha: Date): Date {
    const resultado = new Date(fecha);
    resultado.setHours(this.horas, this.minutos, 0, 0);
    return resultado;
  }

  esIgualA(otra: Hora | null | undefined): boolean {
    return (
      otra instanceof Hora && otra.horas === this.horas && otra.minutos === this.minutos
    );
  }

  toString(): string {
    return `${String(this.horas).padStart(2, '0')}:${String(this.minutos).padStart(2, '0')}`;
  }

  toJSON(): string {
    return this.toString();
  }
}
