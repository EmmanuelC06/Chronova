import { FechaLocal } from '../../../domain/shared/FechaLocal.js';
import { Identificador } from '../../../domain/shared/Identificador.js';
import { ErrorNoEncontrado } from '../../../domain/shared/errores.js';
import type { ZonaHoraria } from '../../../domain/shared/ZonaHoraria.js';
import type { RepositorioDeMedicamentos } from '../../../domain/medicamento/RepositorioDeMedicamentos.js';
import type { RepositorioDePacientes } from '../../../domain/paciente/RepositorioDePacientes.js';
import type { EstadoDeToma, Puntualidad, Toma } from '../../../domain/toma/Toma.js';
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
  /** Zona en la que estan expresadas las fechas de este historial. */
  zonaHoraria: string;
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
    private readonly pacientes: RepositorioDePacientes,
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

    const paciente = await this.pacientes.buscarPorId(pacienteId);
    if (!paciente) throw new ErrorNoEncontrado('el paciente', consulta.pacienteId);

    const zona = paciente.zonaHoraria;
    const hoy = zona.fechaLocalDe(this.reloj.ahora());

    // El periodo se define en dias del calendario del paciente y solo
    // despues se traduce a instantes para consultar la base de datos.
    const diaFinal = consulta.hasta ? FechaLocal.desde(consulta.hasta) : hoy;
    const diaInicial = consulta.desde
      ? FechaLocal.desde(consulta.desde)
      : hoy.sumarDias(-DIAS_POR_DEFECTO);

    const rango = {
      desde: zona.inicioDelDia(diaInicial),
      hasta: zona.inicioDelDia(diaFinal.sumarDias(1)),
    };

    let tomas = await this.tomas.listarPorPacienteEnRango(pacienteId, rango);
    if (consulta.medicamentoId) {
      // Pasa por `Identificador` en vez de compararse en crudo, y no es
      // ceremonia: ese constructor NORMALIZA a minusculas. Comparando el
      // texto tal como llego, un UUID escrito en mayusculas —una forma
      // perfectamente valida— no coincidia con nada y la respuesta era un
      // 200 con la lista vacia. El peor tipo de fallo: sin error, y el
      // paciente leyendo que no se tomo ninguna dosis de ese medicamento.
      const filtro = Identificador.desde(consulta.medicamentoId);
      tomas = tomas.filter((t) => t.medicamentoId.valor === filtro.valor);
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
      desde: diaInicial.toString(),
      hasta: diaFinal.toString(),
      zonaHoraria: zona.valor,
      registros,
      resumen: ResumenDeAdherencia.calcular(tomas, this.ventanaDeToleranciaEnMinutos).toJSON(),
      porDia: agruparPorDia(tomas, zona),
    };
  }
}

/**
 * Agrupa las tomas por dia del calendario DEL PACIENTE.
 *
 * Antes se cortaba la cadena ISO por los primeros diez caracteres, que
 * es el dia en UTC. Para una paciente en Colombia, su toma de las 20:00
 * cae a la 01:00 UTC del dia siguiente, asi que aparecia contada en el
 * dia equivocado y la grafica de adherencia mentia.
 */
function agruparPorDia(
  tomas: readonly Toma[],
  zona: ZonaHoraria,
): { fecha: string; tomadas: number; omitidas: number; porcentaje: number }[] {
  const acumulado = new Map<string, { tomadas: number; omitidas: number }>();

  for (const toma of tomas) {
    const fecha = zona.fechaLocalDe(toma.programadaOriginalmentePara).toString();
    const actual = acumulado.get(fecha) ?? { tomadas: 0, omitidas: 0 };
    if (toma.estado === 'TOMADA') actual.tomadas += 1;
    else if (toma.estado === 'OMITIDA') actual.omitidas += 1;
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
