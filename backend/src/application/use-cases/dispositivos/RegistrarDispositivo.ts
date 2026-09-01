import { Identificador } from '../../../domain/shared/Identificador.js';
import { Dispositivo } from '../../../domain/dispositivo/Dispositivo.js';
import type { DispositivoPlano } from '../../../domain/dispositivo/Dispositivo.js';
import type { RepositorioDeDispositivos } from '../../../domain/dispositivo/RepositorioDeDispositivos.js';
import { TokenDeDispositivo } from '../../../domain/dispositivo/TokenDeDispositivo.js';
import type { GeneradorDeIds } from '../../ports/GeneradorDeIds.js';
import type { Reloj } from '../../ports/Reloj.js';
import type { Solicitante } from '../../services/PoliticaDeAcceso.js';

export interface ComandoRegistrarDispositivo {
  solicitante: Solicitante;
  token: string;
  plataforma: string;
}

/**
 * CASO DE USO: registrar el telefono donde la persona quiere recibir avisos.
 *
 * La app lo llama despues de iniciar sesion, cada vez. No es un
 * desperdicio: el token de Expo cambia cuando el usuario reinstala la
 * app o cambia de telefono, asi que reenviarlo en cada sesion es lo que
 * mantiene el registro al dia.
 *
 * Si el token ya existia se reasigna en lugar de duplicarse. Ese caso es
 * real en el publico del proyecto: una hija instala la app en el
 * telefono viejo de su madre, y el aparato es el mismo pero el dueno de
 * la cuenta es otro.
 */
export class RegistrarDispositivo {
  constructor(
    private readonly dispositivos: RepositorioDeDispositivos,
    private readonly ids: GeneradorDeIds,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(comando: ComandoRegistrarDispositivo): Promise<DispositivoPlano> {
    const token = TokenDeDispositivo.desde(comando.token);
    const ahora = this.reloj.ahora();

    const existente = await this.dispositivos.buscarPorToken(token);

    if (existente) {
      existente.reasignarA(comando.solicitante.id, comando.solicitante.tipo, ahora);
      await this.dispositivos.guardar(existente);
      return existente.aPlano();
    }

    const dispositivo = Dispositivo.registrar({
      id: this.ids.nuevo(),
      propietarioId: comando.solicitante.id,
      tipoDePropietario: comando.solicitante.tipo,
      token,
      plataforma: comando.plataforma,
      ahora,
    });

    await this.dispositivos.guardar(dispositivo);
    return dispositivo.aPlano();
  }
}
