import type { Identificador } from '../shared/Identificador.js';
import type { Medicamento } from './Medicamento.js';

/**
 * PUERTO (de salida) del dominio hacia la persistencia.
 *
 * El dominio declara QUE necesita ("dame los medicamentos de este
 * paciente"), no COMO se consigue. PostgreSQL, MongoDB o un arreglo en
 * memoria son adaptadores intercambiables que cumplen este contrato.
 * Esa inversion de dependencias es el corazon de la arquitectura
 * hexagonal.
 */
export interface RepositorioDeMedicamentos {
  guardar(medicamento: Medicamento): Promise<void>;
  buscarPorId(id: Identificador): Promise<Medicamento | null>;
  /** @param incluirSuspendidos por defecto false: solo tratamientos vigentes. */
  listarPorPaciente(
    pacienteId: Identificador,
    incluirSuspendidos?: boolean,
  ): Promise<Medicamento[]>;
  /** Medicamentos cuyo inventario cayo por debajo del umbral configurado. */
  listarConStockBajo(pacienteId: Identificador): Promise<Medicamento[]>;
  eliminar(id: Identificador): Promise<void>;
}
