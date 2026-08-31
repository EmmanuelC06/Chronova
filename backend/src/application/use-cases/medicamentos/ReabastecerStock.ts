import { Identificador } from '../../../domain/shared/Identificador.js';
import { ErrorNoEncontrado } from '../../../domain/shared/errores.js';
import type { MedicamentoPlano } from '../../../domain/medicamento/Medicamento.js';
import type { RepositorioDeMedicamentos } from '../../../domain/medicamento/RepositorioDeMedicamentos.js';
import type { PoliticaDeAcceso, Solicitante } from '../../services/PoliticaDeAcceso.js';

export interface ComandoReabastecerStock {
  solicitante: Solicitante;
  medicamentoId: string;
  unidades: number;
  /** Opcional: aprovechar para ajustar a partir de cuando avisar. */
  nuevoUmbralDeAlerta?: number;
}

/**
 * CASO DE USO: registrar que el paciente compro mas medicamento.
 *
 * Responde al modulo "stock de medicamentos" del entregable: ayuda a
 * controlar la disponibilidad y a prevenir que el tratamiento se
 * interrumpa porque se acabaron las pastillas un domingo.
 */
export class ReabastecerStock {
  constructor(
    private readonly medicamentos: RepositorioDeMedicamentos,
    private readonly politica: PoliticaDeAcceso,
  ) {}

  async ejecutar(comando: ComandoReabastecerStock): Promise<MedicamentoPlano> {
    const medicamento = await this.medicamentos.buscarPorId(
      Identificador.desde(comando.medicamentoId),
    );
    if (!medicamento) throw new ErrorNoEncontrado('el medicamento', comando.medicamentoId);

    await this.politica.asegurarAccesoAPaciente(
      comando.solicitante,
      medicamento.pacienteId,
      'puedeGestionarMedicamentos',
    );

    medicamento.reabastecer(comando.unidades);
    if (comando.nuevoUmbralDeAlerta !== undefined) {
      medicamento.definirUmbralDeAlerta(comando.nuevoUmbralDeAlerta);
    }

    await this.medicamentos.guardar(medicamento);
    return medicamento.aPlano();
  }
}
