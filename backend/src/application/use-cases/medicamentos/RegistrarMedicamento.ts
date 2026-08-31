import { Hora } from '../../../domain/shared/Hora.js';
import { Identificador } from '../../../domain/shared/Identificador.js';
import { ErrorNoEncontrado } from '../../../domain/shared/errores.js';
import { Dosis } from '../../../domain/medicamento/Dosis.js';
import { Frecuencia } from '../../../domain/medicamento/Frecuencia.js';
import { Medicamento } from '../../../domain/medicamento/Medicamento.js';
import type { MedicamentoPlano } from '../../../domain/medicamento/Medicamento.js';
import type { RepositorioDeMedicamentos } from '../../../domain/medicamento/RepositorioDeMedicamentos.js';
import { Stock } from '../../../domain/medicamento/Stock.js';
import type { RepositorioDePacientes } from '../../../domain/paciente/RepositorioDePacientes.js';
import type { GeneradorDeIds } from '../../ports/GeneradorDeIds.js';
import type { Reloj } from '../../ports/Reloj.js';
import type { PoliticaDeAcceso, Solicitante } from '../../services/PoliticaDeAcceso.js';

export interface ComandoRegistrarMedicamento {
  solicitante: Solicitante;
  pacienteId: string;
  nombre: string;
  dosis: { cantidad: number; unidad: string };
  frecuencia: {
    tipo: 'DIARIA' | 'DIAS_DE_LA_SEMANA' | 'CADA_N_DIAS';
    diasDeLaSemana?: number[];
    intervaloEnDias?: number;
  };
  horarios: string[];
  fechaInicio?: string;
  fechaFin?: string | null;
  instrucciones?: string | null;
  stock?: { unidadesDisponibles: number; umbralDeAlerta: number };
}

/**
 * CASO DE USO: agregar un medicamento al tratamiento de un paciente.
 *
 * Fijate en lo que NO hay aqui: ni una consulta SQL, ni un objeto de
 * Express, ni un formato de fecha de la interfaz. El caso de uso solo
 * habla con puertos y con el dominio, y por eso puede probarse entero
 * sin base de datos ni servidor levantado.
 */
export class RegistrarMedicamento {
  constructor(
    private readonly medicamentos: RepositorioDeMedicamentos,
    private readonly pacientes: RepositorioDePacientes,
    private readonly politica: PoliticaDeAcceso,
    private readonly ids: GeneradorDeIds,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(comando: ComandoRegistrarMedicamento): Promise<MedicamentoPlano> {
    const pacienteId = Identificador.desde(comando.pacienteId);
    await this.politica.asegurarAccesoAPaciente(
      comando.solicitante,
      pacienteId,
      'puedeGestionarMedicamentos',
    );

    const paciente = await this.pacientes.buscarPorId(pacienteId);
    if (!paciente) throw new ErrorNoEncontrado('el paciente', comando.pacienteId);

    const ahora = this.reloj.ahora();

    const medicamento = Medicamento.crear({
      id: this.ids.nuevo(),
      pacienteId,
      nombre: comando.nombre,
      dosis: Dosis.desde(comando.dosis.cantidad, comando.dosis.unidad),
      frecuencia: construirFrecuencia(comando.frecuencia),
      horarios: comando.horarios.map((h) => Hora.desde(h)),
      fechaInicio: comando.fechaInicio ? new Date(comando.fechaInicio) : ahora,
      fechaFin: comando.fechaFin ? new Date(comando.fechaFin) : null,
      instrucciones: comando.instrucciones ?? null,
      stock: comando.stock
        ? Stock.desde(comando.stock.unidadesDisponibles, comando.stock.umbralDeAlerta)
        : Stock.sinControl(),
      ahora,
    });

    await this.medicamentos.guardar(medicamento);
    return medicamento.aPlano();
  }
}

/** Traduce la forma plana que llega por la API al value object del dominio. */
export function construirFrecuencia(datos: {
  tipo: 'DIARIA' | 'DIAS_DE_LA_SEMANA' | 'CADA_N_DIAS';
  diasDeLaSemana?: number[];
  intervaloEnDias?: number;
}): Frecuencia {
  switch (datos.tipo) {
    case 'DIAS_DE_LA_SEMANA':
      return Frecuencia.diasDeLaSemana(datos.diasDeLaSemana ?? []);
    case 'CADA_N_DIAS':
      return Frecuencia.cadaNDias(datos.intervaloEnDias ?? 1);
    default:
      return Frecuencia.diaria();
  }
}
