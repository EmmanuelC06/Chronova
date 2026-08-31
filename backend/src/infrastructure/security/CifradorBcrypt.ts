import bcrypt from 'bcryptjs';
import type { CifradorDeContrasenas } from '../../application/ports/CifradorDeContrasenas.js';

/**
 * ADAPTADOR del puerto CifradorDeContrasenas usando bcrypt.
 *
 * bcrypt es lento a proposito: cada intento de adivinar una contrasena
 * le cuesta tiempo real al atacante. El "factor de costo" 10 es un
 * equilibrio razonable (unos 100 ms por operacion) para un servidor
 * academico; en produccion con hardware potente conviene subirlo a 12.
 */
export class CifradorBcrypt implements CifradorDeContrasenas {
  constructor(private readonly factorDeCosto = 10) {}

  async cifrar(contrasenaEnClaro: string): Promise<string> {
    return bcrypt.hash(contrasenaEnClaro, this.factorDeCosto);
  }

  async verificar(contrasenaEnClaro: string, contrasenaCifrada: string): Promise<boolean> {
    try {
      return await bcrypt.compare(contrasenaEnClaro, contrasenaCifrada);
    } catch {
      // Un hash con formato invalido no debe tumbar el servidor.
      return false;
    }
  }
}
