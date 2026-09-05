/**
 * Modelos del cliente.
 *
 * La app movil tambien se organiza por capas. Este archivo es su
 * "dominio": describe las cosas de las que habla la aplicacion, sin
 * saber nada de HTTP, de React ni de pantallas.
 *
 * Los nombres coinciden con los del backend a proposito. Cuando el
 * lenguaje del dominio es el mismo en todas las capas y en los
 * documentos del proyecto, se acaban las traducciones mentales y los
 * errores que vienen con ellas.
 */

export type TipoDeUsuario = 'PACIENTE' | 'CUIDADOR';

export type EstadoDeToma = 'PENDIENTE' | 'POSPUESTA' | 'TOMADA' | 'OMITIDA';

export type NivelDeAdherencia = 'BUENA' | 'REGULAR' | 'BAJA' | 'SIN_DATOS';

export type TamanoDeLetra = 'NORMAL' | 'GRANDE' | 'MUY_GRANDE';

export interface UsuarioAutenticado {
  id: string;
  nombre: string;
  email: string;
  tipo: TipoDeUsuario;
}

export interface Sesion {
  token: string;
  usuario: UsuarioAutenticado;
}

export interface Preferencias {
  tamanoDeLetra: TamanoDeLetra;
  altoContraste: boolean;
  alertasSonoras: boolean;
  alertasVibracion: boolean;
  minutosDeGracia: number;
}

export interface Perfil extends UsuarioAutenticado {
  telefono: string | null;
  creadoEn: string;
  edad?: number | null;
  /** Zona horaria IANA del paciente, por ejemplo "America/Bogota". */
  zonaHoraria?: string;
  preferencias?: Preferencias;
  rol?: string | null;
  /**
   * Constancia de la autorizacion de tratamiento de datos que otorgo.
   *
   * La Ley 1581 de 2012 da derecho a pedir prueba de lo que se autorizo.
   * Viene en el perfil para que ese derecho se pueda ejercer desde la
   * propia app, sin escribirle a nadie.
   */
  autorizacionDeDatos?: {
    consta: boolean;
    versionDePolitica: string | null;
    otorgadaEn: string | null;
    hayVersionMasReciente: boolean;
  };
}

export interface Dosis {
  cantidad: number;
  unidad: string;
}

export interface Frecuencia {
  tipo: 'DIARIA' | 'DIAS_DE_LA_SEMANA' | 'CADA_N_DIAS';
  diasDeLaSemana: number[];
  intervaloEnDias: number;
  descripcion?: string;
}

export interface Medicamento {
  id: string;
  pacienteId: string;
  nombre: string;
  dosis: Dosis;
  frecuencia: Frecuencia;
  horarios: string[];
  fechaInicio: string;
  fechaFin: string | null;
  instrucciones: string | null;
  stock: { unidadesDisponibles: number; umbralDeAlerta: number };
  activo: boolean;
  descripcionDeDosis?: string;
  descripcionDeFrecuencia?: string;
  necesitaReabastecimiento?: boolean;
}

export interface ElementoDeAgenda {
  tomaId: string;
  medicamentoId: string;
  nombreDelMedicamento: string;
  dosis: string;
  instrucciones: string | null;
  horaProgramada: string;
  programadaPara: string;
  estado: EstadoDeToma;
  vecesPospuesta: number;
  puedeConfirmarse: boolean;
  necesitaReabastecimiento: boolean;
}

export interface ResumenDeAdherencia {
  totalProgramadas: number;
  tomadas: number;
  omitidas: number;
  pendientes: number;
  tomadasATiempo: number;
  tomadasConRetraso: number;
  porcentaje: number;
  porcentajeDePuntualidad: number;
  nivel: NivelDeAdherencia;
  requiereAtencionDelCuidador: boolean;
  mensaje: string;
}

export interface AgendaDelDia {
  fecha: string;
  /** Zona en la que estan expresadas las horas de esta agenda. */
  zonaHoraria: string;
  elementos: ElementoDeAgenda[];
  resumen: ResumenDeAdherencia;
}

export interface RegistroDeHistorial {
  tomaId: string;
  medicamentoId: string;
  nombreDelMedicamento: string;
  programadaPara: string;
  estado: EstadoDeToma;
  resueltaEn: string | null;
  puntualidad: 'A_TIEMPO' | 'CON_RETRASO' | 'ADELANTADA' | null;
  minutosDeDesfase: number | null;
  registradaPor: string | null;
  observaciones: string | null;
}

export interface Historial {
  desde: string;
  hasta: string;
  zonaHoraria: string;
  registros: RegistroDeHistorial[];
  resumen: ResumenDeAdherencia;
  porDia: { fecha: string; tomadas: number; omitidas: number; porcentaje: number }[];
}

export interface PermisosDelCuidador {
  puedeVerHistorial: boolean;
  puedeRegistrarTomas: boolean;
  puedeGestionarMedicamentos: boolean;
  recibeAlertas: boolean;
}

export interface PacienteEnPanel {
  vinculoId: string;
  pacienteId: string;
  nombre: string;
  parentesco: string | null;
  estadoDelVinculo: string;
  permisos: PermisosDelCuidador;
  adherencia: {
    porcentaje: number;
    nivel: NivelDeAdherencia;
    tomadas: number;
    omitidas: number;
    pendientes: number;
  };
  requiereAtencion: boolean;
  medicamentosActivos: number;
  medicamentosConStockBajo: number;
  ultimaActividad: string | null;
  /**
   * Falso cuando la solicitud sigue pendiente o cuando el paciente no ha
   * concedido `puedeVerHistorial`. En ese caso los campos clinicos de
   * arriba vienen en cero desde el servidor, y pintarlos seria mentir:
   * un 0% que en realidad significa "no puedo verlo".
   */
  datosClinicosVisibles: boolean;
}

export interface CuidadorDelPaciente {
  vinculoId: string;
  cuidadorId: string;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: string | null;
  parentesco: string | null;
  estado: string;
  permisos: PermisosDelCuidador;
  solicitadoPor: string;
  creadoEn: string;
}

/**
 * Error con el mensaje que el backend preparo para mostrarle a la
 * persona. La app lo muestra tal cual: los mensajes utiles se escriben
 * una sola vez, en el dominio, y no se reinventan en cada pantalla.
 */
export class ErrorDeApi extends Error {
  constructor(
    mensaje: string,
    readonly codigo: string,
    readonly campo?: string,
    readonly estado?: number,
  ) {
    super(mensaje);
    this.name = 'ErrorDeApi';
  }

  /** True cuando conviene sacar al usuario a la pantalla de ingreso. */
  get exigeVolverAIniciarSesion(): boolean {
    return this.codigo === 'NO_AUTENTICADO';
  }
}
