import { Identificador } from '../../../domain/shared/Identificador.js';
import { aMedianoche, sumarDias } from '../../../domain/shared/fechas.js';
import type { Medicamento } from '../../../domain/medicamento/Medicamento.js';
import type { RepositorioDeMedicamentos } from '../../../domain/medicamento/RepositorioDeMedicamentos.js';
import { Toma } from '../../../domain/toma/Toma.js';
import type { EstadoDeToma } from '../../../domain/toma/Toma.js';
import type { RepositorioDeTomas } from '../../../domain/toma/RepositorioDeTomas.js';
import { ResumenDeAdherencia } from '../../../domain/toma/ResumenDeAdherencia.js';
import type { GeneradorDeIds } from '../../ports/GeneradorDeIds.js';
import type { Reloj } from '../../ports/Reloj.js';
import type { PoliticaDeAcceso, Solicitante } from '../../services/PoliticaDeAcceso.js';

export interface ConsultaAgendaDelDia {
  solicitante: Solicitante;
  pacienteId: string;
  /** Fecha en formato YYYY-MM-DD. Por defecto, hoy. */
  fecha?: string;
}

export interface ElementoDeAgenda {
  tomaId: string;
  medicamentoId: string;
  nombreDelMedicamento: string;
  dosis: string;
  instrucciones: string | null;
  horaProgramada: string;
  programadaPara: string;
  estado: EstadoDeToma;
  vecesPospuesta: number;
  puedeConfirmarse: boolean;
  necesitaReabastecimiento: boolean;
}

export interface AgendaDelDia {
  fecha: string;
  elementos: ElementoDeAgenda[];
  resumen: ReturnType<ResumenDeAdherencia['toJSON']>;
}

/**
 * CASO DE USO CENTRAL: la agenda de tomas de un dia.
 *
 * Aqui esta el corazon del producto. Un medicamento define un patron
 * ("una pastilla a las 8:00 y otra a las 20:00, todos los dias"), pero
 * lo que el paciente ve y confirma son eventos concretos. Este caso de
 * uso "materializa" ese patron en tomas reales.
 *
 * La operacion es IDEMPOTENTE: si se consulta la agenda diez veces el
 * mismo dia, las tomas se crean una sola vez. Se comprueba contra la
 * hora original de cada toma, de modo que aplazar una no genera un
 * duplicado en la siguiente consulta.
 */
export class ObtenerAgendaDelDia {
  constructor(
    private readonly medicamentos: RepositorioDeMedicamentos,
    private readonly tomas: RepositorioDeTomas,
    private readonly politica: PoliticaDeAcceso,
    private readonly ids: GeneradorDeIds,
    private readonly reloj: Reloj,
    private readonly ventanaDeToleranciaEnMinutos: number,
  ) {}

  async ejecutar(consulta: ConsultaAgendaDelDia): Promise<AgendaDelDia> {
    const pacienteId = Identificador.desde(consulta.pacienteId);
    await this.politica.asegurarAccesoAPaciente(
      consulta.solicitante,
      pacienteId,
      'puedeVerHistorial',
    );

    const dia = aMedianoche(consulta.fecha ? new Date(`${consulta.fecha}T00:00:00`) : this.reloj.ahora());
    const finDelDia = sumarDias(dia, 1);

    const medicamentosActivos = await this.medicamentos.listarPorPaciente(pacienteId, false);
    const yaProgramadas = await this.tomas.listarPorPacienteEnRango(pacienteId, {
      desde: dia,
      hasta: finDelDia,
    });

    const candidatas = this.calcularTomasFaltantes(
      medicamentosActivos,
      yaProgramadas,
      dia,
      pacienteId,
    );

    // Si hubo que crear tomas, se vuelve a leer el dia completo en vez de
    // asumir que se insertaron todas. Otra peticion simultanea pudo haber
    // creado algunas primero, y en ese caso las suyas son las buenas: las
    // nuestras se descartaron y no existen en la base de datos.
    let todas = yaProgramadas;
    if (candidatas.length > 0) {
      await this.tomas.programarSiNoExisten(candidatas);
      todas = await this.tomas.listarPorPacienteEnRango(pacienteId, {
        desde: dia,
        hasta: finDelDia,
      });
    }
    const porMedicamento = new Map(medicamentosActivos.map((m) => [m.id.valor, m]));

    const elementos: ElementoDeAgenda[] = todas
      .map((toma) => {
        const medicamento = porMedicamento.get(toma.medicamentoId.valor);
        return {
          tomaId: toma.id.valor,
          medicamentoId: toma.medicamentoId.valor,
          nombreDelMedicamento: medicamento?.nombre ?? 'Medicamento suspendido',
          dosis: medicamento?.dosis.descripcion ?? '',
          instrucciones: medicamento?.instrucciones ?? null,
          horaProgramada: formatearHora(toma.programadaPara),
          programadaPara: toma.programadaPara.toISOString(),
          estado: toma.estado,
          vecesPospuesta: toma.vecesPospuesta,
          puedeConfirmarse: !toma.estaResuelta,
          necesitaReabastecimiento: medicamento?.stock.necesitaReabastecimiento ?? false,
        };
      })
      .sort((a, b) => a.programadaPara.localeCompare(b.programadaPara));

    return {
      fecha: dia.toISOString().slice(0, 10),
      elementos,
      resumen: ResumenDeAdherencia.calcular(todas, this.ventanaDeToleranciaEnMinutos).toJSON(),
    };
  }

  /**
   * Calcula que tomas del dia faltan por crear, comparando lo que exige
   * la agenda de cada medicamento con lo que ya hay guardado.
   */
  private calcularTomasFaltantes(
    medicamentos: readonly Medicamento[],
    existentes: readonly Toma[],
    dia: Date,
    pacienteId: Identificador,
  ): Toma[] {
    // Clave: medicamento + hora original. Asi una toma pospuesta sigue
    // "ocupando" su casilla y no se vuelve a generar.
    const clavesExistentes = new Set(
      existentes.map(
        (t) => `${t.medicamentoId.valor}@${t.programadaOriginalmentePara.toISOString()}`,
      ),
    );

    const nuevas: Toma[] = [];

    for (const medicamento of medicamentos) {
      for (const hora of medicamento.horariosDelDia(dia)) {
        const instante = hora.enLaFecha(dia);
        const clave = `${medicamento.id.valor}@${instante.toISOString()}`;
        if (clavesExistentes.has(clave)) continue;

        nuevas.push(
          Toma.programar({
            id: this.ids.nuevo(),
            medicamentoId: medicamento.id,
            pacienteId,
            programadaPara: instante,
          }),
        );
        clavesExistentes.add(clave);
      }
    }

    return nuevas;
  }
}

function formatearHora(fecha: Date): string {
  return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
}
