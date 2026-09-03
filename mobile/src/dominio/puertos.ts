import type {
  AgendaDelDia,
  CuidadorDelPaciente,
  Historial,
  Medicamento,
  PacienteEnPanel,
  Perfil,
  PermisosDelCuidador,
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

  /**
   * Pide un codigo para recuperar la contrasena.
   *
   * Responde lo mismo exista o no la cuenta: si distinguiera, cualquiera
   * podria averiguar quien esta registrado en una aplicacion de salud.
   */
  solicitarRecuperacion(email: string): Promise<{ mensaje: string; minutosDeVigencia: number }>;

  restablecerContrasena(datos: {
    email: string;
    codigo: string;
    nuevaContrasena: string;
  }): Promise<unknown>;
  actualizarPreferencias(cambios: Partial<Preferencias>): Promise<Preferencias>;

  listarMedicamentos(pacienteId?: string): Promise<Medicamento[]>;
  registrarMedicamento(datos: Record<string, unknown>): Promise<Medicamento>;
  actualizarMedicamento(medicamentoId: string, cambios: Record<string, unknown>): Promise<Medicamento>;
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

  registrarDispositivo(token: string, plataforma: string): Promise<unknown>;
  olvidarDispositivo(token: string): Promise<unknown>;

  listarPacientesDelCuidador(dias?: number): Promise<PacienteEnPanel[]>;
  listarCuidadoresDelPaciente(): Promise<CuidadorDelPaciente[]>;
  solicitarVinculo(datos: {
    emailDeLaOtraParte: string;
    parentesco?: string | null;
  }): Promise<unknown>;
  responderVinculo(vinculoId: string, respuesta: 'ACEPTAR' | 'RECHAZAR' | 'REVOCAR'): Promise<unknown>;

  /**
   * El paciente ajusta que puede hacer un cuidador concreto con su
   * informacion. Solo el paciente: es su decision, no la del cuidador.
   */
  cambiarPermisosDelVinculo(
    vinculoId: string,
    permisos: Partial<PermisosDelCuidador>,
  ): Promise<unknown>;
}

/** Guarda la sesion para que el usuario no tenga que entrar cada vez. */
export interface AlmacenDeSesion {
  leer(): Promise<Sesion | null>;
  guardar(sesion: Sesion): Promise<void>;
  borrar(): Promise<void>;
}

/**
 * Registra este telefono para recibir notificaciones remotas.
 *
 * Es distinto de las alarmas locales: aquellas las programa el propio
 * telefono y suenan sin internet; estas las envia el servidor cuando
 * ocurre algo que el telefono no puede saber por su cuenta, como que el
 * paciente al que acompanas se salto una toma.
 */
export interface RegistroDePush {
  /** Devuelve null si no hay permiso o el dispositivo no lo soporta. */
  obtenerToken(): Promise<string | null>;
  plataforma(): 'android' | 'ios' | 'web';

  /**
   * Avisa cuando la persona TOCA una notificacion, no cuando llega.
   *
   * Devuelve una funcion para cancelar la suscripcion, porque dejar
   * escuchas vivas despues de desmontar el componente es la forma
   * habitual de acabar navegando dos veces al mismo sitio.
   */
  alTocarNotificacion(manejador: (datos: DatosDeNotificacion) => void): () => void;

  /**
   * Notificacion que abrio la aplicacion cuando estaba cerrada del todo.
   *
   * Hace falta ademas de la escucha anterior: si el sistema mato la app y
   * el usuario la reabre tocando el aviso, para cuando la escucha se
   * registra el toque ya ocurrio y no lo veria nadie.
   */
  notificacionQueAbrioLaApp(): Promise<DatosDeNotificacion | null>;
}

/**
 * Datos que viajan dentro de una notificacion.
 *
 * Los envia el servidor en el campo `data` del aviso, o los pone la
 * propia app al programar una alarma local. Todos son opcionales a
 * proposito: una notificacion vieja, de una version anterior de la app,
 * no debe romper nada al tocarla.
 */
export interface DatosDeNotificacion {
  /** TOMA_PERDIDA, STOCK_BAJO, SOLICITUD_DE_VINCULO... */
  tipo?: string;
  /** Presente en los avisos dirigidos a un cuidador. */
  pacienteId?: string;
  /** Presente en las alarmas locales del paciente. */
  tomaId?: string;
  medicamentoId?: string;
}

/** Programa las alarmas locales del telefono. */
export interface ProgramadorDeAlarmas {
  pedirPermiso(): Promise<boolean>;

  /**
   * Reemplaza todas las alarmas por las de las agendas recibidas.
   *
   * Recibe VARIOS dias, no uno. Con un solo dia, las alarmas dejaban de
   * existir en cuanto el paciente pasaba una jornada sin abrir la
   * aplicacion: no quedaba ninguna programada y nada las volvia a crear.
   * Para una persona mayor que precisamente depende del recordatorio,
   * eso apagaba en silencio la funcion principal del producto.
   */
  sincronizar(agendas: readonly AgendaDelDia[], preferencias: Preferencias): Promise<void>;

  cancelarTodas(): Promise<void>;
}
