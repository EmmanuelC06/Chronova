import { Identificador } from '../shared/Identificador.js';
import { ErrorDeReglaDeNegocio, ErrorDeValidacion } from '../shared/errores.js';

export const ESTADOS_DE_VINCULO = ['PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'REVOCADO'] as const;
export type EstadoDeVinculo = (typeof ESTADOS_DE_VINCULO)[number];

export interface PermisosDelCuidador {
  /** Ver medicamentos, agenda e historial del paciente. */
  puedeVerHistorial: boolean;
  /** Confirmar u omitir tomas en nombre del paciente. */
  puedeRegistrarTomas: boolean;
  /** Crear, editar o suspender medicamentos del paciente. */
  puedeGestionarMedicamentos: boolean;
  /** Recibir avisos cuando la adherencia baja o se pierde una toma. */
  recibeAlertas: boolean;
}

export interface VinculoPlano {
  id: string;
  cuidadorId: string;
  pacienteId: string;
  estado: EstadoDeVinculo;
  parentesco: string | null;
  permisos: PermisosDelCuidador;
  solicitadoPor: 'PACIENTE' | 'CUIDADOR';
  creadoEn: string;
  resueltoEn: string | null;
}

/**
 * Entidad Vinculo: la relacion consentida entre un cuidador y un paciente.
 *
 * Es la pieza que faltaba en el MVP anterior, donde un cuidador podia
 * agregarse pacientes sin ninguna aprobacion. Aqui el acceso a datos de
 * salud ajenos exige que el paciente acepte, y el paciente puede revocar
 * el vinculo cuando quiera. Ademas los permisos son granulares: un hijo
 * puede querer ver el historial pero no editar el tratamiento que
 * formulo el medico.
 */
export class Vinculo {
  private constructor(
    readonly id: Identificador,
    readonly cuidadorId: Identificador,
    readonly pacienteId: Identificador,
    private _estado: EstadoDeVinculo,
    private _parentesco: string | null,
    private _permisos: PermisosDelCuidador,
    // Deja de ser readonly porque un vinculo revocado se puede volver a
    // pedir, y quien lo pide la segunda vez decide si nace aceptado o
    // pendiente. Ver volverASolicitar().
    private _solicitadoPor: 'PACIENTE' | 'CUIDADOR',
    readonly creadoEn: Date,
    private _resueltoEn: Date | null,
  ) {}

  /** Permisos conservadores: ver y recibir alertas, nada mas. */
  static permisosPorDefecto(): PermisosDelCuidador {
    return {
      puedeVerHistorial: true,
      puedeRegistrarTomas: false,
      puedeGestionarMedicamentos: false,
      recibeAlertas: true,
    };
  }

  static solicitar(datos: {
    id: Identificador;
    cuidadorId: Identificador;
    pacienteId: Identificador;
    solicitadoPor: 'PACIENTE' | 'CUIDADOR';
    parentesco?: string | null;
    permisos?: Partial<PermisosDelCuidador>;
    ahora: Date;
  }): Vinculo {
    const permisos = { ...Vinculo.permisosPorDefecto(), ...(datos.permisos ?? {}) };

    // Si el propio paciente invita a su cuidador, el consentimiento ya
    // esta dado: el vinculo nace aceptado.
    const estado: EstadoDeVinculo = datos.solicitadoPor === 'PACIENTE' ? 'ACEPTADO' : 'PENDIENTE';

    return new Vinculo(
      datos.id,
      datos.cuidadorId,
      datos.pacienteId,
      estado,
      Vinculo.validarParentesco(datos.parentesco ?? null),
      permisos,
      datos.solicitadoPor,
      datos.ahora,
      estado === 'ACEPTADO' ? datos.ahora : null,
    );
  }

  static desdePlano(plano: VinculoPlano): Vinculo {
    return new Vinculo(
      Identificador.desde(plano.id),
      Identificador.desde(plano.cuidadorId),
      Identificador.desde(plano.pacienteId),
      plano.estado,
      plano.parentesco,
      plano.permisos,
      plano.solicitadoPor,
      new Date(plano.creadoEn),
      plano.resueltoEn ? new Date(plano.resueltoEn) : null,
    );
  }

  aPlano(): VinculoPlano {
    return {
      id: this.id.valor,
      cuidadorId: this.cuidadorId.valor,
      pacienteId: this.pacienteId.valor,
      estado: this._estado,
      parentesco: this._parentesco,
      permisos: { ...this._permisos },
      solicitadoPor: this.solicitadoPor,
      creadoEn: this.creadoEn.toISOString(),
      resueltoEn: this._resueltoEn ? this._resueltoEn.toISOString() : null,
    };
  }

  get estado(): EstadoDeVinculo {
    return this._estado;
  }
  get parentesco(): string | null {
    return this._parentesco;
  }
  get permisos(): PermisosDelCuidador {
    return { ...this._permisos };
  }
  get resueltoEn(): Date | null {
    return this._resueltoEn ? new Date(this._resueltoEn) : null;
  }
  get solicitadoPor(): 'PACIENTE' | 'CUIDADOR' {
    return this._solicitadoPor;
  }

  get estaActivo(): boolean {
    return this._estado === 'ACEPTADO';
  }

  // --------------------------------------------------------------

  /** El paciente aprueba la solicitud del cuidador. */
  aceptar(ahora: Date): void {
    if (this._estado === 'ACEPTADO') return;
    if (this._estado !== 'PENDIENTE') {
      throw new ErrorDeReglaDeNegocio(
        'Solo se puede aceptar un vinculo que este pendiente. Pide al cuidador que envie una nueva solicitud.',
      );
    }
    this._estado = 'ACEPTADO';
    this._resueltoEn = ahora;
  }

  rechazar(ahora: Date): void {
    if (this._estado !== 'PENDIENTE') {
      throw new ErrorDeReglaDeNegocio('Solo se puede rechazar un vinculo que este pendiente.');
    }
    this._estado = 'RECHAZADO';
    this._resueltoEn = ahora;
  }

  /** El paciente retira el acceso. Es un derecho suyo, siempre disponible. */
  revocar(ahora: Date): void {
    if (this._estado === 'REVOCADO') return;
    this._estado = 'REVOCADO';
    this._resueltoEn = ahora;
  }

  /**
   * Se vuelve a pedir un vinculo que estaba RECHAZADO o REVOCADO.
   *
   * Es la misma relacion entre las mismas dos personas, asi que se
   * reutiliza esta entidad en lugar de crear otra. Crear una segunda
   * dejaba dos filas para el mismo par y las consultas devolvian la
   * vieja, de modo que el paciente no podia volver a dar acceso nunca.
   *
   * LOS PERMISOS VUELVEN AL MINIMO. El consentimiento anterior se
   * retiro; lo que se conceda ahora es una decision nueva, no la
   * resurreccion de la de antes. Que un cuidador recuperase por sorpresa
   * el permiso de editar el tratamiento seria justo lo contrario de lo
   * que significa revocar.
   */
  volverASolicitar(datos: {
    solicitadoPor: 'PACIENTE' | 'CUIDADOR';
    parentesco?: string | null;
    permisos?: Partial<PermisosDelCuidador>;
    ahora: Date;
  }): void {
    if (this._estado === 'PENDIENTE' || this._estado === 'ACEPTADO') {
      throw new ErrorDeReglaDeNegocio('Este vinculo sigue vigente: no hay nada que volver a pedir.');
    }

    this._permisos = { ...Vinculo.permisosPorDefecto(), ...(datos.permisos ?? {}) };
    this._solicitadoPor = datos.solicitadoPor;

    if (datos.parentesco !== undefined) {
      this._parentesco = Vinculo.validarParentesco(datos.parentesco);
    }

    // Misma regla que en solicitar(): si invita el dueno de los datos, el
    // consentimiento ya esta dado.
    this._estado = datos.solicitadoPor === 'PACIENTE' ? 'ACEPTADO' : 'PENDIENTE';
    this._resueltoEn = this._estado === 'ACEPTADO' ? datos.ahora : null;
  }

  cambiarPermisos(nuevos: Partial<PermisosDelCuidador>): void {
    if (!this.estaActivo) {
      throw new ErrorDeReglaDeNegocio(
        'No se pueden cambiar los permisos de un vinculo que no esta activo.',
      );
    }
    this._permisos = { ...this._permisos, ...nuevos };
  }

  /** Comprueba un permiso concreto. Lanza si el vinculo no esta activo. */
  autorizar(permiso: keyof PermisosDelCuidador): boolean {
    return this.estaActivo && this._permisos[permiso];
  }

  private static validarParentesco(parentesco: string | null): string | null {
    if (parentesco === null) return null;
    const limpio = parentesco.trim();
    if (limpio.length === 0) return null;
    if (limpio.length > 60) {
      throw new ErrorDeValidacion('El parentesco es demasiado largo.', 'parentesco');
    }
    return limpio;
  }
}
