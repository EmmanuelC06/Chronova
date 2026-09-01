import type { Identificador } from '../shared/Identificador.js';
import type { Dispositivo } from './Dispositivo.js';
import type { TokenDeDispositivo } from './TokenDeDispositivo.js';

/** PUERTO de salida hacia la persistencia de dispositivos. */
export interface RepositorioDeDispositivos {
  guardar(dispositivo: Dispositivo): Promise<void>;
  buscarPorToken(token: TokenDeDispositivo): Promise<Dispositivo | null>;
  /** Todos los aparatos donde esa persona quiere recibir avisos. */
  listarPorPropietario(propietarioId: Identificador): Promise<Dispositivo[]>;
  eliminarPorToken(token: TokenDeDispositivo): Promise<void>;
}
