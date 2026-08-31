import { ErrorDeValidacion } from '../shared/errores.js';

/** Unidades de medida aceptadas para una dosis. */
export const UNIDADES_DE_DOSIS = [
  'mg',
  'g',
  'ml',
  'tableta',
  'capsula',
  'gota',
  'inyeccion',
  'sobre',
  'puff',
  'unidad',
] as const;

export type UnidadDeDosis = (typeof UNIDADES_DE_DOSIS)[number];

/**
 * Value Object Dosis: "1 tableta", "500 mg", "10 gotas".
 *
 * En el MVP anterior la dosis era un texto libre ("1 pastilla mañana"),
 * lo que impedia calcular el consumo de stock. Al separarla en cantidad
 * y unidad, el sistema puede descontar inventario automaticamente.
 */
export class Dosis {
  private constructor(
    readonly cantidad: number,
    readonly unidad: UnidadDeDosis,
  ) {}

  static desde(cantidad: number, unidad: string): Dosis {
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new ErrorDeValidacion('La cantidad de la dosis debe ser mayor que cero.', 'dosis');
    }
    if (cantidad > 10_000) {
      throw new ErrorDeValidacion('La cantidad de la dosis parece excesiva.', 'dosis');
    }
    const unidadNormalizada = (unidad ?? '').trim().toLowerCase();
    if (!UNIDADES_DE_DOSIS.includes(unidadNormalizada as UnidadDeDosis)) {
      throw new ErrorDeValidacion(
        `La unidad "${unidad}" no es valida. Usa una de: ${UNIDADES_DE_DOSIS.join(', ')}.`,
        'dosis',
      );
    }
    return new Dosis(cantidad, unidadNormalizada as UnidadDeDosis);
  }

  /** Texto legible para mostrar en pantalla: "2 tabletas", "500 mg". */
  get descripcion(): string {
    const esContable = ['tableta', 'capsula', 'gota', 'inyeccion', 'sobre', 'puff', 'unidad'];
    if (esContable.includes(this.unidad) && this.cantidad !== 1) {
      const plural = this.unidad === 'capsula' ? 'capsulas' : `${this.unidad}s`;
      return `${this.cantidad} ${plural}`;
    }
    return `${this.cantidad} ${this.unidad}`;
  }

  /**
   * Cuantas unidades de inventario consume una toma.
   *
   * Si la dosis son "2 tabletas", del frasco salen 2 tabletas. Si son
   * "500 mg" o "5 ml", el paciente no cuenta miligramos: cuenta frascos
   * o sobres, asi que descontamos una unidad por toma.
   */
  get unidadesConsumidasPorToma(): number {
    const contables: UnidadDeDosis[] = [
      'tableta',
      'capsula',
      'sobre',
      'inyeccion',
      'unidad',
      'puff',
      'gota',
    ];
    return contables.includes(this.unidad) ? Math.ceil(this.cantidad) : 1;
  }

  esIgualA(otra: Dosis | null | undefined): boolean {
    return (
      otra instanceof Dosis && otra.cantidad === this.cantidad && otra.unidad === this.unidad
    );
  }

  toJSON() {
    return { cantidad: this.cantidad, unidad: this.unidad, descripcion: this.descripcion };
  }
}
