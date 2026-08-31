import { Identificador } from '../../../domain/shared/Identificador.js';
import { ErrorDeAutorizacion, ErrorNoEncontrado } from '../../../domain/shared/errores.js';
import type { RepositorioDeVinculos } from '../../../domain/vinculo/RepositorioDeVinculos.js';
import type { PermisosDelCuidador, VinculoPlano } from '../../../domain/vinculo/Vinculo.js';
import type { Solicitante } from '../../services/PoliticaDeAcceso.js';

export interface ComandoCambiarPermisos {
  solicitante: Solicitante;
  vinculoId: string;
  permisos: Partial<PermisosDelCuidador>;
}

/**
 * CASO DE USO: el paciente ajusta que puede hacer cada cuidador.
 *
 * Por ejemplo: dejar que su hija vea el historial pero no modifique los
 * medicamentos que le formulo el medico.
 */
export class CambiarPermisosDelVinculo {
  constructor(private readonly vinculos: RepositorioDeVinculos) {}

  async ejecutar(comando: ComandoCambiarPermisos): Promise<VinculoPlano> {
    const vinculo = await this.vinculos.buscarPorId(Identificador.desde(comando.vinculoId));
    if (!vinculo) throw new ErrorNoEncontrado('el vinculo', comando.vinculoId);

    if (
      comando.solicitante.tipo !== 'PACIENTE' ||
      !vinculo.pacienteId.esIgualA(comando.solicitante.id)
    ) {
      throw new ErrorDeAutorizacion('Solo el paciente puede cambiar los permisos de sus cuidadores.');
    }

    vinculo.cambiarPermisos(comando.permisos);
    await this.vinculos.guardar(vinculo);
    return vinculo.aPlano();
  }
}
