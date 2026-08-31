import { ErrorDeValidacion } from './errores.js';

/**
 * Value Object FechaLocal: un dia del calendario, sin hora y sin zona.
 *
 * "El 1 de septiembre de 2026" es el mismo dia para todo el mundo. No
 * lleva hora, asi que no puede desplazarse al cruzar husos horarios.
 *
 * Por que existe: un objeto Date de JavaScript SIEMPRE es un instante
 * concreto en la linea del tiempo, y al leerlo (getDate, getDay) usa la
 * zona del proceso. Guardar "la fecha de inicio del tratamiento" en un
 * Date significaba que el mismo tratamiento empezaba un dia distinto
 * segun donde corriera el servidor. Este tipo elimina esa clase de error
 * de raiz: si no hay hora, no hay desplazamiento posible.
 */
const PATRON = /^(\d{4})-(\d{2})-(\d{2})$/;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export class FechaLocal {
  private constructor(
    readonly anio: number,
    readonly mes: number,
    readonly dia: number,
  ) {}

  static desde(texto: string): FechaLocal {
    const limpio = (texto ?? '').trim().slice(0, 10);
    const coincidencia = PATRON.exec(limpio);
    if (!coincidencia) {
      throw new ErrorDeValidacion(
        `La fecha "${texto}" debe tener el formato AAAA-MM-DD.`,
        'fecha',
      );
    }

    const anio = Number(coincidencia[1]);
    const mes = Number(coincidencia[2]);
    const dia = Number(coincidencia[3]);

    if (mes < 1 || mes > 12) {
      throw new ErrorDeValidacion(`El mes de "${texto}" no existe.`, 'fecha');
    }
    // Date.UTC normaliza los desbordes, asi que comparamos para detectar
    // fechas imposibles como el 31 de febrero.
    const comprobacion = new Date(Date.UTC(anio, mes - 1, dia));
    if (
      comprobacion.getUTCFullYear() !== anio ||
      comprobacion.getUTCMonth() !== mes - 1 ||
      comprobacion.getUTCDate() !== dia
    ) {
      throw new ErrorDeValidacion(`La fecha "${texto}" no existe en el calendario.`, 'fecha');
    }

    return new FechaLocal(anio, mes, dia);
  }

  /**
   * Se usa internamente y en las pruebas. Para obtener "hoy" del
   * paciente hay que pasar por su ZonaHoraria, no por aqui.
   */
  static desdePartes(anio: number, mes: number, dia: number): FechaLocal {
    return FechaLocal.desde(
      `${String(anio).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
    );
  }

  // --------------------------------------------------------------

  /**
   * Instante UTC que representa la medianoche de este dia *si el dia se
   * interpreta en UTC*. Es un auxiliar interno para hacer aritmetica de
   * dias; no es "la medianoche del paciente".
   */
  private get referenciaUtc(): number {
    return Date.UTC(this.anio, this.mes - 1, this.dia);
  }

  /** 0 = domingo ... 6 = sabado. Coincide con Date.getDay(). */
  get diaDeLaSemana(): number {
    return new Date(this.referenciaUtc).getUTCDay();
  }

  sumarDias(dias: number): FechaLocal {
    const resultado = new Date(this.referenciaUtc + dias * MS_POR_DIA);
    return FechaLocal.desdePartes(
      resultado.getUTCFullYear(),
      resultado.getUTCMonth() + 1,
      resultado.getUTCDate(),
    );
  }

  /** Dias completos desde esta fecha hasta la otra. Negativo si la otra es anterior. */
  diasHasta(otra: FechaLocal): number {
    return Math.round((otra.referenciaUtc - this.referenciaUtc) / MS_POR_DIA);
  }

  esAnteriorA(otra: FechaLocal): boolean {
    return this.referenciaUtc < otra.referenciaUtc;
  }

  esPosteriorA(otra: FechaLocal): boolean {
    return this.referenciaUtc > otra.referenciaUtc;
  }

  esIgualA(otra: FechaLocal | null | undefined): boolean {
    return otra instanceof FechaLocal && otra.referenciaUtc === this.referenciaUtc;
  }

  toString(): string {
    return `${String(this.anio).padStart(4, '0')}-${String(this.mes).padStart(2, '0')}-${String(this.dia).padStart(2, '0')}`;
  }

  toJSON(): string {
    return this.toString();
  }
}
