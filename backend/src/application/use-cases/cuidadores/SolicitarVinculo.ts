import { Email } from '../../../domain/shared/Email.js';
import { Identificador } from '../../../domain/shared/Identificador.js';
import { ErrorDeConflicto, ErrorNoEncontrado } from '../../../domain/shared/errores.js';
import type { RepositorioDeCuidadores } from '../../../domain/cuidador/RepositorioDeCuidadores.js';
import type { RepositorioDePacientes } from '../../../domain/paciente/RepositorioDePacientes.js';
import type { RepositorioDeVinculos } from '../../../domain/vinculo/RepositorioDeVinculos.js';
import { Vinculo } from '../../../domain/vinculo/Vinculo.js';
import type { PermisosDelCuidador, VinculoPlano } from '../../../domain/vinculo/Vinculo.js';
import type { GeneradorDeIds } from '../../ports/GeneradorDeIds.js';
import type { Notificador } from '../../ports/Notificador.js';
import type { Reloj } from '../../ports/Reloj.js';
import type { Solicitante } from '../../services/PoliticaDeAcceso.js';

export interface ComandoSolicitarVinculo {
  solicitante: Solicitante;
  /** Correo de la otra parte: el paciente si pide el cuidador, y al reves. */
  emailDeLaOtraParte: string;
  parentesco?: string | null;
  permisos?: Partial<PermisosDelCuidador>;
}

/**
 * CASO DE USO: crear el vinculo entre un cuidador y un paciente.
 *
 * Funciona en los dos sentidos, y el consentimiento cambia segun quien
 * inicie:
 *  - Si el CUIDADOR busca al paciente, el vinculo queda PENDIENTE hasta
 *    que el paciente lo apruebe.
 *  - Si el PACIENTE invita a su cuidador, el vinculo nace ACEPTADO,
 *    porque el consentimiento ya lo esta dando el dueno de los datos.
 */
export class SolicitarVinculo {
  constructor(
    private readonly vinculos: RepositorioDeVinculos,
    private readonly pacientes: RepositorioDePacientes,
    private readonly cuidadores: RepositorioDeCuidadores,
    private readonly ids: GeneradorDeIds,
    private readonly reloj: Reloj,
    private readonly notificador: Notificador,
  ) {}

  async ejecutar(comando: ComandoSolicitarVinculo): Promise<VinculoPlano> {
    const email = Email.desde(comando.emailDeLaOtraParte);
    const ahora = this.reloj.ahora();

    let cuidadorId: Identificador;
    let pacienteId: Identificador;

    if (comando.solicitante.tipo === 'CUIDADOR') {
      const paciente = await this.pacientes.buscarPorEmail(email);
      if (!paciente) {
        throw new ErrorNoEncontrado('un paciente registrado con ese correo');
      }
      cuidadorId = comando.solicitante.id;
      pacienteId = paciente.id;
    } else {
      const cuidador = await this.cuidadores.buscarPorEmail(email);
      if (!cuidador) {
        throw new ErrorNoEncontrado('un cuidador registrado con ese correo');
      }
      cuidadorId = cuidador.id;
      pacienteId = comando.solicitante.id;
    }

    const existente = await this.vinculos.buscarEntre(cuidadorId, pacienteId);
    if (existente && (existente.estado === 'PENDIENTE' || existente.estado === 'ACEPTADO')) {
      throw new ErrorDeConflicto(
        existente.estado === 'ACEPTADO'
          ? 'Ya existe un vinculo activo entre estas dos personas.'
          : 'Ya hay una solicitud pendiente de respuesta.',
      );
    }

    const vinculo = Vinculo.solicitar({
      id: this.ids.nuevo(),
      cuidadorId,
      pacienteId,
      solicitadoPor: comando.solicitante.tipo,
      parentesco: comando.parentesco ?? null,
      permisos: comando.permisos,
      ahora,
    });

    await this.vinculos.guardar(vinculo);

    if (vinculo.estado === 'PENDIENTE') {
      const cuidador = await this.cuidadores.buscarPorId(cuidadorId);
      await this.notificador.enviar({
        tipo: 'SOLICITUD_DE_VINCULO',
        destinatarioId: pacienteId,
        tipoDeDestinatario: 'PACIENTE',
        titulo: 'Nueva solicitud de acompanamiento',
        cuerpo: `${cuidador?.nombre ?? 'Un cuidador'} quiere acompanarte en tu tratamiento. Revisa la solicitud.`,
        datos: { vinculoId: vinculo.id.valor },
      });
    } else {
      await this.notificador.enviar({
        tipo: 'VINCULO_ACEPTADO',
        destinatarioId: cuidadorId,
        tipoDeDestinatario: 'CUIDADOR',
        titulo: 'Te agregaron como cuidador',
        cuerpo: 'Ya puedes hacer seguimiento al tratamiento de tu paciente.',
        datos: { vinculoId: vinculo.id.valor },
      });
    }

    return vinculo.aPlano();
  }
}
