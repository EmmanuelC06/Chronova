import { Identificador } from '../../../domain/shared/Identificador.js';
import { ErrorNoEncontrado } from '../../../domain/shared/errores.js';
import { PreferenciasDeAccesibilidad } from '../../../domain/paciente/PreferenciasDeAccesibilidad.js';
import type { RepositorioDePacientes } from '../../../domain/paciente/RepositorioDePacientes.js';

export interface ComandoActualizarPreferencias {
  pacienteId: string;
  tamanoDeLetra?: string;
  altoContraste?: boolean;
  alertasSonoras?: boolean;
  alertasVibracion?: boolean;
  minutosDeGracia?: number;
}

/**
 * CASO DE USO: cambiar las preferencias de accesibilidad del paciente.
 *
 * Se aplican de inmediato en cualquier dispositivo, porque viven en el
 * servidor y no en la memoria del telefono.
 */
export class ActualizarPreferencias {
  constructor(private readonly pacientes: RepositorioDePacientes) {}

  async ejecutar(comando: ComandoActualizarPreferencias): Promise<Record<string, unknown>> {
    const paciente = await this.pacientes.buscarPorId(Identificador.desde(comando.pacienteId));
    if (!paciente) throw new ErrorNoEncontrado('el paciente', comando.pacienteId);

    const actuales = paciente.preferencias.toJSON();
    const nuevas = PreferenciasDeAccesibilidad.desde({
      tamanoDeLetra: comando.tamanoDeLetra ?? actuales.tamanoDeLetra,
      altoContraste: comando.altoContraste ?? actuales.altoContraste,
      alertasSonoras: comando.alertasSonoras ?? actuales.alertasSonoras,
      alertasVibracion: comando.alertasVibracion ?? actuales.alertasVibracion,
      minutosDeGracia: comando.minutosDeGracia ?? actuales.minutosDeGracia,
    });

    paciente.cambiarPreferencias(nuevas);
    await this.pacientes.guardar(paciente);

    return nuevas.toJSON();
  }
}
