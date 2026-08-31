import { Identificador } from '../shared/Identificador.js';
import { ErrorDeReglaDeNegocio, ErrorDeValidacion } from '../shared/errores.js';
import { minutosEntre } from '../shared/fechas.js';

/**
 * Estado de una toma dentro de su ciclo de vida:
 *
 *   PENDIENTE ──confirmar()──> TOMADA
 *       │  │
 *       │  └──posponer()────> POSPUESTA ──confirmar()──> TOMADA
 *       │
 *       └──omitir()────────> OMITIDA
 */
export const ESTADOS_DE_TOMA = ['PENDIENTE', 'POSPUESTA', 'TOMADA', 'OMITIDA'] as const;
export type EstadoDeToma = (typeof ESTADOS_DE_TOMA)[number];

/** Quien registro el evento. Importa para la trazabilidad clinica. */
export const ORIGENES_DE_REGISTRO = ['PACIENTE', 'CUIDADOR', 'SISTEMA'] as const;
export type OrigenDeRegistro = (typeof ORIGENES_DE_REGISTRO)[number];

export type Puntualidad = 'A_TIEMPO' | 'CON_RETRASO' | 'ADELANTADA';

export interface TomaPlana {
  id: string;
  medicamentoId: string;
  pacienteId: string;
  programadaPara: string;
  /** Hora original de la agenda. No cambia aunque se posponga la toma. */
  programadaOriginalmentePara: string;
  estado: EstadoDeToma;
  resueltaEn: string | null;
  origenDelRegistro: OrigenDeRegistro | null;
  registradaPorId: string | null;
  observaciones: string | null;
  vecesPospuesta: number;
}

const MAXIMO_DE_APLAZAMIENTOS = 3;
const MINUTOS_MINIMOS_DE_APLAZAMIENTO = 5;
const MINUTOS_MAXIMOS_DE_APLAZAMIENTO = 180;

/**
 * Entidad Toma: un evento concreto de "a las 8:00 de hoy le toca la
 * pastilla de la tension".
 *
 * Esta es la pieza que el MVP anterior no tenia bien resuelta: guardaba
 * un log suelto sin estado ni puntualidad, y por eso no se podia calcular
 * adherencia de verdad. Aqui cada toma programada existe como registro
 * desde el momento en que se genera la agenda del dia, y va cambiando de
 * estado. Las tomas que nadie confirma quedan en evidencia.
 */
export class Toma {
  private constructor(
    readonly id: Identificador,
    readonly medicamentoId: Identificador,
    readonly pacienteId: Identificador,
    private _programadaPara: Date,
    readonly programadaOriginalmentePara: Date,
    private _estado: EstadoDeToma,
    private _resueltaEn: Date | null,
    private _origenDelRegistro: OrigenDeRegistro | null,
    private _registradaPorId: Identificador | null,
    private _observaciones: string | null,
    private _vecesPospuesta: number,
  ) {}

  // --------------------------------------------------------------
  // Construccion
  // --------------------------------------------------------------

  /** Crea una toma pendiente a partir de la agenda del medicamento. */
  static programar(datos: {
    id: Identificador;
    medicamentoId: Identificador;
    pacienteId: Identificador;
    programadaPara: Date;
  }): Toma {
    if (Number.isNaN(datos.programadaPara.getTime())) {
      throw new ErrorDeValidacion('La fecha programada de la toma no es valida.', 'programadaPara');
    }
    return new Toma(
      datos.id,
      datos.medicamentoId,
      datos.pacienteId,
      datos.programadaPara,
      datos.programadaPara,
      'PENDIENTE',
      null,
      null,
      null,
      null,
      0,
    );
  }

  static desdePlano(plano: TomaPlana): Toma {
    return new Toma(
      Identificador.desde(plano.id),
      Identificador.desde(plano.medicamentoId),
      Identificador.desde(plano.pacienteId),
      new Date(plano.programadaPara),
      new Date(plano.programadaOriginalmentePara ?? plano.programadaPara),
      plano.estado,
      plano.resueltaEn ? new Date(plano.resueltaEn) : null,
      plano.origenDelRegistro,
      plano.registradaPorId ? Identificador.desde(plano.registradaPorId) : null,
      plano.observaciones,
      plano.vecesPospuesta,
    );
  }

  aPlano(): TomaPlana {
    return {
      id: this.id.valor,
      medicamentoId: this.medicamentoId.valor,
      pacienteId: this.pacienteId.valor,
      programadaPara: this._programadaPara.toISOString(),
      programadaOriginalmentePara: this.programadaOriginalmentePara.toISOString(),
      estado: this._estado,
      resueltaEn: this._resueltaEn ? this._resueltaEn.toISOString() : null,
      origenDelRegistro: this._origenDelRegistro,
      registradaPorId: this._registradaPorId ? this._registradaPorId.valor : null,
      observaciones: this._observaciones,
      vecesPospuesta: this._vecesPospuesta,
    };
  }

  // --------------------------------------------------------------
  // Lectura
  // --------------------------------------------------------------

  get programadaPara(): Date {
    return new Date(this._programadaPara);
  }
  get estado(): EstadoDeToma {
    return this._estado;
  }
  get resueltaEn(): Date | null {
    return this._resueltaEn ? new Date(this._resueltaEn) : null;
  }
  get origenDelRegistro(): OrigenDeRegistro | null {
    return this._origenDelRegistro;
  }
  get registradaPorId(): Identificador | null {
    return this._registradaPorId;
  }
  get observaciones(): string | null {
    return this._observaciones;
  }
  get vecesPospuesta(): number {
    return this._vecesPospuesta;
  }

