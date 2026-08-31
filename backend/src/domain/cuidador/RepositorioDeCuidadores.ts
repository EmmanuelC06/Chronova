import type { Email } from '../shared/Email.js';
import type { Identificador } from '../shared/Identificador.js';
import type { Cuidador } from './Cuidador.js';

/** PUERTO de salida hacia la persistencia de cuidadores. */
export interface RepositorioDeCuidadores {
  guardar(cuidador: Cuidador): Promise<void>;
  buscarPorId(id: Identificador): Promise<Cuidador | null>;
  buscarPorEmail(email: Email): Promise<Cuidador | null>;
  existeConEmail(email: Email): Promise<boolean>;
}
