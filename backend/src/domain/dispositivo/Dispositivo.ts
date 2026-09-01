import { Identificador } from '../shared/Identificador.js';
import { ErrorDeValidacion } from '../shared/errores.js';
import { TokenDeDispositivo } from './TokenDeDispositivo.js';

export const PLATAFORMAS = ['android', 'ios', 'web'] as const;
export type Plataforma = (typeof PLATAFORMAS)[number];

export type TipoDePropietario = 'PACIENTE' | 'CUIDADOR';

export interface DispositivoPlano {
  id: string;
  propietarioId: string;
  tipoDePropietario: TipoDePropietario;
  token: string;
  plataforma: Plataforma;
  registradoEn: string;
  ultimoUsoEn: string;
}

/**
 * Entidad Dispositivo: un telefono concreto donde una persona quiere
 * recibir avisos.
 *
 * Una misma persona puede tener varios (el telefono y una tableta), y un
 * mismo telefono puede cambiar de dueno: si la hija instala la app en el
 * telefono viejo de su madre, el token es el mismo pero el propietario
 * es otro. Por eso el token es unico en el sistema y el registro lo
 * reasigna en vez de duplicarlo.
 */
export class Dispositivo {
  private constructor(
    readonly id: Identificador,
    private _propietarioId: Identificador,
    private _tipoDePropietario: TipoDePropietario,
    readonly token: TokenDeDispositivo,
    private _plataforma: Plataforma,
    readonly registradoEn: Date,
    private _ultimoUsoEn: Date,
  ) {}

  static registrar(datos: {
    id: Identificador;
    propietarioId: Identificador;
    tipoDePropietario: TipoDePropietario;
    token: TokenDeDispositivo;
    plataforma: string;
    ahora: Date;
  }): Dispositivo {
    return new Dispositivo(
      datos.id,
      datos.propietarioId,
      datos.tipoDePropietario,
      datos.token,
      Dispositivo.validarPlataforma(datos.plataforma),
      datos.ahora,
      datos.ahora,
    );
  }

  static desdePlano(plano: DispositivoPlano): Dispositivo {
    return new Dispositivo(
      Identificador.desde(plano.id),
      Identificador.desde(plano.propietarioId),
      plano.tipoDePropietario,
      TokenDeDispositivo.desde(plano.token),
      plano.plataforma,
      new Date(plano.registradoEn),
      new Date(plano.ultimoUsoEn),
    );
  }

  aPlano(): DispositivoPlano {
    return {
      id: this.id.valor,
      propietarioId: this._propietarioId.valor,
      tipoDePropietario: this._tipoDePropietario,
      token: this.token.valor,
      plataforma: this._plataforma,
      registradoEn: this.registradoEn.toISOString(),
      ultimoUsoEn: this._ultimoUsoEn.toISOString(),
    };
  }

  get propietarioId(): Identificador {
    return this._propietarioId;
  }
  get tipoDePropietario(): TipoDePropietario {
    return this._tipoDePropietario;
  }
  get plataforma(): Plataforma {
    return this._plataforma;
  }
  get ultimoUsoEn(): Date {
    return new Date(this._ultimoUsoEn);
  }

  /**
   * El telefono cambio de manos o la persona volvio a iniciar sesion.
   * Se reasigna en lugar de crear un registro nuevo, porque el token
   * sigue apuntando al mismo aparato y enviar dos veces al mismo
   * dispositivo produce avisos duplicados.
   */
  reasignarA(propietarioId: Identificador, tipo: TipoDePropietario, ahora: Date): void {
    this._propietarioId = propietarioId;
    this._tipoDePropietario = tipo;
    this._ultimoUsoEn = ahora;
  }

  marcarComoUsado(ahora: Date): void {
    this._ultimoUsoEn = ahora;
  }

  perteneceA(propietarioId: Identificador): boolean {
    return this._propietarioId.esIgualA(propietarioId);
  }

  private static validarPlataforma(plataforma: string): Plataforma {
    const limpia = (plataforma ?? '').trim().toLowerCase();
    if (!PLATAFORMAS.includes(limpia as Plataforma)) {
      throw new ErrorDeValidacion(
        `La plataforma "${plataforma}" no es valida. Usa una de: ${PLATAFORMAS.join(', ')}.`,
        'plataforma',
      );
    }
    return limpia as Plataforma;
  }
}
