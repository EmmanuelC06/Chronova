import { Hora } from '../../../domain/shared/Hora.js';
import { FechaLocal } from '../../../domain/shared/FechaLocal.js';
import { Identificador } from '../../../domain/shared/Identificador.js';
import { ErrorNoEncontrado } from '../../../domain/shared/errores.js';
import { Dosis } from '../../../domain/medicamento/Dosis.js';
import type { RepositorioDeMedicamentos } from '../../../domain/medicamento/RepositorioDeMedicamentos.js';
import { aVistaDeMedicamento } from './vistaDeMedicamento.js';
import type { MedicamentoListado } from './vistaDeMedicamento.js';
import type { RepositorioDeTomas } from '../../../domain/toma/RepositorioDeTomas.js';
import type { Reloj } from '../../ports/Reloj.js';
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

/**
 * CASO DE USO: modificar un medicamento existente.
 *
 * Cuando cambia CUANDO se toma —los horarios, la frecuencia o la fecha
 * de fin— hay que retirar las tomas futuras que ya se habian generado
 * con la definicion anterior. La agenda las vuelve a crear a partir de
 * la nueva la proxima vez que alguien la consulte.
 *
 * Sin esto, mover una toma de las 08:00 a las 09:00 dejaba las dos: el
 * paciente cumplia su tratamiento entero y terminaba el dia con dos
 * tercios de adherencia y un aviso de "toma perdida" enviado a su
 * cuidador por una toma que el mismo habia cancelado.
 */
export class ActualizarMedicamento {
  constructor(
    private readonly medicamentos: RepositorioDeMedicamentos,
    private readonly tomas: RepositorioDeTomas,
    private readonly politica: PoliticaDeAcceso,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(comando: ComandoActualizarMedicamento): Promise<MedicamentoListado> {
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
            : FechaLocal.desde(comando.fechaFin),
      instrucciones: comando.instrucciones,
    });

    await this.medicamentos.guardar(medicamento);

    // Cambiar el nombre o las instrucciones no altera la agenda; cambiar
    // cuando se toma, si.
    const cambiaElCalendario =
      comando.horarios !== undefined ||
      comando.frecuencia !== undefined ||
      comando.fechaFin !== undefined;

    if (cambiaElCalendario) {
      // El corte es AHORA, no el principio del dia, y es deliberado: una
      // toma de esta manana que nadie confirmo es un hecho clinico real
      // —el paciente no se la tomo— y no desaparece porque por la tarde
      // se reorganice el horario. Solo se retira lo que todavia no habia
      // llegado a ocurrir.
      await this.tomas.eliminarPendientesDesde(medicamento.id, this.reloj.ahora());
    }

    return aVistaDeMedicamento(medicamento);
  }
}
