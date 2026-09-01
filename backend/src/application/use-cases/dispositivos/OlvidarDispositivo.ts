import type { RepositorioDeDispositivos } from '../../../domain/dispositivo/RepositorioDeDispositivos.js';
import { TokenDeDispositivo } from '../../../domain/dispositivo/TokenDeDispositivo.js';
import type { Solicitante } from '../../services/PoliticaDeAcceso.js';

export interface ComandoOlvidarDispositivo {
  solicitante: Solicitante;
  token: string;
}

/**
 * CASO DE USO: dejar de enviar avisos a este telefono.
 *
 * La app lo llama al cerrar sesion. Sin esto, si un cuidador cierra
 * sesion y le presta el telefono a otra persona, los avisos sobre la
 * salud de sus pacientes seguirian llegando a esa pantalla.
 *
 * Solo se da de baja si el dispositivo pertenece a quien lo pide. De lo
 * contrario, cualquiera que adivinara un token podria silenciar los
 * avisos de otra persona.
 */
export class OlvidarDispositivo {
  constructor(private readonly dispositivos: RepositorioDeDispositivos) {}

  async ejecutar(comando: ComandoOlvidarDispositivo): Promise<{ olvidado: boolean }> {
    const token = TokenDeDispositivo.desde(comando.token);
    const dispositivo = await this.dispositivos.buscarPorToken(token);

    if (!dispositivo || !dispositivo.perteneceA(comando.solicitante.id)) {
      // Se responde lo mismo exista o no, para no revelar si un token
      // esta registrado en el sistema.
      return { olvidado: false };
    }

    await this.dispositivos.eliminarPorToken(token);
    return { olvidado: true };
  }
}
