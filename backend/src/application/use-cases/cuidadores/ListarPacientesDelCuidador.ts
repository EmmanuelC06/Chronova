import type { NivelDeAdherencia } from '../../../domain/toma/ResumenDeAdherencia.js';
import { ResumenDeAdherencia } from '../../../domain/toma/ResumenDeAdherencia.js';
import type { RepositorioDeTomas } from '../../../domain/toma/RepositorioDeTomas.js';
import type { RepositorioDePacientes } from '../../../domain/paciente/RepositorioDePacientes.js';
import type { RepositorioDeMedicamentos } from '../../../domain/medicamento/RepositorioDeMedicamentos.js';
import type { RepositorioDeVinculos } from '../../../domain/vinculo/RepositorioDeVinculos.js';
import type { PermisosDelCuidador } from '../../../domain/vinculo/Vinculo.js';
import type { Reloj } from '../../ports/Reloj.js';
import type { Solicitante } from '../../services/PoliticaDeAcceso.js';

export interface ConsultaPacientesDelCuidador {
  solicitante: Solicitante;
  /** Dias hacia atras que se consideran para la adherencia. Por defecto 7. */
  dias?: number;
}

export interface PacienteEnPanel {
  vinculoId: string;
  pacienteId: string;
  nombre: string;
  parentesco: string | null;
  estadoDelVinculo: string;
  permisos: PermisosDelCuidador;
  adherencia: {
    porcentaje: number;
    nivel: NivelDeAdherencia;
    tomadas: number;
    omitidas: number;
    pendientes: number;
  };
  requiereAtencion: boolean;
  medicamentosActivos: number;
  medicamentosConStockBajo: number;
  /** Ultima vez que el paciente confirmo o rechazo una toma. */
  ultimaActividad: string | null;
  /**
   * Falso cuando el paciente no ha concedido (o ha retirado)
   * `puedeVerHistorial`. La fila sigue viniendo —el cuidador tiene que
   * poder ver que el vinculo existe y pedir el permiso— pero los campos
   * clinicos vienen vacios, no ocultos: la app necesita distinguir "no
   * hay datos" de "no puedo verlos".
   */
  datosClinicosVisibles: boolean;
}

const DIAS_POR_DEFECTO = 7;

/** Adherencia en blanco, para las filas sin acceso a datos clinicos. */
const SIN_ADHERENCIA = {
  porcentaje: 0,
  nivel: 'SIN_DATOS' as NivelDeAdherencia,
  tomadas: 0,
  omitidas: 0,
  pendientes: 0,
};

/**
 * CASO DE USO: el panel del cuidador.
 *
 * Devuelve, de un vistazo, como va cada paciente a cargo. La lista se
 * ordena poniendo primero a quien necesita atencion, porque un cuidador
 * con seis pacientes no deberia tener que buscar cual esta fallando: la
 * app se lo pone arriba.
 */
export class ListarPacientesDelCuidador {
  constructor(
    private readonly vinculos: RepositorioDeVinculos,
    private readonly pacientes: RepositorioDePacientes,
    private readonly medicamentos: RepositorioDeMedicamentos,
    private readonly tomas: RepositorioDeTomas,
    private readonly reloj: Reloj,
    private readonly ventanaDeToleranciaEnMinutos: number,
  ) {}

