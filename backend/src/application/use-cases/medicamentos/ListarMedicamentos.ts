import { Identificador } from '../../../domain/shared/Identificador.js';
import type { MedicamentoPlano } from '../../../domain/medicamento/Medicamento.js';
import type { RepositorioDeMedicamentos } from '../../../domain/medicamento/RepositorioDeMedicamentos.js';
import type { PoliticaDeAcceso, Solicitante } from '../../services/PoliticaDeAcceso.js';

export interface ConsultaListarMedicamentos {
  solicitante: Solicitante;
  pacienteId: string;
  incluirSuspendidos?: boolean;
}

export interface MedicamentoListado extends MedicamentoPlano {
  descripcionDeDosis: string;
  descripcionDeFrecuencia: string;
  necesitaReabastecimiento: boolean;
}

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

    // Se agregan campos ya "masticados" para que la app movil no tenga
    // que recalcular textos ni reglas: la interfaz solo pinta.
    return lista.map((medicamento) => ({
      ...medicamento.aPlano(),
      descripcionDeDosis: medicamento.dosis.descripcion,
      descripcionDeFrecuencia: medicamento.frecuencia.descripcion,
      necesitaReabastecimiento: medicamento.stock.necesitaReabastecimiento,
    }));
  }
}
