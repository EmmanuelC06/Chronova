import { ErrorDeValidacion } from '../shared/errores.js';
import { diasEntre } from '../shared/fechas.js';

export type TipoDeFrecuencia = 'DIARIA' | 'DIAS_DE_LA_SEMANA' | 'CADA_N_DIAS';

/** 0 = domingo ... 6 = sabado (igual que Date.getDay()). */
export const NOMBRES_DE_DIAS = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
] as const;

/**
 * Value Object Frecuencia: cada cuanto se toma un medicamento.
 *
 * Concentrar aqui la pregunta "¿toca hoy?" evita repetir ese calculo
 * en la app movil, en el backend y en los reportes del cuidador.
 */
export class Frecuencia {
  private constructor(
    readonly tipo: TipoDeFrecuencia,
    /** Solo para DIAS_DE_LA_SEMANA. */
    readonly diasDeLaSemana: readonly number[],
    /** Solo para CADA_N_DIAS. */
    readonly intervaloEnDias: number,
  ) {}

  /** Todos los dias. Es el caso mas comun en tratamientos cronicos. */
  static diaria(): Frecuencia {
    return new Frecuencia('DIARIA', [], 1);
  }

  /** Solo ciertos dias, por ejemplo lunes, miercoles y viernes. */
  static diasDeLaSemana(dias: readonly number[]): Frecuencia {
    const unicos = [...new Set(dias)].sort((a, b) => a - b);
    if (unicos.length === 0) {
      throw new ErrorDeValidacion('Debes seleccionar al menos un dia de la semana.', 'frecuencia');
    }
    for (const dia of unicos) {
      if (!Number.isInteger(dia) || dia < 0 || dia > 6) {
        throw new ErrorDeValidacion(
          'Los dias de la semana deben ser numeros entre 0 (domingo) y 6 (sabado).',
          'frecuencia',
        );
      }
    }
    return new Frecuencia('DIAS_DE_LA_SEMANA', unicos, 1);
  }

  /** Cada N dias contados desde el inicio del tratamiento. */
  static cadaNDias(intervalo: number): Frecuencia {
    if (!Number.isInteger(intervalo) || intervalo < 1 || intervalo > 90) {
      throw new ErrorDeValidacion(
        'El intervalo debe ser un numero entero entre 1 y 90 dias.',
        'frecuencia',
      );
    }
    if (intervalo === 1) return Frecuencia.diaria();
    return new Frecuencia('CADA_N_DIAS', [], intervalo);
  }

  /**
   * Regla central: ¿este medicamento se toma en esta fecha?
   * @param fecha        Dia que se esta consultando.
   * @param fechaInicio  Dia en que arranco el tratamiento.
   */
  aplicaEn(fecha: Date, fechaInicio: Date): boolean {
    if (diasEntre(fechaInicio, fecha) < 0) return false; // aun no empieza

    switch (this.tipo) {
      case 'DIARIA':
        return true;
      case 'DIAS_DE_LA_SEMANA':
        return this.diasDeLaSemana.includes(fecha.getDay());
      case 'CADA_N_DIAS':
        return diasEntre(fechaInicio, fecha) % this.intervaloEnDias === 0;
    }
  }

  get descripcion(): string {
    switch (this.tipo) {
      case 'DIARIA':
        return 'Todos los dias';
      case 'DIAS_DE_LA_SEMANA':
        return `Los ${this.diasDeLaSemana.map((d) => NOMBRES_DE_DIAS[d]).join(', ')}`;
      case 'CADA_N_DIAS':
        return `Cada ${this.intervaloEnDias} dias`;
    }
  }

  toJSON() {
    return {
      tipo: this.tipo,
      diasDeLaSemana: [...this.diasDeLaSemana],
      intervaloEnDias: this.intervaloEnDias,
      descripcion: this.descripcion,
    };
  }
}
