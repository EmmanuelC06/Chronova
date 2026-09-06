import { Identificador } from '../../../domain/shared/Identificador.js';
import { ErrorNoEncontrado } from '../../../domain/shared/errores.js';
import { PreferenciasDeAccesibilidad } from '../../../domain/shared/PreferenciasDeAccesibilidad.js';
import type { RepositorioDePacientes } from '../../../domain/paciente/RepositorioDePacientes.js';
import type { RepositorioDeCuidadores } from '../../../domain/cuidador/RepositorioDeCuidadores.js';

export interface ComandoActualizarPreferencias {
  usuarioId: string;
  tipoDeCuenta: 'PACIENTE' | 'CUIDADOR';
  tamanoDeLetra?: string;
  altoContraste?: boolean;
  alertasSonoras?: boolean;
  alertasVibracion?: boolean;
  minutosDeGracia?: number;
}

/**
 * CASO DE USO: cambiar las preferencias de accesibilidad de quien tiene
 * la sesion abierta, sea paciente o cuidador.
 *
 * Se aplican de inmediato en cualquier dispositivo, porque viven en el
 * servidor y no en la memoria del telefono. Es deliberado: si alguien
 * necesita la letra al 145% para leer, la necesita tambien el dia que
 * cambie de aparato, y esa es exactamente la persona a la que menos se
 * le puede pedir que vuelva a buscar el ajuste.
 *
 * El caso de uso atiende a los dos tipos de cuenta porque las
 * preferencias no son una necesidad del paciente sino de cualquiera que
 * mire la pantalla; el cuidador es a menudo el de mas edad de los dos.
 * Lo que cambia entre uno y otro es solo en que repositorio se busca.
 */
export class ActualizarPreferencias {
  constructor(
    private readonly pacientes: RepositorioDePacientes,
    private readonly cuidadores: RepositorioDeCuidadores,
  ) {}

  async ejecutar(comando: ComandoActualizarPreferencias): Promise<Record<string, unknown>> {
    const id = Identificador.desde(comando.usuarioId);

    // Las dos ramas se escriben enteras a proposito. Unificarlas obliga
    // a un tipo comun que ninguna de las dos entidades tiene, y el
    // ahorro serian cuatro lineas a cambio de una conversion de tipos
    // que apagaria justo la comprobacion que aqui interesa.
    if (comando.tipoDeCuenta === 'PACIENTE') {
      const paciente = await this.pacientes.buscarPorId(id);
      if (!paciente) throw new ErrorNoEncontrado('el paciente', comando.usuarioId);

      const nuevas = combinar(paciente.preferencias, comando);
      paciente.cambiarPreferencias(nuevas);
      await this.pacientes.guardar(paciente);
      return nuevas.toJSON();
    }

    const cuidador = await this.cuidadores.buscarPorId(id);
    if (!cuidador) throw new ErrorNoEncontrado('el cuidador', comando.usuarioId);

    const nuevas = combinar(cuidador.preferencias, comando);
    cuidador.cambiarPreferencias(nuevas);
    await this.cuidadores.guardar(cuidador);
    return nuevas.toJSON();
  }
}

/**
 * Aplica sobre las preferencias actuales solo los campos que llegaron.
 *
 * La peticion es parcial —la pantalla manda `{ tamanoDeLetra }` y nada
 * mas—, asi que lo que no viene se conserva. Si se construyeran las
 * nuevas preferencias solo con lo recibido, cambiar el tamano de letra
 * apagaria de paso el sonido de las alarmas.
 */
function combinar(
  actuales: PreferenciasDeAccesibilidad,
  cambios: ComandoActualizarPreferencias,
): PreferenciasDeAccesibilidad {
  const base = actuales.toJSON();
  return PreferenciasDeAccesibilidad.desde({
    tamanoDeLetra: cambios.tamanoDeLetra ?? base.tamanoDeLetra,
    altoContraste: cambios.altoContraste ?? base.altoContraste,
    alertasSonoras: cambios.alertasSonoras ?? base.alertasSonoras,
    alertasVibracion: cambios.alertasVibracion ?? base.alertasVibracion,
    minutosDeGracia: cambios.minutosDeGracia ?? base.minutosDeGracia,
  });
}
