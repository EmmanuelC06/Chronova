import type { Email } from '../shared/Email.js';
import type { Identificador } from '../shared/Identificador.js';
import type { Paciente } from './Paciente.js';

/** PUERTO de salida hacia la persistencia de pacientes. */
export interface RepositorioDePacientes {
  guardar(paciente: Paciente): Promise<void>;
  buscarPorId(id: Identificador): Promise<Paciente | null>;
  buscarPorEmail(email: Email): Promise<Paciente | null>;
  existeConEmail(email: Email): Promise<boolean>;
  listarPorIds(ids: readonly Identificador[]): Promise<Paciente[]>;
}
