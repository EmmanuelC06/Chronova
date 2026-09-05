import { Email } from '../shared/Email.js';
import { AutorizacionDeDatos } from '../shared/AutorizacionDeDatos.js';
import type { AutorizacionDeDatosPlana } from '../shared/AutorizacionDeDatos.js';
import { Identificador } from '../shared/Identificador.js';
import { Telefono } from '../shared/Telefono.js';
import { ErrorDeValidacion } from '../shared/errores.js';

export interface CuidadorPlano {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  contrasenaCifrada: string;
  /** "Hijo", "Enfermera", "Vecina"... Ayuda a que el paciente lo reconozca. */
  rol: string | null;
  activo: boolean;
  creadoEn: string;
  /** Version de la politica que acepto y cuando. Ausente en cuentas antiguas. */
  autorizacionDeDatos?: AutorizacionDeDatosPlana | null;
  /**
   * Desde cuando valen las sesiones de esta persona.
   *
   * Opcional al leer para no romper las cuentas creadas antes de que
   * existiera la columna: si falta, se toma la fecha de creacion.
   */
  sesionesValidasDesde?: string;
}

/**
 * Entidad Cuidador: familiar, acompanante o profesional de la salud que
 * hace seguimiento al tratamiento de uno o varios pacientes.
 *
 * El cuidador NO es dueno de los datos del paciente: solo accede a los
 * pacientes con los que tiene un vinculo aceptado (ver Vinculo). Esa
 * separacion es lo que permite cumplir con la confidencialidad de la
 * informacion medica que exige el planteamiento del proyecto.
 */
export class Cuidador {
  private constructor(
    readonly id: Identificador,
    private _nombre: string,
    private _email: Email,
    private _telefono: Telefono | null,
    private _contrasenaCifrada: string,
    private _rol: string | null,
    private _activo: boolean,
    readonly creadoEn: Date,
    private _sesionesValidasDesde: Date,
    private readonly _autorizacionDeDatos: AutorizacionDeDatos,
  ) {}

  static registrar(datos: {
    id: Identificador;
    nombre: string;
    email: Email;
    telefono?: Telefono | null;
    contrasenaCifrada: string;
    rol?: string | null;
    /** Version de la politica de tratamiento que acepto. Obligatoria. */
    versionDePolitica: string;
    ahora: Date;
  }): Cuidador {
    return new Cuidador(
      datos.id,
      Cuidador.validarNombre(datos.nombre),
      datos.email,
      datos.telefono ?? null,
      datos.contrasenaCifrada,
      Cuidador.validarRol(datos.rol ?? null),
      true,
      datos.ahora,
      datos.ahora,
      AutorizacionDeDatos.otorgar({
        versionDePolitica: datos.versionDePolitica,
        ahora: datos.ahora,
      }),
    );
  }

  static desdePlano(plano: CuidadorPlano): Cuidador {
    return new Cuidador(
      Identificador.desde(plano.id),
      plano.nombre,
      Email.desde(plano.email),
      plano.telefono ? Telefono.desde(plano.telefono) : null,
      plano.contrasenaCifrada,
      plano.rol,
      plano.activo,
      new Date(plano.creadoEn),
      new Date(plano.sesionesValidasDesde ?? plano.creadoEn),
      AutorizacionDeDatos.desdePlano(plano.autorizacionDeDatos, new Date(plano.creadoEn)),
    );
  }

  aPlano(): CuidadorPlano {
    return {
      id: this.id.valor,
      nombre: this._nombre,
      email: this._email.valor,
      telefono: this._telefono ? this._telefono.valor : null,
      contrasenaCifrada: this._contrasenaCifrada,
      rol: this._rol,
      activo: this._activo,
      creadoEn: this.creadoEn.toISOString(),
      sesionesValidasDesde: this._sesionesValidasDesde.toISOString(),
      autorizacionDeDatos: this._autorizacionDeDatos.toJSON(),
    };
  }

  /** La autorizacion que otorgo, para poder mostrarsela y probarla. */
  get autorizacionDeDatos(): AutorizacionDeDatos {
    return this._autorizacionDeDatos;
  }

  get nombre(): string {
    return this._nombre;
  }
  get email(): Email {
    return this._email;
  }
  get telefono(): Telefono | null {
    return this._telefono;
  }
  get contrasenaCifrada(): string {
    return this._contrasenaCifrada;
  }
  get rol(): string | null {
    return this._rol;
  }
  get activo(): boolean {
    return this._activo;
  }

  /**
   * Instante a partir del cual una sesion de esta persona es valida.
   * Cualquier token emitido antes deja de servir. Ver Paciente.
   */
  get sesionesValidasDesde(): Date {
    return new Date(this._sesionesValidasDesde);
  }

  cerrarSesionesAbiertas(ahora: Date): void {
    this._sesionesValidasDesde = ahora;
  }

  actualizarPerfil(cambios: { nombre?: string; telefono?: Telefono | null; rol?: string | null }): void {
    if (cambios.nombre !== undefined) this._nombre = Cuidador.validarNombre(cambios.nombre);
    if (cambios.telefono !== undefined) this._telefono = cambios.telefono;
    if (cambios.rol !== undefined) this._rol = Cuidador.validarRol(cambios.rol);
  }

  /** Ver la explicacion equivalente en Paciente: van juntas a proposito. */
  cambiarContrasena(nuevaContrasenaCifrada: string, ahora: Date): void {
    if (!nuevaContrasenaCifrada || nuevaContrasenaCifrada.trim().length === 0) {
      throw new ErrorDeValidacion('La contrasena cifrada no puede estar vacia.', 'contrasena');
    }
    this._contrasenaCifrada = nuevaContrasenaCifrada;
    this.cerrarSesionesAbiertas(ahora);
  }

  desactivar(ahora: Date): void {
    this._activo = false;
    this.cerrarSesionesAbiertas(ahora);
  }

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

  private static validarRol(rol: string | null): string | null {
    if (rol === null) return null;
    const limpio = rol.trim();
    if (limpio.length === 0) return null;
    if (limpio.length > 60) {
      throw new ErrorDeValidacion('La descripcion del rol es demasiado larga.', 'rol');
    }
    return limpio;
  }
}
