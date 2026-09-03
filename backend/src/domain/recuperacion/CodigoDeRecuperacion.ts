import { ErrorDeValidacion } from '../shared/errores.js';

/**
 * Objeto de valor: el codigo que se envia por correo para recuperar la
 * contrasena.
 *
 * Son SEIS DIGITOS, y la eleccion tiene motivo. La alternativa habitual
 * es un enlace en el correo, pero aqui falla por dos lados: el correo
 * puede abrirse en un aparato distinto del telefono donde esta la
 * aplicacion, y los clientes de correo reescriben los enlaces con tanta
 * frecuencia que se rompen. Un codigo corto se lee en una pantalla y se
 * teclea en otra, que es exactamente lo que hara una persona mayor.
 *
 * Seis digitos son un millon de combinaciones. Por si solo seria poco,
 * pero el codigo caduca a los treinta minutos y solo admite cinco
 * intentos: la fuerza bruta no llega a ninguna parte. Esas tres piezas
 * juntas son las que dan la seguridad, no la longitud sola.
 */
export class CodigoDeRecuperacion {
  static readonly LONGITUD = 6;

  private constructor(readonly valor: string) {}

  static desde(texto: string): CodigoDeRecuperacion {
    const limpio = (texto ?? '').replace(/\s/g, '');

    if (limpio.length === 0) {
      throw new ErrorDeValidacion('Escribe el codigo que te llego al correo.', 'codigo');
    }
    if (!new RegExp(`^\\d{${CodigoDeRecuperacion.LONGITUD}}$`).test(limpio)) {
      throw new ErrorDeValidacion(
        `El codigo son ${CodigoDeRecuperacion.LONGITUD} numeros, sin letras ni espacios.`,
        'codigo',
      );
    }

    return new CodigoDeRecuperacion(limpio);
  }

  esIgualA(otro: CodigoDeRecuperacion): boolean {
    return this.valor === otro.valor;
  }
}
