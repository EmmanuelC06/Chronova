import { Identificador } from '../../../domain/shared/Identificador.js';
import { ErrorNoEncontrado } from '../../../domain/shared/errores.js';
import { TemasDeInteres } from '../../../domain/paciente/TemasDeInteres.js';
import type { Tema } from '../../../domain/paciente/TemasDeInteres.js';
import type { RepositorioDePacientes } from '../../../domain/paciente/RepositorioDePacientes.js';

export interface ComandoActualizarTemasDeInteres {
  pacienteId: string;
  /** La lista COMPLETA de lo que queda marcado, no un añadir ni un quitar. */
  temas: readonly unknown[];
}

/**
 * CASO DE USO: cambiar los temas sobre los que el paciente quiere leer.
 *
 * Por que es un caso de uso aparte de ActualizarPreferencias
 * ---------------------------------------------------------
 * Porque aquel sirve a los dos tipos de cuenta y este solo al paciente.
 * Las preferencias de accesibilidad son de cualquiera que mire una
 * pantalla —el cuidador suele ser el de mas edad de los dos—, pero
 * elegir temas solo tiene sentido para quien se toma la medicina. Meter
 * el campo en el otro caso de uso obligaria a que la rama del cuidador
 * lo ignorara en silencio, que es la clase de detalle que luego nadie
 * recuerda.
 *
 * Por que lo cambia SOLO el propio paciente
 * -----------------------------------------
 * No hay parametro de solicitante ni comprobacion de vinculo: la ruta
 * exige sesion de paciente y actua sobre quien la tiene. Un cuidador no
 * puede elegir por el, ni con permiso de gestionar medicamentos. Decidir
 * sobre que quiere leer alguien no es una tarea de cuidado, y el reporte
 * dice "marco que le interesa": si lo hubiera marcado otro, esa frase
 * seria mentira.
 */
export class ActualizarTemasDeInteres {
  constructor(private readonly pacientes: RepositorioDePacientes) {}

  async ejecutar(comando: ComandoActualizarTemasDeInteres): Promise<{ temasDeInteres: Tema[] }> {
    const paciente = await this.pacientes.buscarPorId(
      Identificador.desde(comando.pacienteId),
    );
    if (!paciente) throw new ErrorNoEncontrado('el paciente', comando.pacienteId);

    const temas = TemasDeInteres.desde(comando.temas);
    paciente.cambiarTemasDeInteres(temas);
    await this.pacientes.guardar(paciente);

    return { temasDeInteres: temas.toJSON() };
  }
}
