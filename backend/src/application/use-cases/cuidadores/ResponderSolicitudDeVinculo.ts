import { Identificador } from '../../../domain/shared/Identificador.js';
import { ErrorDeAutorizacion, ErrorNoEncontrado } from '../../../domain/shared/errores.js';
import type { RepositorioDeVinculos } from '../../../domain/vinculo/RepositorioDeVinculos.js';
import type { VinculoPlano } from '../../../domain/vinculo/Vinculo.js';
import type { Notificador } from '../../ports/Notificador.js';
import type { Reloj } from '../../ports/Reloj.js';
import type { Solicitante } from '../../services/PoliticaDeAcceso.js';

export interface ComandoResponderSolicitud {
  solicitante: Solicitante;
  vinculoId: string;
  respuesta: 'ACEPTAR' | 'RECHAZAR' | 'REVOCAR';
}

/**
 * CASO DE USO: el paciente decide sobre el acceso a sus datos.
 *
 * Solo el paciente puede aceptar, rechazar o revocar. Es su informacion
 * de salud, y el derecho a retirar el consentimiento debe estar siempre
 * disponible, sin importar quien creo el vinculo.
 */
export class ResponderSolicitudDeVinculo {
  constructor(
    private readonly vinculos: RepositorioDeVinculos,
    private readonly reloj: Reloj,
    private readonly notificador: Notificador,
  ) {}

  async ejecutar(comando: ComandoResponderSolicitud): Promise<VinculoPlano> {
    const vinculo = await this.vinculos.buscarPorId(Identificador.desde(comando.vinculoId));
    if (!vinculo) throw new ErrorNoEncontrado('el vinculo', comando.vinculoId);

    if (
      comando.solicitante.tipo !== 'PACIENTE' ||
      !vinculo.pacienteId.esIgualA(comando.solicitante.id)
    ) {
      throw new ErrorDeAutorizacion(
        'Solo el paciente puede decidir quien accede a su informacion de salud.',
      );
    }

    const ahora = this.reloj.ahora();

    switch (comando.respuesta) {
      case 'ACEPTAR':
        vinculo.aceptar(ahora);
        break;
      case 'RECHAZAR':
        vinculo.rechazar(ahora);
        break;
      case 'REVOCAR':
        vinculo.revocar(ahora);
        break;
    }

    await this.vinculos.guardar(vinculo);

    if (comando.respuesta === 'ACEPTAR') {
      await this.notificador.enviar({
        tipo: 'VINCULO_ACEPTADO',
        destinatarioId: vinculo.cuidadorId,
        tipoDeDestinatario: 'CUIDADOR',
        titulo: 'Solicitud aceptada',
        cuerpo: 'El paciente acepto tu solicitud. Ya puedes ver su seguimiento.',
        datos: { vinculoId: vinculo.id.valor },
      });
    }

    return vinculo.aPlano();
  }
}
