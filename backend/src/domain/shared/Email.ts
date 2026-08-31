import { ErrorDeValidacion } from './errores.js';

const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Value Object Email.
 *
 * Normaliza a minusculas para que "Juan@Mail.com" y "juan@mail.com"
 * sean la misma cuenta, y valida el formato una sola vez, en el borde
 * del dominio. A partir de aqui, si tienes un Email, es valido.
 */
export class Email {
  private constructor(readonly valor: string) {}

  static desde(valor: string): Email {
    const limpio = (valor ?? '').trim().toLowerCase();
    if (limpio.length === 0) {
      throw new ErrorDeValidacion('El correo electronico es obligatorio.', 'email');
    }
    if (limpio.length > 254) {
      throw new ErrorDeValidacion('El correo electronico es demasiado largo.', 'email');
    }
    if (!PATRON_EMAIL.test(limpio)) {
      throw new ErrorDeValidacion(
        `"${valor}" no parece un correo electronico valido.`,
        'email',
      );
    }
    return new Email(limpio);
  }

  esIgualA(otro: Email | null | undefined): boolean {
    return otro instanceof Email && otro.valor === this.valor;
  }

  toString(): string {
    return this.valor;
  }

  toJSON(): string {
    return this.valor;
  }
}
