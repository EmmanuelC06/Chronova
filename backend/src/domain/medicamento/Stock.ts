import { ErrorDeReglaDeNegocio, ErrorDeValidacion } from '../shared/errores.js';

/**
 * Value Object Stock: cuantas unidades del medicamento le quedan al
 * paciente y a partir de cuantas hay que avisarle que vaya a la farmacia.
 *
 * Es inmutable: descontar o reabastecer devuelven un Stock nuevo. Asi
 * nunca se modifica "por debajo" un valor que otro objeto esta usando.
 */
export class Stock {
  private constructor(
    readonly unidadesDisponibles: number,
    readonly umbralDeAlerta: number,
  ) {}

  static desde(unidadesDisponibles: number, umbralDeAlerta: number): Stock {
    if (!Number.isInteger(unidadesDisponibles) || unidadesDisponibles < 0) {
      throw new ErrorDeValidacion(
        'Las unidades disponibles deben ser un numero entero mayor o igual a cero.',
        'stock',
      );
    }
    if (!Number.isInteger(umbralDeAlerta) || umbralDeAlerta < 0) {
      throw new ErrorDeValidacion(
        'El umbral de alerta debe ser un numero entero mayor o igual a cero.',
        'stock',
      );
    }
    return new Stock(unidadesDisponibles, umbralDeAlerta);
  }

  /** Stock sin control de inventario: el paciente no lleva la cuenta. */
  static sinControl(): Stock {
    return new Stock(0, 0);
  }

  get estaAgotado(): boolean {
    return this.unidadesDisponibles === 0;
  }

  /** True cuando conviene avisar al paciente o al cuidador. */
  get necesitaReabastecimiento(): boolean {
    return this.umbralDeAlerta > 0 && this.unidadesDisponibles <= this.umbralDeAlerta;
  }

  descontar(unidades: number): Stock {
    if (!Number.isFinite(unidades) || unidades <= 0) {
      throw new ErrorDeValidacion('Las unidades a descontar deben ser mayores que cero.', 'stock');
    }
    // Nunca bajamos de cero: el inventario es una ayuda, no debe bloquear
    // el registro de una toma que el paciente si realizo.
    const restante = Math.max(0, this.unidadesDisponibles - Math.ceil(unidades));
    return new Stock(restante, this.umbralDeAlerta);
  }

  reabastecer(unidades: number): Stock {
    if (!Number.isInteger(unidades) || unidades <= 0) {
      throw new ErrorDeValidacion(
        'Las unidades a reabastecer deben ser un numero entero mayor que cero.',
        'stock',
      );
    }
    const total = this.unidadesDisponibles + unidades;
    if (total > 100_000) {
      throw new ErrorDeReglaDeNegocio('El inventario supera el maximo permitido.');
    }
    return new Stock(total, this.umbralDeAlerta);
  }

  conUmbral(nuevoUmbral: number): Stock {
    return Stock.desde(this.unidadesDisponibles, nuevoUmbral);
  }

  toJSON() {
    return {
      unidadesDisponibles: this.unidadesDisponibles,
      umbralDeAlerta: this.umbralDeAlerta,
      necesitaReabastecimiento: this.necesitaReabastecimiento,
      estaAgotado: this.estaAgotado,
    };
  }
}