  async ejecutar(consulta: ConsultaPacientesDelCuidador): Promise<PacienteEnPanel[]> {
    const todos = await this.vinculos.listarPorCuidador(consulta.solicitante.id);
    const relevantes = todos.filter(
      (v) => v.estado === 'ACEPTADO' || v.estado === 'PENDIENTE',
    );
    if (relevantes.length === 0) return [];

    const ahora = this.reloj.ahora();
    const dias = consulta.dias ?? DIAS_POR_DEFECTO;

    const pacientes = await this.pacientes.listarPorIds(relevantes.map((v) => v.pacienteId));
    const porId = new Map(pacientes.map((p) => [p.id.valor, p]));

    const filas: PacienteEnPanel[] = [];

    for (const vinculo of relevantes) {
      const paciente = porId.get(vinculo.pacienteId.valor);
      if (!paciente) continue;

      // Dos razones para no traer ningun dato clinico, y la misma
      // respuesta para las dos:
      //
      //  - La solicitud sigue PENDIENTE: el paciente aun no ha aceptado.
      //  - El vinculo esta aceptado pero SIN `puedeVerHistorial`: el
      //    paciente lo apago, o nunca lo encendio.
      //
      // Este segundo caso faltaba, y era una fuga real: al retirar el
      // permiso, `/medicamentos`, `/tomas/agenda` y `/tomas/historial`
      // respondian 403 y este panel seguia devolviendo la adherencia, el
      // numero de medicamentos y la ultima actividad. El paciente creia
      // haber cortado el acceso —tres pantallas se lo confirmaban— y el
      // cuidador lo seguia viendo. Es el unico caso de uso que lee datos
      // clinicos sin pasar por PoliticaDeAcceso; el permiso se comprueba
      // aqui, contra el mismo vinculo que ya tenemos cargado.
      const puedeVerDatosClinicos =
        vinculo.estado === 'ACEPTADO' && vinculo.autorizar('puedeVerHistorial');

      if (!puedeVerDatosClinicos) {
        filas.push({
          vinculoId: vinculo.id.valor,
          pacienteId: paciente.id.valor,
          nombre: paciente.nombre,
          parentesco: vinculo.parentesco,
          estadoDelVinculo: vinculo.estado,
          permisos: vinculo.permisos,
          adherencia: { ...SIN_ADHERENCIA },
          requiereAtencion: false,
          medicamentosActivos: 0,
          medicamentosConStockBajo: 0,
          ultimaActividad: null,
          datosClinicosVisibles: false,
        });
        continue;
      }

      // El rango se calcula EN LA ZONA DE CADA PACIENTE, no en la del
      // servidor. Cubre dias completos, del primero al ultimo instante de
      // hoy: cortarlo en "ahora" dejaria fuera las tomas de mas tarde del
      // mismo dia y el cuidador veria el panel vacio cada manana.
      //
      // Antes esto usaba la medianoche del proceso, y el mismo panel
      // contaba una toma o dos segun el huso en que corriera el servidor,
      // contradiciendo el RNF-15.
      const zona = paciente.zonaHoraria;
      const hoy = zona.fechaLocalDe(ahora);
      const rango = {
        desde: zona.inicioDelDia(hoy.sumarDias(-dias)),
        hasta: zona.inicioDelDia(hoy.sumarDias(1)),
      };

      const [tomasDelPeriodo, medicamentosActivos] = await Promise.all([
        this.tomas.listarPorPacienteEnRango(paciente.id, rango),
        this.medicamentos.listarPorPaciente(paciente.id, false),
      ]);

      const resumen = ResumenDeAdherencia.calcular(
        tomasDelPeriodo,
        this.ventanaDeToleranciaEnMinutos,
      );

      const resueltas = tomasDelPeriodo
        .filter((t) => t.resueltaEn !== null)
        .sort((a, b) => (b.resueltaEn!.getTime() ?? 0) - (a.resueltaEn!.getTime() ?? 0));

      filas.push({
        vinculoId: vinculo.id.valor,
        pacienteId: paciente.id.valor,
        nombre: paciente.nombre,
        parentesco: vinculo.parentesco,
        estadoDelVinculo: vinculo.estado,
        permisos: vinculo.permisos,
        adherencia: {
          porcentaje: resumen.porcentaje,
          nivel: resumen.nivel,
          tomadas: resumen.tomadas,
          omitidas: resumen.omitidas,
          pendientes: resumen.pendientes,
        },
        requiereAtencion: resumen.requiereAtencionDelCuidador,
        medicamentosActivos: medicamentosActivos.length,
        medicamentosConStockBajo: medicamentosActivos.filter(
          (m) => m.stock.necesitaReabastecimiento,
        ).length,
        ultimaActividad: resueltas[0]?.resueltaEn?.toISOString() ?? null,
        datosClinicosVisibles: true,
      });
    }

    // Primero quien necesita atencion; entre iguales, el de peor adherencia.
    //
    // Las filas sin datos clinicos van al final. Su porcentaje es 0 por
    // no tener nada que contar, no por mala adherencia, y sin esta regla
    // encabezarian el panel como si fueran las mas urgentes.
    return filas.sort((a, b) => {
      if (a.datosClinicosVisibles !== b.datosClinicosVisibles) {
        return a.datosClinicosVisibles ? -1 : 1;
      }
      if (a.requiereAtencion !== b.requiereAtencion) return a.requiereAtencion ? -1 : 1;
      return a.adherencia.porcentaje - b.adherencia.porcentaje;
    });
  }
}
