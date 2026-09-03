import { Identificador } from '../../../domain/shared/Identificador.js';
import { ErrorNoEncontrado } from '../../../domain/shared/errores.js';
import type { RepositorioDeMedicamentos } from '../../../domain/medicamento/RepositorioDeMedicamentos.js';
import type { RepositorioDeTomas } from '../../../domain/toma/RepositorioDeTomas.js';
import type { Reloj } from '../../ports/Reloj.js';
import type { PoliticaDeAcceso, Solicitante } from '../../services/PoliticaDeAcceso.js';

export interface ComandoSuspenderMedicamento {
  solicitante: Solicitante;
  medicamentoId: string;
}

/**
 * CASO DE USO: suspender un medicamento.
 *
 * No se borra el registro: se marca como inactivo para conservar el
 * historial de tomas, que es la evidencia del tratamiento. Lo que si se
 * limpia son las tomas futuras que aun estaban pendientes, para que no
 * sigan sonando alarmas de algo que el medico ya suspendio.
 *
 * Esas tomas se RETIRAN, no se marcan como omitidas. Marcarlas omitidas
 * las contaba como incumplimientos: un paciente al que le suspendian el
 * tratamiento por la manana terminaba el dia con 0% de adherencia, en
 * cabeza del panel de su cuidador y con dos faltas falsas en su
 * historial clinico, por haber hecho exactamente lo que le mandaron.
 */
export class SuspenderMedicamento {
  constructor(
    private readonly medicamentos: RepositorioDeMedicamentos,
    private readonly tomas: RepositorioDeTomas,
    private readonly politica: PoliticaDeAcceso,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(comando: ComandoSuspenderMedicamento): Promise<{ suspendido: true }> {
    const medicamentoId = Identificador.desde(comando.medicamentoId);
    const medicamento = await this.medicamentos.buscarPorId(medicamentoId);
    if (!medicamento) throw new ErrorNoEncontrado('el medicamento', comando.medicamentoId);

    await this.politica.asegurarAccesoAPaciente(
      comando.solicitante,
      medicamento.pacienteId,
      'puedeGestionarMedicamentos',
    );

    medicamento.suspender();
    await this.medicamentos.guardar(medicamento);

    // Se retiran solo las tomas futuras aun sin resolver. Lo ya ocurrido
    // es historial clinico y no se toca.
    await this.tomas.eliminarPendientesDesde(medicamentoId, this.reloj.ahora());

    return { suspendido: true };
  }
}
