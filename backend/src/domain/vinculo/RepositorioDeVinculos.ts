import type { Identificador } from '../shared/Identificador.js';
import type { Vinculo } from './Vinculo.js';

/** PUERTO de salida hacia la persistencia de vinculos cuidador-paciente. */
export interface RepositorioDeVinculos {
  guardar(vinculo: Vinculo): Promise<void>;
  buscarPorId(id: Identificador): Promise<Vinculo | null>;
  /** El vinculo (en cualquier estado) entre un cuidador y un paciente concretos. */
  buscarEntre(
    cuidadorId: Identificador,
    pacienteId: Identificador,
  ): Promise<Vinculo | null>;
  listarPorCuidador(cuidadorId: Identificador): Promise<Vinculo[]>;
  listarPorPaciente(pacienteId: Identificador): Promise<Vinculo[]>;
}
