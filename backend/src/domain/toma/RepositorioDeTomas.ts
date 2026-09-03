import type { Identificador } from '../shared/Identificador.js';
import type { Toma } from './Toma.js';

/** Rango de fechas para consultas de historial. */
export interface RangoDeFechas {
  desde: Date;
  hasta: Date;
}

/**
 * PUERTO de salida hacia la persistencia de tomas.
 */
export interface RepositorioDeTomas {
  guardar(toma: Toma): Promise<void>;
  guardarVarias(tomas: readonly Toma[]): Promise<void>;
  buscarPorId(id: Identificador): Promise<Toma | null>;

  /**
   * Programa tomas nuevas, ignorando en silencio las que ya existan para
   * el mismo medicamento y la misma hora original.
   *
   * Existe aparte de `guardarVarias` por una razon concreta: dos
   * peticiones simultaneas pueden intentar generar la agenda del mismo
   * dia a la vez (la app consulta al abrir y al refrescar). Una gana y
   * la otra choca. Que ese choque sea normal y no un error es una
   * decision que le corresponde al adaptador de persistencia, no al
   * caso de uso.
   *
   * @returns cuantas tomas se insertaron realmente.
   */
  programarSiNoExisten(tomas: readonly Toma[]): Promise<number>;

  /** Todas las tomas de un paciente dentro de un rango, ordenadas por hora. */
  listarPorPacienteEnRango(pacienteId: Identificador, rango: RangoDeFechas): Promise<Toma[]>;

  /** Tomas ya programadas de un medicamento en un rango. Evita duplicar la agenda. */
  listarPorMedicamentoEnRango(
    medicamentoId: Identificador,
    rango: RangoDeFechas,
  ): Promise<Toma[]>;

  /** Tomas sin resolver cuya hora ya paso. Las usa el cierre automatico. */
  listarVencidas(limite: Date): Promise<Toma[]>;

  eliminarPorMedicamento(medicamentoId: Identificador): Promise<void>;

  /**
   * Retira las tomas de un medicamento que nadie ha resuelto todavia y
   * cuya hora original aun no ha llegado. Devuelve cuantas retiro.
   *
   * Existe para cuando el tratamiento CAMBIA: se suspende el medicamento,
   * o se mueven sus horarios. Las tomas que ya se habian generado para el
   * horario viejo dejan de tener sentido, y si se quedan cuentan como
   * incumplimientos de algo que el paciente nunca tuvo que tomar.
   *
   * Se borran en vez de marcarlas OMITIDAS justamente por eso: una toma
   * omitida es un dato clinico —alguien no se tomo su medicina— y esto
   * no lo es. Solo se van las FUTURAS y SIN RESOLVER: lo que ya paso es
   * historial y no se toca.
   */
  eliminarPendientesDesde(medicamentoId: Identificador, desde: Date): Promise<number>;
}
