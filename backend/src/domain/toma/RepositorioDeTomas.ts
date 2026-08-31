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
}
