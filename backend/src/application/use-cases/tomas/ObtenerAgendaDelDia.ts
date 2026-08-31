import { FechaLocal } from '../../../domain/shared/FechaLocal.js';
import { Identificador } from '../../../domain/shared/Identificador.js';
import { ErrorNoEncontrado } from '../../../domain/shared/errores.js';
import type { ZonaHoraria } from '../../../domain/shared/ZonaHoraria.js';
import type { Medicamento } from '../../../domain/medicamento/Medicamento.js';
import type { RepositorioDeMedicamentos } from '../../../domain/medicamento/RepositorioDeMedicamentos.js';
import type { RepositorioDePacientes } from '../../../domain/paciente/RepositorioDePacientes.js';
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
  /** Fecha en formato YYYY-MM-DD. Por defecto, hoy en la zona del paciente. */
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
  /** Zona en la que estan expresadas las horas de esta agenda. */
  zonaHoraria: string;
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
 * Todo el razonamiento de calendario ocurre en la ZONA DEL PACIENTE:
 * que dia es hoy, que horarios tocan, y en que instante exacto cae cada
 * uno. "Las 8 de la manana" son las 8 donde vive el paciente, no donde
 * este el servidor. Sin esto, un servidor en UTC programaba la pastilla
 * de las 8:00 de una paciente colombiana a las 3:00 de la madrugada.
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
    private readonly pacientes: RepositorioDePacientes,
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

    const paciente = await this.pacientes.buscarPorId(pacienteId);
    if (!paciente) throw new ErrorNoEncontrado('el paciente', consulta.pacienteId);

    const zona = paciente.zonaHoraria;
    const dia = consulta.fecha
      ? FechaLocal.desde(consulta.fecha)
      : zona.fechaLocalDe(this.reloj.ahora());

    // El dia del paciente, convertido a instantes, para acotar la consulta.
    const rango = {
      desde: zona.inicioDelDia(dia),
      hasta: zona.inicioDelDia(dia.sumarDias(1)),
    };

    const medicamentosActivos = await this.medicamentos.listarPorPaciente(pacienteId, false);
    const yaProgramadas = await this.tomas.listarPorPacienteEnRango(pacienteId, rango);

    const candidatas = this.calcularTomasFaltantes(
      medicamentosActivos,
      yaProgramadas,
      dia,
      zona,
      pacienteId,
    );

    // Si hubo que crear tomas, se vuelve a leer el dia completo en vez de
    // asumir que se insertaron todas. Otra peticion simultanea pudo haber
    // creado algunas primero, y en ese caso las suyas son las buenas: las
    // nuestras se descartaron y no existen en la base de datos.
    let todas = yaProgramadas;
    if (candidatas.length > 0) {
      await this.tomas.programarSiNoExisten(candidatas);
      todas = await this.tomas.listarPorPacienteEnRango(pacienteId, rango);
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
          // La hora se devuelve tal como la vera el paciente.
          horaProgramada: zona.horaDePareDe(toma.programadaPara),
          programadaPara: toma.programadaPara.toISOString(),
          estado: toma.estado,
          vecesPospuesta: toma.vecesPospuesta,
          puedeConfirmarse: !toma.estaResuelta,
          necesitaReabastecimiento: medicamento?.stock.necesitaReabastecimiento ?? false,
        };
      })
      .sort((a, b) => a.programadaPara.localeCompare(b.programadaPara));

    return {
      fecha: dia.toString(),
      zonaHoraria: zona.valor,
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
    dia: FechaLocal,
    zona: ZonaHoraria,
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
        // Aqui ocurre la traduccion: "08:00 del 1 de septiembre, en
        // America/Bogota" se convierte en el instante 13:00 UTC.
        const instante = zona.instanteDe(dia, hora);
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
