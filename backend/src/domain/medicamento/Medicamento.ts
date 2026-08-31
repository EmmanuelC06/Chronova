import { Identificador } from '../shared/Identificador.js';
import { Hora } from '../shared/Hora.js';
import { ErrorDeReglaDeNegocio, ErrorDeValidacion } from '../shared/errores.js';
import { aMedianoche, diasEntre } from '../shared/fechas.js';
import { Dosis } from './Dosis.js';
import { Frecuencia } from './Frecuencia.js';
import { Stock } from './Stock.js';

/** Forma plana del medicamento: lo que viaja a la base de datos y a la API. */
export interface MedicamentoPlano {
  id: string;
  pacienteId: string;
  nombre: string;
  dosis: { cantidad: number; unidad: string };
  frecuencia: { tipo: string; diasDeLaSemana: number[]; intervaloEnDias: number };
  horarios: string[];
  fechaInicio: string;
  fechaFin: string | null;
  instrucciones: string | null;
  stock: { unidadesDisponibles: number; umbralDeAlerta: number };
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface DatosParaCrearMedicamento {
  id: Identificador;
  pacienteId: Identificador;
  nombre: string;
  dosis: Dosis;
  frecuencia: Frecuencia;
  horarios: readonly Hora[];
  fechaInicio: Date;
  fechaFin?: Date | null;
  instrucciones?: string | null;
  stock?: Stock;
  ahora: Date;
}

const MAXIMO_DE_HORARIOS_POR_DIA = 12;

/**
 * Entidad Medicamento: el tratamiento que un paciente debe seguir.
 *
 * Es una "entidad" porque tiene identidad propia: aunque le cambies el
 * nombre o la dosis, sigue siendo el mismo medicamento. Concentra las
 * reglas que en el MVP anterior estaban repartidas entre el servidor y
 * las pantallas: que horarios son validos, cuando esta vigente, cuanto
 * inventario consume cada toma.
 */
export class Medicamento {
  private constructor(
    readonly id: Identificador,
    readonly pacienteId: Identificador,
    private _nombre: string,
    private _dosis: Dosis,
    private _frecuencia: Frecuencia,
    private _horarios: readonly Hora[],
    private _fechaInicio: Date,
    private _fechaFin: Date | null,
    private _instrucciones: string | null,
    private _stock: Stock,
    private _activo: boolean,
    readonly creadoEn: Date,
    private _actualizadoEn: Date,
  ) {}

  // --------------------------------------------------------------
  // Construccion
  // --------------------------------------------------------------

  static crear(datos: DatosParaCrearMedicamento): Medicamento {
    const nombre = Medicamento.validarNombre(datos.nombre);
    const horarios = Medicamento.validarHorarios(datos.horarios);
    const fechaInicio = aMedianoche(datos.fechaInicio);
    const fechaFin = datos.fechaFin ? aMedianoche(datos.fechaFin) : null;

    if (fechaFin && diasEntre(fechaInicio, fechaFin) < 0) {
      throw new ErrorDeValidacion(
        'La fecha de finalizacion no puede ser anterior a la de inicio.',
        'fechaFin',
      );
    }

    return new Medicamento(
      datos.id,
      datos.pacienteId,
      nombre,
      datos.dosis,
      datos.frecuencia,
      horarios,
      fechaInicio,
      fechaFin,
      Medicamento.validarInstrucciones(datos.instrucciones ?? null),
      datos.stock ?? Stock.sinControl(),
      true,
      datos.ahora,
      datos.ahora,
    );
  }