  get estaResuelta(): boolean {
    return this._estado === 'TOMADA' || this._estado === 'OMITIDA';
  }

  /** True si ya paso su hora y sigue sin resolverse. */
  estaVencidaEn(ahora: Date, minutosDeGracia: number): boolean {
    if (this.estaResuelta) return false;
    return ahora.getTime() > this._programadaPara.getTime() + minutosDeGracia * 60_000;
  }

  /**
   * Que tan puntual fue la toma respecto a su hora original.
   *
   * Se compara contra la hora ORIGINAL de la agenda, no contra la hora
   * corrida por los aplazamientos. De lo contrario, posponer tres veces
   * haria que toda toma apareciera como puntual y la metrica de
   * adherencia perderia todo su valor clinico.
   */
  puntualidad(ventanaDeToleranciaEnMinutos: number): Puntualidad | null {
    if (this._estado !== 'TOMADA' || !this._resueltaEn) return null;
    const diferencia = this._resueltaEn.getTime() - this.programadaOriginalmentePara.getTime();
    const toleranciaEnMs = ventanaDeToleranciaEnMinutos * 60_000;
    if (diferencia < -toleranciaEnMs) return 'ADELANTADA';
    if (diferencia > toleranciaEnMs) return 'CON_RETRASO';
    return 'A_TIEMPO';
  }

  /** Minutos de desfase entre la hora original y la confirmacion. */
  minutosDeDesfase(): number | null {
    if (!this._resueltaEn) return null;
    return Math.round(minutosEntre(this.programadaOriginalmentePara, this._resueltaEn));
  }

  // --------------------------------------------------------------
  // Transiciones de estado
  // --------------------------------------------------------------

  /** El paciente (o el cuidador en su nombre) confirma que la tomo. */
  confirmar(datos: {
    ahora: Date;
    origen: OrigenDeRegistro;
    registradaPorId?: Identificador | null;
    observaciones?: string | null;
  }): void {
    this.asegurarQueNoEstaResuelta('confirmar');
    this._estado = 'TOMADA';
    this._resueltaEn = datos.ahora;
    this._origenDelRegistro = datos.origen;
    this._registradaPorId = datos.registradaPorId ?? null;
    this._observaciones = Toma.validarObservaciones(datos.observaciones ?? null);
  }

  /** Se marca explicitamente como no tomada. */
  omitir(datos: {
    ahora: Date;
    origen: OrigenDeRegistro;
    registradaPorId?: Identificador | null;
    motivo?: string | null;
  }): void {
    this.asegurarQueNoEstaResuelta('omitir');
    this._estado = 'OMITIDA';
    this._resueltaEn = datos.ahora;
    this._origenDelRegistro = datos.origen;
    this._registradaPorId = datos.registradaPorId ?? null;
    this._observaciones = Toma.validarObservaciones(datos.motivo ?? null);
  }

  /**
   * "Ahorita la tomo": corre la hora programada.
   *
   * Se limita a 3 aplazamientos para que la funcion no se convierta en
   * una forma silenciosa de nunca tomarse el medicamento.
   */
  posponer(minutos: number, ahora: Date): void {
    this.asegurarQueNoEstaResuelta('posponer');
    if (
      !Number.isInteger(minutos) ||
      minutos < MINUTOS_MINIMOS_DE_APLAZAMIENTO ||
      minutos > MINUTOS_MAXIMOS_DE_APLAZAMIENTO
    ) {
      throw new ErrorDeValidacion(
        `El aplazamiento debe estar entre ${MINUTOS_MINIMOS_DE_APLAZAMIENTO} y ${MINUTOS_MAXIMOS_DE_APLAZAMIENTO} minutos.`,
        'minutos',
      );
    }
    if (this._vecesPospuesta >= MAXIMO_DE_APLAZAMIENTOS) {
      throw new ErrorDeReglaDeNegocio(
        `Esta toma ya se pospuso ${MAXIMO_DE_APLAZAMIENTOS} veces. Confirmala u omitela.`,
      );
    }
    const base = Math.max(ahora.getTime(), this._programadaPara.getTime());
    this._programadaPara = new Date(base + minutos * 60_000);
    this._estado = 'POSPUESTA';
    this._vecesPospuesta += 1;
  }

  /**
   * El sistema cierra automaticamente una toma que quedo sin respuesta.
   * Se distingue de una omision manual por el origen SISTEMA.
   */
  cerrarPorFaltaDeRespuesta(ahora: Date): void {
    if (this.estaResuelta) return;
    this._estado = 'OMITIDA';
    this._resueltaEn = ahora;
    this._origenDelRegistro = 'SISTEMA';
    this._observaciones = 'Cerrada automaticamente: no hubo confirmacion.';
  }

  perteneceA(pacienteId: Identificador): boolean {
    return this.pacienteId.esIgualA(pacienteId);
  }

  // --------------------------------------------------------------
  // Internos
  // --------------------------------------------------------------

  private asegurarQueNoEstaResuelta(accion: string): void {
    if (this.estaResuelta) {
      throw new ErrorDeReglaDeNegocio(
        `No se puede ${accion} una toma que ya fue registrada como ${this._estado.toLowerCase()}.`,
      );
    }
  }

  private static validarObservaciones(texto: string | null): string | null {
    if (texto === null) return null;
    const limpio = texto.trim();
    if (limpio.length === 0) return null;
    if (limpio.length > 300) {
      throw new ErrorDeValidacion('La observacion es demasiado larga.', 'observaciones');
    }
    return limpio;
  }
}
