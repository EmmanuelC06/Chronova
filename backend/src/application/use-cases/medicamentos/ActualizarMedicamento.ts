import { Hora } from '../../../domain/shared/Hora.js';
import { Identificador } from '../../../domain/shared/Identificador.js';
import { ErrorNoEncontrado } from '../../../domain/shared/errores.js';
import { Dosis } from '../../../domain/medicamento/Dosis.js';
import type { MedicamentoPlano } from '../../../domain/medicamento/Medicamento.js';
import type { RepositorioDeMedicamentos } from '../../../domain/medicamento/RepositorioDeMedicamentos.js';
import type { PoliticaDeAcceso, Solicitante } from '../../services/PoliticaDeAcceso.js';
import { construirFrecuencia } from './RegistrarMedicamento.js';

export interface ComandoActualizarMedicamento {
  solicitante: Solicitante;
  medicamentoId: string;
  nombre?: string;
  dosis?: { cantidad: number; unidad: string };
  frecuencia?: {
    tipo: 'DIARIA' | 'DIAS_DE_LA_SEMANA' | 'CADA_N_DIAS';
    diasDeLaSemana?: number[];
    intervaloEnDias?: number;
  };
  horarios?: string[];
  fechaFin?: string | null;
  instrucciones?: string | null;
}

/** CASO DE USO: modificar un medicamento existente. */
export class ActualizarMedicamento {
  constructor(
    private readonly medicamentos: RepositorioDeMedicamentos,
    private readonly politica: PoliticaDeAcceso,
  ) {}

  async ejecutar(comando: ComandoActualizarMedicamento): Promise<MedicamentoPlano> {
    const medicamento = await this.medicamentos.buscarPorId(
      Identificador.desde(comando.medicamentoId),
    );
    if (!medicamento) throw new ErrorNoEncontrado('el medicamento', comando.medicamentoId);

    await this.politica.asegurarAccesoAPaciente(
      comando.solicitante,
      medicamento.pacienteId,
      'puedeGestionarMedicamentos',
    );

    medicamento.actualizar({
      nombre: comando.nombre,
      dosis: comando.dosis ? Dosis.desde(comando.dosis.cantidad, comando.dosis.unidad) : undefined,
      frecuencia: comando.frecuencia ? construirFrecuencia(comando.frecuencia) : undefined,
      horarios: comando.horarios ? comando.horarios.map((h) => Hora.desde(h)) : undefined,
      fechaFin:
        comando.fechaFin === undefined
          ? undefined
          : comando.fechaFin === null
            ? null
            : new Date(comando.fechaFin),
      instrucciones: comando.instrucciones,
    });

    await this.medicamentos.guardar(medicamento);
    return medicamento.aPlano();
  }
}
