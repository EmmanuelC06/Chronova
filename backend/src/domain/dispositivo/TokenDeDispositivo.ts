import { ErrorDeValidacion } from '../shared/errores.js';

/**
 * Value Object del token de notificaciones de un dispositivo.
 *
 * Expo entrega una cadena con la forma ExponentPushToken[...] que
 * identifica de forma unica a una instalacion de la app en un telefono
 * concreto. No identifica a la persona: si desinstala y reinstala, o si
 * cambia de telefono, el token cambia.
 *
 * Se valida el formato aqui para que un token corrupto no llegue nunca
 * al servicio de envio. Expo cobra los envios fallidos igual que los
 * buenos, y un token mal formado ensucia los informes de entrega.
 */
const PATRON = /^Expo(nent)?PushToken\[[A-Za-z0-9._-]{1,64}\]$/;

export class TokenDeDispositivo {
  private constructor(readonly valor: string) {}

  static desde(valor: string): TokenDeDispositivo {
    const limpio = (valor ?? '').trim();
    if (limpio.length === 0) {
      throw new ErrorDeValidacion('El token del dispositivo es obligatorio.', 'token');
    }
    if (!PATRON.test(limpio)) {
      throw new ErrorDeValidacion(
        'El token del dispositivo no tiene el formato que entrega Expo.',
        'token',
      );
    }
    return new TokenDeDispositivo(limpio);
  }

  esIgualA(otro: TokenDeDispositivo | null | undefined): boolean {
    return otro instanceof TokenDeDispositivo && otro.valor === this.valor;
  }

  toString(): string {
    return this.valor;
  }

  toJSON(): string {
    return this.valor;
  }
}
