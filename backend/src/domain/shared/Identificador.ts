import { ErrorDeValidacion } from './errores.js';

/**
 * Value Object que representa el identificador de cualquier entidad.
 *
 * Un "value object" es un objeto que vale por su contenido, no por su
 * identidad: dos identificadores con el mismo texto son el mismo.
 * Encapsularlo evita el clasico bug de pasar el id del paciente donde
 * iba el id del medicamento, porque el tipo lo hace explicito.
 */
const PATRON_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-9a-f][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class Identificador {
  private constructor(readonly valor: string) {}

  static desde(valor: string): Identificador {
    const limpio = valor?.trim() ?? '';
    if (limpio.length === 0) {
      throw new ErrorDeValidacion('El identificador no puede estar vacio.', 'id');
    }
    if (!PATRON_UUID.test(limpio)) {
      throw new ErrorDeValidacion(
        `El identificador "${limpio}" no tiene un formato valido.`,
        'id',
      );
    }
    return new Identificador(limpio.toLowerCase());
  }

  esIgualA(otro: Identificador | null | undefined): boolean {
    return otro instanceof Identificador && otro.valor === this.valor;
  }

  toString(): string {
    return this.valor;
  }

  toJSON(): string {
    return this.valor;
  }
}
