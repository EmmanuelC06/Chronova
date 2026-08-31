import { ErrorDeValidacion } from './errores.js';
import { FechaLocal } from './FechaLocal.js';
import type { Hora } from './Hora.js';

/**
 * Value Object ZonaHoraria: donde vive el paciente, en nomenclatura IANA
 * ("America/Bogota", "Europe/Madrid").
 *
 * Es la pieza que traduce entre dos mundos:
 *
 *   - La HORA DE PARED: "las 8 de la manana", que es lo que el paciente
 *     entiende y lo que escribio en la app.
 *   - El INSTANTE: un punto concreto en la linea del tiempo, que es lo
 *     que se guarda en la base de datos y lo que dispara una alarma.
 *
 * Sin esta traduccion, "las 8 de la manana" significaba las 8 del
 * servidor. Con el servidor en UTC y la paciente en Colombia, su
 * pastilla de las 8:00 sonaba a las 3:00 de la madrugada.
 *
 * Se guarda la zona y no el desfase en horas porque el desfase cambia:
 * los paises que aplican horario de verano lo mueven dos veces al ano.
 * El nombre IANA sobrevive a esos cambios; un "-5" fijo, no.
 */
const ZONA_POR_DEFECTO = 'America/Bogota';

export class ZonaHoraria {
  private constructor(readonly valor: string) {}

  static desde(valor: string): ZonaHoraria {
    const limpio = (valor ?? '').trim();
    if (limpio.length === 0) {
      throw new ErrorDeValidacion('La zona horaria es obligatoria.', 'zonaHoraria');
    }
    if (!ZonaHoraria.esValida(limpio)) {
      throw new ErrorDeValidacion(
        `"${valor}" no es una zona horaria valida. Usa un nombre como "America/Bogota".`,
        'zonaHoraria',
      );
    }
    return new ZonaHoraria(limpio);
  }

  /** Colombia, que es el contexto del proyecto. */
  static porDefecto(): ZonaHoraria {
    return new ZonaHoraria(ZONA_POR_DEFECTO);
  }

  /** Acepta un valor opcional y cae en la zona por defecto si falta o no sirve. */
  static desdeOPorDefecto(valor: string | null | undefined): ZonaHoraria {
    if (!valor || !ZonaHoraria.esValida(valor.trim())) return ZonaHoraria.porDefecto();
    return new ZonaHoraria(valor.trim());
  }

  private static esValida(zona: string): boolean {
    try {
      // Intl viene con el lenguaje: no es una dependencia externa, asi
      // que el dominio sigue sin importar librerias de terceros.
      new Intl.DateTimeFormat('en-US', { timeZone: zona });
      return true;
    } catch {
      return false;
    }
  }

  // --------------------------------------------------------------
  // Traduccion entre hora de pared e instante
  // --------------------------------------------------------------

  /**
   * Instante exacto que corresponde a "esta fecha, a esta hora, aqui".
   *
   * Ejemplo: instanteDe(2026-09-01, 08:00) en America/Bogota devuelve
   * 2026-09-01T13:00:00Z, porque Colombia esta 5 horas detras de UTC.
   */
  instanteDe(fecha: FechaLocal, hora: Hora): Date {
    // Punto de partida: interpretar la hora de pared como si fuera UTC.
    const comoSiFueraUtc = Date.UTC(
      fecha.anio,
      fecha.mes - 1,
      fecha.dia,
      hora.horas,
      hora.minutos,
      0,
      0,
    );

    // Ese instante esta desplazado justo por el desfase de la zona. Se
    // corrige y se repite una vez: si la primera correccion cruzo un
    // cambio de horario de verano, el desfase pudo cambiar.
    let instante = comoSiFueraUtc - this.desfaseEnMs(new Date(comoSiFueraUtc));
    instante = comoSiFueraUtc - this.desfaseEnMs(new Date(instante));

    return new Date(instante);
  }

  /** Dia del calendario en que cae este instante, visto desde esta zona. */
  fechaLocalDe(instante: Date): FechaLocal {
    const partes = this.partesDe(instante);
    return FechaLocal.desdePartes(partes.anio, partes.mes, partes.dia);
  }

  /** Hora de pared ("HH:mm") de este instante, vista desde esta zona. */
  horaDePareDe(instante: Date): string {
    const partes = this.partesDe(instante);
    return `${String(partes.hora).padStart(2, '0')}:${String(partes.minuto).padStart(2, '0')}`;
  }

  /**
   * Comienzo del dia del paciente, como instante.
   * Sirve para acotar consultas: "las tomas de hoy" son las que caen
   * entre el inicio de hoy y el inicio de manana, en SU zona.
   */
  inicioDelDia(fecha: FechaLocal): Date {
    const medianoche = Date.UTC(fecha.anio, fecha.mes - 1, fecha.dia, 0, 0, 0, 0);
    let instante = medianoche - this.desfaseEnMs(new Date(medianoche));
    instante = medianoche - this.desfaseEnMs(new Date(instante));
    return new Date(instante);
  }

  // --------------------------------------------------------------
  // Internos
  // --------------------------------------------------------------

  /**
   * Cuanto se adelanta esta zona respecto a UTC en ese instante, en
   * milisegundos. Positivo al este de Greenwich, negativo al oeste
   * (Colombia devuelve -5 horas).
   */
  private desfaseEnMs(instante: Date): number {
    const p = this.partesDe(instante);
    const comoUtc = Date.UTC(p.anio, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo);
    // Se descartan los milisegundos porque el formateador no los expone.
    return comoUtc - Math.floor(instante.getTime() / 1000) * 1000;
  }

  private partesDe(instante: Date): {
    anio: number;
    mes: number;
    dia: number;
    hora: number;
    minuto: number;
    segundo: number;
  } {
    const formateador = new Intl.DateTimeFormat('en-US', {
      timeZone: this.valor,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const partes: Record<string, string> = {};
    for (const parte of formateador.formatToParts(instante)) {
      if (parte.type !== 'literal') partes[parte.type] = parte.value;
    }

    return {
      anio: Number(partes.year),
      mes: Number(partes.month),
      dia: Number(partes.day),
      // Algunas versiones devuelven "24" para la medianoche.
      hora: Number(partes.hour) % 24,
      minuto: Number(partes.minute),
      segundo: Number(partes.second),
    };
  }

  esIgualA(otra: ZonaHoraria | null | undefined): boolean {
    return otra instanceof ZonaHoraria && otra.valor === this.valor;
  }

  toString(): string {
    return this.valor;
  }

  toJSON(): string {
    return this.valor;
  }
}
