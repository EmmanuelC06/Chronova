import { Identificador } from '../shared/Identificador.js';
import { ErrorDeReglaDeNegocio } from '../shared/errores.js';

export type TipoDeCuenta = 'PACIENTE' | 'CUIDADOR';

/** Por que no se puede usar una solicitud. Sirve para decidir el mensaje. */
export type MotivoDeRechazo = 'CADUCADA' | 'YA_USADA' | 'DEMASIADOS_INTENTOS' | 'CODIGO_INCORRECTO';

export interface SolicitudDeRecuperacionPlana {
  id: string;
  usuarioId: string;
  tipoDeCuenta: TipoDeCuenta;
  codigoCifrado: string;
  creadaEn: string;
  expiraEn: string;
  intentos: number;
  usadaEn: string | null;
}

/**
 * Entidad: una peticion de recuperacion de contrasena en curso.
 *
 * Tres reglas la protegen, y las tres viven aqui y no en el servidor web
 * ni en la base de datos:
 *
 *  1. CADUCA. Treinta minutos. Un codigo que sirve para siempre es una
 *     contrasena de seis digitos escrita en un correo.
 *  2. UN SOLO USO. Al restablecer, se marca usada. Un codigo reutilizable
 *     seguiria abriendo la cuenta despues de que el dueno crea haberla
 *     recuperado.
 *  3. CINCO INTENTOS. Es lo que convierte seis digitos en algo que no se
 *     puede adivinar: sin este limite, un millon de combinaciones se
 *     agotan en minutos.
 *
 * El codigo se guarda CIFRADO, con el mismo mecanismo que las
 * contrasenas. Si alguien llegara a leer la base de datos, no obtiene
 * codigos utilizables.
 */
export class SolicitudDeRecuperacion {
  static readonly MINUTOS_DE_VIGENCIA = 30;
  static readonly MAXIMO_DE_INTENTOS = 5;

  private constructor(
    readonly id: Identificador,
    readonly usuarioId: Identificador,
    readonly tipoDeCuenta: TipoDeCuenta,
    readonly codigoCifrado: string,
    readonly creadaEn: Date,
    readonly expiraEn: Date,
    private _intentos: number,
    private _usadaEn: Date | null,
  ) {}

  static abrir(datos: {
    id: Identificador;
    usuarioId: Identificador;
    tipoDeCuenta: TipoDeCuenta;
    codigoCifrado: string;
    ahora: Date;
  }): SolicitudDeRecuperacion {
    const expira = new Date(
      datos.ahora.getTime() + SolicitudDeRecuperacion.MINUTOS_DE_VIGENCIA * 60_000,
    );

    return new SolicitudDeRecuperacion(
      datos.id,
      datos.usuarioId,
      datos.tipoDeCuenta,
      datos.codigoCifrado,
      datos.ahora,
      expira,
      0,
      null,
    );
  }

  static desdePlano(plano: SolicitudDeRecuperacionPlana): SolicitudDeRecuperacion {
    return new SolicitudDeRecuperacion(
      Identificador.desde(plano.id),
      Identificador.desde(plano.usuarioId),
      plano.tipoDeCuenta,
      plano.codigoCifrado,
      new Date(plano.creadaEn),
      new Date(plano.expiraEn),
      plano.intentos,
      plano.usadaEn ? new Date(plano.usadaEn) : null,
    );
  }

  aPlano(): SolicitudDeRecuperacionPlana {
    return {
      id: this.id.valor,
      usuarioId: this.usuarioId.valor,
      tipoDeCuenta: this.tipoDeCuenta,
      codigoCifrado: this.codigoCifrado,
      creadaEn: this.creadaEn.toISOString(),
      expiraEn: this.expiraEn.toISOString(),
      intentos: this._intentos,
      usadaEn: this._usadaEn ? this._usadaEn.toISOString() : null,
    };
  }

  get intentos(): number {
    return this._intentos;
  }
  get usadaEn(): Date | null {
    return this._usadaEn ? new Date(this._usadaEn) : null;
  }

  haCaducado(ahora: Date): boolean {
    return ahora.getTime() >= this.expiraEn.getTime();
  }

  get estaUsada(): boolean {
    return this._usadaEn !== null;
  }

  get quedanIntentos(): boolean {
    return this._intentos < SolicitudDeRecuperacion.MAXIMO_DE_INTENTOS;
  }

  /**
   * Comprueba si la solicitud puede seguir usandose, sin mirar todavia el
   * codigo. Devuelve null si esta en orden.
   */
  motivoParaRechazar(ahora: Date): MotivoDeRechazo | null {
    if (this.estaUsada) return 'YA_USADA';
    if (this.haCaducado(ahora)) return 'CADUCADA';
    if (!this.quedanIntentos) return 'DEMASIADOS_INTENTOS';
    return null;
  }

  /**
   * Anota un intento fallido.
   *
   * Se llama ANTES de saber si el codigo era correcto, para que el
   * contador suba tanto si acierta como si no. Un contador que solo
   * cuenta los fallos se puede esquivar alternando codigos.
   */
  registrarIntento(): void {
    this._intentos += 1;
  }

  /** Marca la solicitud como consumida. No se puede repetir. */
  marcarComoUsada(ahora: Date): void {
    if (this.estaUsada) {
      throw new ErrorDeReglaDeNegocio('Esta solicitud de recuperacion ya se uso.');
    }
    this._usadaEn = ahora;
  }
}
