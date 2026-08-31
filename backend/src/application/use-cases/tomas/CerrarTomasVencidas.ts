import { Identificador } from '../../../domain/shared/Identificador.js';
import type { RepositorioDePacientes } from '../../../domain/paciente/RepositorioDePacientes.js';
import type { RepositorioDeTomas } from '../../../domain/toma/RepositorioDeTomas.js';
import type { RepositorioDeVinculos } from '../../../domain/vinculo/RepositorioDeVinculos.js';
import type { Notificador } from '../../ports/Notificador.js';
import type { Reloj } from '../../ports/Reloj.js';

export interface ResultadoDelCierre {
  tomasCerradas: number;
  avisosEnviados: number;
}

/**
 * CASO DE USO de sistema: cerrar las tomas que nadie respondio.
 *
 * Es la pieza que convierte el olvido en informacion. Sin ella, una
 * toma no confirmada se quedaria "pendiente" para siempre y no contaria
 * como incumplimiento, con lo cual la adherencia se veria siempre
 * perfecta y el cuidador nunca se enteraria de nada.
 *
 * Se ejecuta periodicamente (cada 15 minutos) desde un programador de
 * tareas, que es un detalle de infraestructura: este caso de uso no sabe
 * quien lo llama.
 *
 * Cada paciente define su propio margen de espera en sus preferencias
 * (minutosDeGracia), porque no es lo mismo un anticoagulante estricto
 * que una vitamina.
 */
export class CerrarTomasVencidas {
  constructor(
    private readonly tomas: RepositorioDeTomas,
    private readonly pacientes: RepositorioDePacientes,
    private readonly vinculos: RepositorioDeVinculos,
    private readonly notificador: Notificador,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(): Promise<ResultadoDelCierre> {
    const ahora = this.reloj.ahora();

    // Se piden las tomas sin resolver de las ultimas horas. El margen
    // maximo posible son 12 horas (720 minutos de gracia).
    const limite = new Date(ahora.getTime() - 15 * 60_000);
    const candidatas = await this.tomas.listarVencidas(limite);

    let tomasCerradas = 0;
    let avisosEnviados = 0;

    // Se agrupa por paciente para no consultar sus preferencias N veces.
    const porPaciente = new Map<string, typeof candidatas>();
    for (const toma of candidatas) {
      const lista = porPaciente.get(toma.pacienteId.valor) ?? [];
      lista.push(toma);
      porPaciente.set(toma.pacienteId.valor, lista);
    }

    for (const [pacienteIdTexto, tomasDelPaciente] of porPaciente) {
      const pacienteId = Identificador.desde(pacienteIdTexto);
      const paciente = await this.pacientes.buscarPorId(pacienteId);
      if (!paciente) continue;

      const minutosDeGracia = paciente.preferencias.minutosDeGracia;
      const vencidas = tomasDelPaciente.filter((t) => t.estaVencidaEn(ahora, minutosDeGracia));
      if (vencidas.length === 0) continue;

      for (const toma of vencidas) {
        toma.cerrarPorFaltaDeRespuesta(ahora);
        tomasCerradas += 1;
      }
      await this.tomas.guardarVarias(vencidas);

      avisosEnviados += await this.avisarALosCuidadores(pacienteId, paciente.nombre, vencidas.length);
    }

    return { tomasCerradas, avisosEnviados };
  }

  private async avisarALosCuidadores(
    pacienteId: Identificador,
    nombreDelPaciente: string,
    cantidad: number,
  ): Promise<number> {
    const vinculos = await this.vinculos.listarPorPaciente(pacienteId);
    let enviados = 0;

    for (const vinculo of vinculos) {
      if (!vinculo.autorizar('recibeAlertas')) continue;

      await this.notificador.enviar({
        tipo: 'TOMA_PERDIDA',
        destinatarioId: vinculo.cuidadorId,
        tipoDeDestinatario: 'CUIDADOR',
        titulo: 'Toma sin confirmar',
        cuerpo:
          cantidad === 1
            ? `${nombreDelPaciente} no confirmo una toma de su tratamiento.`
            : `${nombreDelPaciente} no confirmo ${cantidad} tomas de su tratamiento.`,
        datos: { pacienteId: pacienteId.valor, cantidad },
      });
      enviados += 1;
    }

    return enviados;
  }
}
