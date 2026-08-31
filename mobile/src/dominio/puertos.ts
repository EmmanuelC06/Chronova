import type {
  AgendaDelDia,
  CuidadorDelPaciente,
  Historial,
  Medicamento,
  PacienteEnPanel,
  Perfil,
  Preferencias,
  Sesion,
  TipoDeUsuario,
} from './modelos.js';

/**
 * PUERTOS de la app movil.
 *
 * Igual que en el backend, la interfaz de usuario no habla con fetch ni
 * con AsyncStorage: habla con estos contratos. Eso permite, por ejemplo,
 * sustituir el cliente real por uno falso para revisar las pantallas sin
 * tener el servidor encendido.
 */

export interface ApiDeChronova {
  /** Define el token que se enviara en las siguientes peticiones. */
  usarToken(token: string | null): void;

  registrarPaciente(datos: {
    nombre: string;
    email: string;
    contrasena: string;
    telefono?: string | null;
    fechaDeNacimiento?: string | null;
    /** Zona horaria del telefono. Es la que dara sentido a sus horarios. */
    zonaHoraria?: string | null;
  }): Promise<Sesion>;

  registrarCuidador(datos: {
    nombre: string;
    email: string;
    contrasena: string;
    telefono?: string | null;
    rol?: string | null;
  }): Promise<Sesion>;

  iniciarSesion(datos: {
    email: string;
    contrasena: string;
    tipo?: TipoDeUsuario;
  }): Promise<Sesion>;

  obtenerPerfil(): Promise<Perfil>;
  actualizarPreferencias(cambios: Partial<Preferencias>): Promise<Preferencias>;

  listarMedicamentos(pacienteId?: string): Promise<Medicamento[]>;
  registrarMedicamento(datos: Record<string, unknown>): Promise<Medicamento>;
  suspenderMedicamento(medicamentoId: string): Promise<void>;
  reabastecerStock(medicamentoId: string, unidades: number): Promise<Medicamento>;

  obtenerAgenda(opciones?: { fecha?: string; pacienteId?: string }): Promise<AgendaDelDia>;
  registrarToma(
    tomaId: string,
    accion: 'CONFIRMAR' | 'OMITIR' | 'POSPONER',
    extras?: { observaciones?: string; minutos?: number },
  ): Promise<{ avisoDeStock: string | null }>;
  consultarHistorial(opciones?: {
    pacienteId?: string;
    desde?: string;
    hasta?: string;
  }): Promise<Historial>;

  listarPacientesDelCuidador(dias?: number): Promise<PacienteEnPanel[]>;
  listarCuidadoresDelPaciente(): Promise<CuidadorDelPaciente[]>;
  solicitarVinculo(datos: {
    emailDeLaOtraParte: string;
    parentesco?: string | null;
  }): Promise<unknown>;
  responderVinculo(vinculoId: string, respuesta: 'ACEPTAR' | 'RECHAZAR' | 'REVOCAR'): Promise<unknown>;
}

/** Guarda la sesion para que el usuario no tenga que entrar cada vez. */
export interface AlmacenDeSesion {
  leer(): Promise<Sesion | null>;
  guardar(sesion: Sesion): Promise<void>;
  borrar(): Promise<void>;
}

/** Programa las alarmas locales del telefono. */
export interface ProgramadorDeAlarmas {
  pedirPermiso(): Promise<boolean>;
  /** Reemplaza todas las alarmas por las de la agenda recibida. */
  sincronizar(agenda: AgendaDelDia, preferencias: Preferencias): Promise<void>;
  cancelarTodas(): Promise<void>;
}
