import { FechaLocal } from '../../../domain/shared/FechaLocal.js';
import { Identificador } from '../../../domain/shared/Identificador.js';
import { ErrorNoEncontrado } from '../../../domain/shared/errores.js';
import type { RepositorioDePacientes } from '../../../domain/paciente/RepositorioDePacientes.js';
import type { RepositorioDeTomas } from '../../../domain/toma/RepositorioDeTomas.js';
import { Curiosidades } from '../../../domain/toma/Curiosidades.js';
import { MapaDeRiesgo } from '../../../domain/toma/MapaDeRiesgo.js';
import { ResumenDeAdherencia } from '../../../domain/toma/ResumenDeAdherencia.js';
import type { Reloj } from '../../ports/Reloj.js';
import type { PoliticaDeAcceso, Solicitante } from '../../services/PoliticaDeAcceso.js';

export interface ConsultaDeAnalitica {
  solicitante: Solicitante;
  pacienteId: string;
  /** YYYY-MM-DD. Por defecto, los ultimos 90 dias. */
  desde?: string;
  hasta?: string;
}

export interface Analitica {
  desde: string;
  hasta: string;
  zonaHoraria: string;
  resumen: ReturnType<ResumenDeAdherencia['toJSON']>;
  mapaDeRiesgo: ReturnType<MapaDeRiesgo['toJSON']>;
  curiosidades: ReturnType<Curiosidades['toJSON']>;
  /** Cuantos datos sostienen esto, para que la app pueda ser honesta. */
  evidencia: {
    tomasResueltas: number;
    suficienteParaElMapa: boolean;
  };
}

/**
 * Noventa dias y no treinta.
 *
 * El historial usa treinta porque responde a "¿como voy este mes?". El
 * mapa de riesgo responde a otra pregunta, "¿cuando fallo yo?", y esa
 * necesita repeticiones del mismo dia de la semana. Con treinta dias hay
 * cuatro lunes; con noventa hay trece, que ya permite distinguir un
 * patron de una mala racha.
 */
const DIAS_POR_DEFECTO = 90;

/**
 * Por debajo de esto, el mapa se calcula pero la app avisa de que
 * todavia no hay suficiente historia. Son unas tres semanas de un
 * tratamiento de dos tomas diarias.
 */
const MINIMO_PARA_EL_MAPA = 40;

/**
 * CASO DE USO: analitica de adherencia.
 *
 * Reune las tres cosas que la pantalla necesita: el resumen que ya
 * existia, el mapa de riesgo por franja y las curiosidades. Van juntas
 * en una sola peticion a proposito, porque las tres salen exactamente
 * del mismo conjunto de tomas y partirlas en tres rutas significaria
 * leer la base de datos tres veces para lo mismo.
 *
 * Que este caso de uso NO hace, y conviene que siga siendo asi:
 * no recomienda cambios de tratamiento, no interpreta los numeros en
 * clave clinica y no afirma nada sobre la enfermedad de nadie. Describe
 * la conducta de una persona con sus propios registros. Esa frontera es
 * la que mantiene a Chronova fuera del regimen de dispositivos medicos
 * del Decreto 4725 de 2005, que clasifica el software por su finalidad
 * prevista.
 *
 * El permiso que exige es el mismo del historial, `puedeVerHistorial`:
 * no se inventa una categoria nueva para que el paciente no tenga que
 * entender dos permisos donde hay una sola idea. Si autorizo a su hija a
 * ver su historial, la analitica de ese historial va incluida; si no, no
 * hay nada que mostrar.
 */
export class ObtenerAnalitica {
  constructor(
    private readonly tomas: RepositorioDeTomas,
    private readonly pacientes: RepositorioDePacientes,
    private readonly politica: PoliticaDeAcceso,
    private readonly reloj: Reloj,
    private readonly ventanaDeToleranciaEnMinutos: number,
  ) {}

  async ejecutar(consulta: ConsultaDeAnalitica): Promise<Analitica> {
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

    const diaFinal = consulta.hasta ? FechaLocal.desde(consulta.hasta) : hoy;
    const diaInicial = consulta.desde
      ? FechaLocal.desde(consulta.desde)
      : hoy.sumarDias(-DIAS_POR_DEFECTO);

    const tomas = await this.tomas.listarPorPacienteEnRango(pacienteId, {
      desde: zona.inicioDelDia(diaInicial),
      hasta: zona.inicioDelDia(diaFinal.sumarDias(1)),
    });

    const resumen = ResumenDeAdherencia.calcular(tomas, this.ventanaDeToleranciaEnMinutos);
    const mapa = MapaDeRiesgo.desdeTomas(tomas, zona);
    const curiosidades = Curiosidades.desdeTomas(
      tomas,
      zona,
      this.ventanaDeToleranciaEnMinutos,
    );

    return {
      desde: diaInicial.toString(),
      hasta: diaFinal.toString(),
      zonaHoraria: zona.toString(),
      resumen: resumen.toJSON(),
      mapaDeRiesgo: mapa.toJSON(),
      curiosidades: curiosidades.toJSON(),
      evidencia: {
        tomasResueltas: mapa.totalDeObservaciones,
        suficienteParaElMapa: mapa.totalDeObservaciones >= MINIMO_PARA_EL_MAPA,
      },
    };
  }
}