  /** Reconstruye el medicamento desde la base de datos, sin revalidar reglas de creacion. */
  static desdePlano(plano: MedicamentoPlano): Medicamento {
    const frecuencia =
      plano.frecuencia.tipo === 'DIARIA'
        ? Frecuencia.diaria()
        : plano.frecuencia.tipo === 'DIAS_DE_LA_SEMANA'
          ? Frecuencia.diasDeLaSemana(plano.frecuencia.diasDeLaSemana)
          : Frecuencia.cadaNDias(plano.frecuencia.intervaloEnDias);

    return new Medicamento(
      Identificador.desde(plano.id),
      Identificador.desde(plano.pacienteId),
      plano.nombre,
      Dosis.desde(plano.dosis.cantidad, plano.dosis.unidad),
      frecuencia,
      plano.horarios.map((h) => Hora.desde(h)),
      new Date(plano.fechaInicio),
      plano.fechaFin ? new Date(plano.fechaFin) : null,
      plano.instrucciones,
      Stock.desde(plano.stock.unidadesDisponibles, plano.stock.umbralDeAlerta),
      plano.activo,
      new Date(plano.creadoEn),
      new Date(plano.actualizadoEn),
    );
  }

  aPlano(): MedicamentoPlano {
    return {
      id: this.id.valor,
      pacienteId: this.pacienteId.valor,
      nombre: this._nombre,
      dosis: { cantidad: this._dosis.cantidad, unidad: this._dosis.unidad },
      frecuencia: {
        tipo: this._frecuencia.tipo,
        diasDeLaSemana: [...this._frecuencia.diasDeLaSemana],
        intervaloEnDias: this._frecuencia.intervaloEnDias,
      },
      horarios: this._horarios.map((h) => h.toString()),
      fechaInicio: this._fechaInicio.toISOString(),
      fechaFin: this._fechaFin ? this._fechaFin.toISOString() : null,
      instrucciones: this._instrucciones,
      stock: {
        unidadesDisponibles: this._stock.unidadesDisponibles,
        umbralDeAlerta: this._stock.umbralDeAlerta,
      },
      activo: this._activo,
      creadoEn: this.creadoEn.toISOString(),
      actualizadoEn: this._actualizadoEn.toISOString(),
    };
  }

  // --------------------------------------------------------------
  // Lectura
  // --------------------------------------------------------------

  get nombre(): string {
    return this._nombre;
  }
  get dosis(): Dosis {
    return this._dosis;
  }
  get frecuencia(): Frecuencia {
    return this._frecuencia;
  }
  get horarios(): readonly Hora[] {
    return this._horarios;
  }
  get fechaInicio(): Date {
    return new Date(this._fechaInicio);
  }
  get fechaFin(): Date | null {
    return this._fechaFin ? new Date(this._fechaFin) : null;
  }
  get instrucciones(): string | null {
    return this._instrucciones;
  }
  get stock(): Stock {
    return this._stock;
  }
  get activo(): boolean {
    return this._activo;
  }
  get actualizadoEn(): Date {
    return new Date(this._actualizadoEn);
  }

  // --------------------------------------------------------------
  // Reglas de negocio
  // --------------------------------------------------------------

  /** ¿El tratamiento sigue en curso en esa fecha? */
  estaVigenteEn(fecha: Date): boolean {
    if (!this._activo) return false;
    if (diasEntre(this._fechaInicio, fecha) < 0) return false;
    if (this._fechaFin && diasEntre(fecha, this._fechaFin) < 0) return false;
    return true;
  }

  /**
   * Horarios en los que toca tomar este medicamento en la fecha dada.
   * Devuelve lista vacia si ese dia no corresponde.
   */
  horariosDelDia(fecha: Date): readonly Hora[] {
    if (!this.estaVigenteEn(fecha)) return [];
    if (!this._frecuencia.aplicaEn(fecha, this._fechaInicio)) return [];
    return this._horarios;
  }

  /** Se registro una toma: se descuenta el inventario correspondiente. */
  registrarConsumoDeUnaDosis(): void {
    if (this._stock.unidadesDisponibles === 0) return; // sin control de inventario
    this._stock = this._stock.descontar(this._dosis.unidadesConsumidasPorToma);
    this.marcarComoActualizado();
  }

  reabastecer(unidades: number): void {
    this._stock = this._stock.reabastecer(unidades);
    this.marcarComoActualizado();
  }

  definirUmbralDeAlerta(umbral: number): void {
    this._stock = this._stock.conUmbral(umbral);
    this.marcarComoActualizado();
  }

