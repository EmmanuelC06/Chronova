import { Identificador } from '../../../domain/shared/Identificador.js';
import { aMedianoche, sumarDias } from '../../../domain/shared/fechas.js';
import type { RepositorioDeMedicamentos } from '../../../domain/medicamento/RepositorioDeMedicamentos.js';
import type { EstadoDeToma, Puntualidad } from '../../../domain/toma/Toma.js';
import type { RepositorioDeTomas } from '../../../domain/toma/RepositorioDeTomas.js';
import { ResumenDeAdherencia } from '../../../domain/toma/ResumenDeAdherencia.js';
import type { Reloj } from '../../ports/Reloj.js';
import type { PoliticaDeAcceso, Solicitante } from '../../services/PoliticaDeAcceso.js';

export interface ConsultaHistorial {
  solicitante: Solicitante;
  pacienteId: string;
  /** YYYY-MM-DD. Por defecto, los ultimos 30 dias. */
  desde?: string;
  hasta?: string;
  medicamentoId?: string;
}

export interface RegistroDeHistorial {
  tomaId: string;
  medicamentoId: string;
  nombreDelMedicamento: string;
  programadaPara: string;
  estado: EstadoDeToma;
  resueltaEn: string | null;
  puntualidad: Puntualidad | null;
  minutosDeDesfase: number | null;
  registradaPor: string | null;
  observaciones: string | null;
}

export interface Historial {
  desde: string;
  hasta: string;
  registros: RegistroDeHistorial[];
  resumen: ReturnType<ResumenDeAdherencia['toJSON']>;
  /** Adherencia dia a dia, para dibujar la grafica de evolucion. */
  porDia: { fecha: string; tomadas: number; omitidas: number; porcentaje: number }[];
}

const DIAS_POR_DEFECTO = 30;

/**
 * CASO DE USO: historial de tomas y adherencia en un periodo.
 *
 * Corresponde al modulo "historial de tomas" del entregable y es lo que
 * alimenta tanto la pantalla del paciente como el panel del cuidador.
 */
export class ConsultarHistorial {
  constructor(
    private readonly tomas: RepositorioDeTomas,
    private readonly medicamentos: RepositorioDeMedicamentos,
    private readonly politica: PoliticaDeAcceso,
    private readonly reloj: Reloj,
    private readonly ventanaDeToleranciaEnMinutos: number,
  ) {}

  async ejecutar(consulta: ConsultaHistorial): Promise<Historial> {
    const pacienteId = Identificador.desde(consulta.pacienteId);
    await this.politica.asegurarAccesoAPaciente(
      consulta.solicitante,
      pacienteId,
      'puedeVerHistorial',
    );

    const ahora = this.reloj.ahora();
    const hasta = sumarDias(
      aMedianoche(consulta.hasta ? new Date(`${consulta.hasta}T00:00:00`) : ahora),
      1,
    );
    const desde = aMedianoche(
      consulta.desde
        ? new Date(`${consulta.desde}T00:00:00`)
        : sumarDias(ahora, -DIAS_POR_DEFECTO),
    );

    let tomas = await this.tomas.listarPorPacienteEnRango(pacienteId, { desde, hasta });
    if (consulta.medicamentoId) {
      const filtro = consulta.medicamentoId;
      tomas = tomas.filter((t) => t.medicamentoId.valor === filtro);
    }

    const medicamentos = await this.medicamentos.listarPorPaciente(pacienteId, true);
    const nombres = new Map(medicamentos.map((m) => [m.id.valor, m.nombre]));

    const registros: RegistroDeHistorial[] = tomas
      .map((toma) => ({
        tomaId: toma.id.valor,
        medicamentoId: toma.medicamentoId.valor,
        nombreDelMedicamento: nombres.get(toma.medicamentoId.valor) ?? 'Medicamento eliminado',
        programadaPara: toma.programadaOriginalmentePara.toISOString(),
        estado: toma.estado,
        resueltaEn: toma.resueltaEn?.toISOString() ?? null,
        puntualidad: toma.puntualidad(this.ventanaDeToleranciaEnMinutos),
        minutosDeDesfase: toma.minutosDeDesfase(),
        registradaPor: toma.origenDelRegistro,
        observaciones: toma.observaciones,
      }))
      .sort((a, b) => b.programadaPara.localeCompare(a.programadaPara));

    return {
      desde: desde.toISOString().slice(0, 10),
      hasta: sumarDias(hasta, -1).toISOString().slice(0, 10),
      registros,
      resumen: ResumenDeAdherencia.calcular(tomas, this.ventanaDeToleranciaEnMinutos).toJSON(),
      porDia: agruparPorDia(registros),
    };
  }
}

function agruparPorDia(
  registros: readonly RegistroDeHistorial[],
): { fecha: string; tomadas: number; omitidas: number; porcentaje: number }[] {
  const acumulado = new Map<string, { tomadas: number; omitidas: number }>();

  for (const registro of registros) {
    const fecha = registro.programadaPara.slice(0, 10);
    const actual = acumulado.get(fecha) ?? { tomadas: 0, omitidas: 0 };
    if (registro.estado === 'TOMADA') actual.tomadas += 1;
    else if (registro.estado === 'OMITIDA') actual.omitidas += 1;
    acumulado.set(fecha, actual);
  }

  return [...acumulado.entries()]
    .map(([fecha, { tomadas, omitidas }]) => {
      const resueltas = tomadas + omitidas;
      return {
        fecha,
        tomadas,
        omitidas,
        porcentaje: resueltas === 0 ? 0 : Math.round((tomadas / resueltas) * 1000) / 10,
      };
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}
