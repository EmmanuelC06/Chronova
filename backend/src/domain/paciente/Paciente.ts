import { Email } from '../shared/Email.js';
import { Identificador } from '../shared/Identificador.js';
import { Telefono } from '../shared/Telefono.js';
import { ZonaHoraria } from '../shared/ZonaHoraria.js';
import { FechaLocal } from '../shared/FechaLocal.js';
import { ErrorDeValidacion } from '../shared/errores.js';
import { PreferenciasDeAccesibilidad } from './PreferenciasDeAccesibilidad.js';

export interface PacientePlano {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  fechaDeNacimiento: string | null;
  contrasenaCifrada: string;
  /** Nombre IANA, por ejemplo "America/Bogota". */
  zonaHoraria: string;
  preferencias: {
    tamanoDeLetra: string;
    altoContraste: boolean;
    alertasSonoras: boolean;
    alertasVibracion: boolean;
    minutosDeGracia: number;
  };
  activo: boolean;
  creadoEn: string;
  /**
   * Desde cuando valen las sesiones de esta persona.
   *
   * Opcional al leer para no romper las cuentas creadas antes de que
   * existiera la columna: si falta, se toma la fecha de creacion.
   */
  sesionesValidasDesde?: string;
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
    private _fechaDeNacimiento: FechaLocal | null,
    private _contrasenaCifrada: string,
    private _zonaHoraria: ZonaHoraria,
    private _preferencias: PreferenciasDeAccesibilidad,
    private _activo: boolean,
    readonly creadoEn: Date,
    private _sesionesValidasDesde: Date,
  ) {}

  static registrar(datos: {
    id: Identificador;
    nombre: string;
    email: Email;
    telefono?: Telefono | null;
    fechaDeNacimiento?: FechaLocal | null;
    contrasenaCifrada: string;
    zonaHoraria?: ZonaHoraria;
    preferencias?: PreferenciasDeAccesibilidad;
    ahora: Date;
    /** Dia de hoy en la zona del paciente, para validar la fecha de nacimiento. */
    hoy: FechaLocal;
  }): Paciente {
    return new Paciente(
      datos.id,
      Paciente.validarNombre(datos.nombre),
      datos.email,
      datos.telefono ?? null,
      Paciente.validarFechaDeNacimiento(datos.fechaDeNacimiento ?? null, datos.hoy),
      datos.contrasenaCifrada,
      datos.zonaHoraria ?? ZonaHoraria.porDefecto(),
      datos.preferencias ?? PreferenciasDeAccesibilidad.porDefecto(),
      true,
      datos.ahora,
      datos.ahora,
    );
  }

  static desdePlano(plano: PacientePlano): Paciente {
    return new Paciente(
      Identificador.desde(plano.id),
      plano.nombre,
      Email.desde(plano.email),
      plano.telefono ? Telefono.desde(plano.telefono) : null,
      plano.fechaDeNacimiento ? FechaLocal.desde(plano.fechaDeNacimiento) : null,
      plano.contrasenaCifrada,
      ZonaHoraria.desdeOPorDefecto(plano.zonaHoraria),
      PreferenciasDeAccesibilidad.desde(plano.preferencias),
      plano.activo,
      new Date(plano.creadoEn),
      new Date(plano.sesionesValidasDesde ?? plano.creadoEn),
    );
  }

  aPlano(): PacientePlano {
    return {
      id: this.id.valor,
      nombre: this._nombre,
      email: this._email.valor,
      telefono: this._telefono ? this._telefono.valor : null,
      fechaDeNacimiento: this._fechaDeNacimiento
        ? this._fechaDeNacimiento.toString()
        : null,
      contrasenaCifrada: this._contrasenaCifrada,
      zonaHoraria: this._zonaHoraria.valor,
      preferencias: this._preferencias.toJSON(),
      activo: this._activo,
      creadoEn: this.creadoEn.toISOString(),
      sesionesValidasDesde: this._sesionesValidasDesde.toISOString(),
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
  get fechaDeNacimiento(): FechaLocal | null {
    return this._fechaDeNacimiento;
  }
  get contrasenaCifrada(): string {
    return this._contrasenaCifrada;
  }
  get zonaHoraria(): ZonaHoraria {
    return this._zonaHoraria;
  }
  get preferencias(): PreferenciasDeAccesibilidad {
    return this._preferencias;
  }
  get activo(): boolean {
    return this._activo;
  }

  /**
   * Instante a partir del cual una sesion de esta persona es valida.
   *
   * Cualquier token emitido ANTES de esta marca deja de servir. Es lo que
   * permite cerrar las sesiones abiertas sin que el servidor guarde ni
   * una sola sesion: en vez de recordar los tokens que ha repartido,
   * recuerda desde cuando los acepta.
   */
  get sesionesValidasDesde(): Date {
    return new Date(this._sesionesValidasDesde);
  }

  /**
   * Cierra todas las sesiones abiertas de esta persona.
   *
   * Se llama al cambiar la contrasena. Es el punto del sistema donde se
   * responde a "alguien entro a mi cuenta": cambiar la contrasena sin
   * esto dejaba al intruso dentro hasta siete dias mas, que es
   * exactamente lo contrario de lo que la persona cree estar haciendo.
   */
  cerrarSesionesAbiertas(ahora: Date): void {
    this._sesionesValidasDesde = ahora;
  }

  /**
   * Edad cumplida en un dia dado.
   *
   * Recibe el dia del calendario del paciente, no un instante: la edad
   * de alguien no cambia porque el servidor este en otro huso horario.
   */
  edadEn(hoy: FechaLocal): number | null {
    const nacimiento = this._fechaDeNacimiento;
    if (!nacimiento) return null;

    let edad = hoy.anio - nacimiento.anio;
    const aunNoCumple =
      hoy.mes < nacimiento.mes || (hoy.mes === nacimiento.mes && hoy.dia < nacimiento.dia);
    if (aunNoCumple) edad -= 1;
    return edad;
  }

  /** Regla del proyecto: el publico objetivo son adultos mayores. */
  esAdultoMayorEn(hoy: FechaLocal): boolean {
    const edad = this.edadEn(hoy);
    return edad !== null && edad >= 60;
  }

  // --------------------------------------------------------------

  actualizarPerfil(cambios: {
    nombre?: string;
    telefono?: Telefono | null;
    fechaDeNacimiento?: FechaLocal | null;
    ahora: FechaLocal;
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

  /**
   * Cambia la zona horaria del paciente.
   *
   * Importa cuando alguien viaja o se muda: sus horarios deben seguir
   * significando la hora de pared donde esta, no donde estaba.
   */
  cambiarZonaHoraria(zona: ZonaHoraria): void {
    this._zonaHoraria = zona;
  }

  /**
   * Cambia la contrasena y, en el mismo acto, cierra las sesiones abiertas.
   *
   * Las dos cosas van juntas a proposito, y por eso `ahora` es
   * obligatorio: si fueran dos llamadas separadas, tarde o temprano
   * alguien haria solo la primera y el cambio de contrasena volveria a
   * no servir de nada.
   */
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

  private static validarFechaDeNacimiento(
    fecha: FechaLocal | null,
    hoy: FechaLocal,
  ): FechaLocal | null {
    if (fecha === null) return null;
    if (fecha.esPosteriorA(hoy)) {
      throw new ErrorDeValidacion(
        'La fecha de nacimiento no puede estar en el futuro.',
        'fechaDeNacimiento',
      );
    }
    if (hoy.anio - fecha.anio > 120) {
      throw new ErrorDeValidacion('La fecha de nacimiento no es plausible.', 'fechaDeNacimiento');
    }
    return fecha;
  }
}