  /** Cambia datos del tratamiento. Solo toca lo que se le pasa. */
  actualizar(cambios: {
    nombre?: string;
    dosis?: Dosis;
    frecuencia?: Frecuencia;
    horarios?: readonly Hora[];
    fechaFin?: Date | null;
    instrucciones?: string | null;
  }): void {
    if (!this._activo) {
      throw new ErrorDeReglaDeNegocio(
        'No se puede modificar un medicamento que ya fue suspendido.',
      );
    }
    if (cambios.nombre !== undefined) this._nombre = Medicamento.validarNombre(cambios.nombre);
    if (cambios.dosis !== undefined) this._dosis = cambios.dosis;
    if (cambios.frecuencia !== undefined) this._frecuencia = cambios.frecuencia;
    if (cambios.horarios !== undefined) {
      this._horarios = Medicamento.validarHorarios(cambios.horarios);
    }
    if (cambios.fechaFin !== undefined) {
      const fin = cambios.fechaFin ? aMedianoche(cambios.fechaFin) : null;
      if (fin && diasEntre(this._fechaInicio, fin) < 0) {
        throw new ErrorDeValidacion(
          'La fecha de finalizacion no puede ser anterior a la de inicio.',
          'fechaFin',
        );
      }
      this._fechaFin = fin;
    }
    if (cambios.instrucciones !== undefined) {
      this._instrucciones = Medicamento.validarInstrucciones(cambios.instrucciones);
    }
    this.marcarComoActualizado();
  }

  /**
   * Suspende el medicamento en vez de borrarlo.
   *
   * Borrarlo destruiria el historial de tomas asociado, que es
   * justamente la evidencia clinica que el proyecto quiere conservar.
   */
  suspender(): void {
    if (!this._activo) return;
    this._activo = false;
    this.marcarComoActualizado();
  }

  reactivar(): void {
    if (this._activo) return;
    this._activo = true;
    this.marcarComoActualizado();
  }

  perteneceA(pacienteId: Identificador): boolean {
    return this.pacienteId.esIgualA(pacienteId);
  }

  // --------------------------------------------------------------
  // Validaciones internas
  // --------------------------------------------------------------

  private marcarComoActualizado(): void {
    this._actualizadoEn = new Date();
  }

  private static validarNombre(nombre: string): string {
    const limpio = (nombre ?? '').trim();
    if (limpio.length < 2) {
      throw new ErrorDeValidacion(
        'El nombre del medicamento debe tener al menos 2 caracteres.',
        'nombre',
      );
    }
    if (limpio.length > 120) {
      throw new ErrorDeValidacion('El nombre del medicamento es demasiado largo.', 'nombre');
    }
    return limpio;
  }

  private static validarHorarios(horarios: readonly Hora[]): readonly Hora[] {
    if (!horarios || horarios.length === 0) {
      throw new ErrorDeValidacion(
        'Debes indicar al menos una hora de toma para el medicamento.',
        'horarios',
      );
    }
    if (horarios.length > MAXIMO_DE_HORARIOS_POR_DIA) {
      throw new ErrorDeValidacion(
        `No se pueden registrar mas de ${MAXIMO_DE_HORARIOS_POR_DIA} horarios al dia.`,
        'horarios',
      );
    }
    const vistos = new Set<string>();
    for (const hora of horarios) {
      const texto = hora.toString();
      if (vistos.has(texto)) {
        throw new ErrorDeValidacion(`El horario ${texto} esta repetido.`, 'horarios');
      }
      vistos.add(texto);
    }
    return [...horarios].sort(
      (a, b) => a.minutosDesdeMedianoche - b.minutosDesdeMedianoche,
    );
  }

  private static validarInstrucciones(instrucciones: string | null): string | null {
    if (instrucciones === null) return null;
    const limpio = instrucciones.trim();
    if (limpio.length === 0) return null;
    if (limpio.length > 500) {
      throw new ErrorDeValidacion('Las instrucciones son demasiado largas.', 'instrucciones');
    }
    return limpio;
  }
}
