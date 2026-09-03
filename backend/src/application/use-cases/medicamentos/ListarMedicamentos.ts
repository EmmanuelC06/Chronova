import { Identificador } from '../../../domain/shared/Identificador.js';
import type { RepositorioDeMedicamentos } from '../../../domain/medicamento/RepositorioDeMedicamentos.js';
import { aVistaDeMedicamento } from './vistaDeMedicamento.js';
import type { MedicamentoListado } from './vistaDeMedicamento.js';
import type { PoliticaDeAcceso, Solicitante } from '../../services/PoliticaDeAcceso.js';

export interface ConsultaListarMedicamentos {
  solicitante: Solicitante;
  pacienteId: string;
  incluirSuspendidos?: boolean;
}

export type { MedicamentoListado } from './vistaDeMedicamento.js';

/** CASO DE USO: listar los medicamentos de un paciente. */
export class ListarMedicamentos {
  constructor(
    private readonly medicamentos: RepositorioDeMedicamentos,
    private readonly politica: PoliticaDeAcceso,
  ) {}

  async ejecutar(consulta: ConsultaListarMedicamentos): Promise<MedicamentoListado[]> {
    const pacienteId = Identificador.desde(consulta.pacienteId);
    await this.politica.asegurarAccesoAPaciente(
      consulta.solicitante,
      pacienteId,
      'puedeVerHistorial',
    );

    const lista = await this.medicamentos.listarPorPaciente(
      pacienteId,
      consulta.incluirSuspendidos ?? false,
    );

    return lista.map(aVistaDeMedicamento);
  }
}
