import { ErrorDeValidacion } from './errores.js';

/**
 * Value Object Telefono.
 *
 * Acepta formatos comunes en Colombia (con o sin indicativo +57,
 * con espacios o guiones) y los guarda normalizados a solo digitos
 * con prefijo internacional opcional.
 */
export class Telefono {
  private constructor(readonly valor: string) {}

  static desde(valor: string): Telefono {
    const limpio = (valor ?? '').replace(/[\s\-().]/g, '');
    if (limpio.length === 0) {
      throw new ErrorDeValidacion('El numero de telefono es obligatorio.', 'telefono');
    }
    if (!/^\+?\d{7,15}$/.test(limpio)) {
      throw new ErrorDeValidacion(
        `"${valor}" no parece un numero de telefono valido.`,
        'telefono',
      );
    }
    return new Telefono(limpio);
  }

  /** Permite dejar el telefono vacio sin romper: devuelve null. */
  static opcional(valor: string | null | undefined): Telefono | null {
    if (valor === null || valor === undefined || valor.trim() === '') return null;
    return Telefono.desde(valor);
  }

  toString(): string {
    return this.valor;
  }

  toJSON(): string {
    return this.valor;
  }
}
