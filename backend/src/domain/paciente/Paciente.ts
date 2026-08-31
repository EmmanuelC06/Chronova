import { Email } from '../shared/Email.js';
import { Identificador } from '../shared/Identificador.js';
import { Telefono } from '../shared/Telefono.js';
import { ErrorDeValidacion } from '../shared/errores.js';
import { PreferenciasDeAccesibilidad } from './PreferenciasDeAccesibilidad.js';

export interface PacientePlano {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  fechaDeNacimiento: string | null;
  contrasenaCifrada: string;
  preferencias: {
    tamanoDeLetra: string;
    altoContraste: boolean;
    alertasSonoras: boolean;
    alertasVibracion: boolean;
    minutosDeGracia: number;
  };
  activo: boolean;
  creadoEn: string;
}

/**
 * Entidad Paciente: la persona que sigue el tratamiento.
 *
 * Nunca guarda la contrasena en claro. El dominio solo conoce un texto
 * ya cifrado; QUIEN lo cifra y COMO es una decision de infraestructura
 * (ver el puerto CifradorDeContrasenas).
 */
export class Paciente {
  private constructor(
    readonly id: Identificador,
    private _nombre: string,
    private _email: Email,
    private _telefono: Telefono | null,
    private _fechaDeNacimiento: Date | null,
    private _contrasenaCifrada: string,
    private _preferencias: PreferenciasDeAccesibilidad,
    private _activo: boolean,
    readonly creadoEn: Date,
  ) {}

  static registrar(datos: {
    id: Identificador;
    nombre: string;
    email: Email;
    telefono?: Telefono | null;
    fechaDeNacimiento?: Date | null;
    contrasenaCifrada: string;
    preferencias?: PreferenciasDeAccesibilidad;
    ahora: Date;
  }): Paciente {
    return new Paciente(
      datos.id,
      Paciente.validarNombre(datos.nombre),
      datos.email,
      datos.telefono ?? null,
      Paciente.validarFechaDeNacimiento(datos.fechaDeNacimiento ?? null, datos.ahora),
      datos.contrasenaCifrada,
      datos.preferencias ?? PreferenciasDeAccesibilidad.porDefecto(),
      true,
      datos.ahora,
    );
  }

  static desdePlano(plano: PacientePlano): Paciente {
    return new Paciente(
      Identificador.desde(plano.id),
      plano.nombre,
      Email.desde(plano.email),
      plano.telefono ? Telefono.desde(plano.telefono) : null,
      plano.fechaDeNacimiento ? new Date(plano.fechaDeNacimiento) : null,
      plano.contrasenaCifrada,
      PreferenciasDeAccesibilidad.desde(plano.preferencias),
      plano.activo,
      new Date(plano.creadoEn),
    );
  }

  aPlano(): PacientePlano {
    return {
      id: this.id.valor,
      nombre: this._nombre,
      email: this._email.valor,
      telefono: this._telefono ? this._telefono.valor : null,
      fechaDeNacimiento: this._fechaDeNacimiento
        ? this._fechaDeNacimiento.toISOString()
        : null,
      contrasenaCifrada: this._contrasenaCifrada,
      preferencias: this._preferencias.toJSON(),
      activo: this._activo,
      creadoEn: this.creadoEn.toISOString(),
    };
  }

  // --------------------------------------------------------------

  get nombre(): string {
    return this._nombre;
  }
  get email(): Email {
    return this._email;
  }
  get telefono(): Telefono | null {
    return this._telefono;
  }
  get fechaDeNacimiento(): Date | null {
    return this._fechaDeNacimiento ? new Date(this._fechaDeNacimiento) : null;
  }
  get contrasenaCifrada(): string {
    return this._contrasenaCifrada;
  }
  get preferencias(): PreferenciasDeAccesibilidad {
    return this._preferencias;
  }
  get activo(): boolean {
    return this._activo;
  }

  /** Edad cumplida. Se usa para adaptar la interfaz por defecto. */
  edadEn(fecha: Date): number | null {
    if (!this._fechaDeNacimiento) return null;
    let edad = fecha.getFullYear() - this._fechaDeNacimiento.getFullYear();
    const mes = fecha.getMonth() - this._fechaDeNacimiento.getMonth();
    if (mes < 0 || (mes === 0 && fecha.getDate() < this._fechaDeNacimiento.getDate())) {
      edad -= 1;
    }
    return edad;
  }

  /** Regla del proyecto: el publico objetivo son adultos mayores. */
  esAdultoMayorEn(fecha: Date): boolean {
    const edad = this.edadEn(fecha);
    return edad !== null && edad >= 60;
  }

  // --------------------------------------------------------------

  actualizarPerfil(cambios: {
    nombre?: string;
    telefono?: Telefono | null;
    fechaDeNacimiento?: Date | null;
    ahora: Date;
  }): void {
    if (cambios.nombre !== undefined) this._nombre = Paciente.validarNombre(cambios.nombre);
    if (cambios.telefono !== undefined) this._telefono = cambios.telefono;
    if (cambios.fechaDeNacimiento !== undefined) {
      this._fechaDeNacimiento = Paciente.validarFechaDeNacimiento(
        cambios.fechaDeNacimiento,
        cambios.ahora,
      );
    }
  }

  cambiarPreferencias(preferencias: PreferenciasDeAccesibilidad): void {
    this._preferencias = preferencias;
  }

  cambiarContrasena(nuevaContrasenaCifrada: string): void {
    if (!nuevaContrasenaCifrada || nuevaContrasenaCifrada.trim().length === 0) {
      throw new ErrorDeValidacion('La contrasena cifrada no puede estar vacia.', 'contrasena');
    }
    this._contrasenaCifrada = nuevaContrasenaCifrada;
  }

  desactivar(): void {
    this._activo = false;
  }

  // --------------------------------------------------------------

  private static validarNombre(nombre: string): string {
    const limpio = (nombre ?? '').trim().replace(/\s+/g, ' ');
    if (limpio.length < 2) {
      throw new ErrorDeValidacion('El nombre debe tener al menos 2 caracteres.', 'nombre');
    }
    if (limpio.length > 120) {
      throw new ErrorDeValidacion('El nombre es demasiado largo.', 'nombre');
    }
    return limpio;
  }

  private static validarFechaDeNacimiento(fecha: Date | null, ahora: Date): Date | null {
    if (fecha === null) return null;
    if (Number.isNaN(fecha.getTime())) {
      throw new ErrorDeValidacion('La fecha de nacimiento no es valida.', 'fechaDeNacimiento');
    }
    if (fecha.getTime() > ahora.getTime()) {
      throw new ErrorDeValidacion(
        'La fecha de nacimiento no puede estar en el futuro.',
        'fechaDeNacimiento',
      );
    }
    const anos = ahora.getFullYear() - fecha.getFullYear();
    if (anos > 120) {
      throw new ErrorDeValidacion('La fecha de nacimiento no es plausible.', 'fechaDeNacimiento');
    }
    return fecha;
  }
}
