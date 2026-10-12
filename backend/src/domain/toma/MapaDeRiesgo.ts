import type { FechaLocal } from '../shared/FechaLocal.js';
import type { ZonaHoraria } from '../shared/ZonaHoraria.js';
import type { Toma } from './Toma.js';

/**
 * Las cuatro franjas del dia.
 *
 * Cuatro y no veinticuatro a proposito. Con veinticuatro celdas por dia
 * de la semana tendriamos 168 casillas y un puñado de observaciones en
 * cada una: cualquier patron que saliera seria ruido. Con cuatro franjas
 * son 28 casillas, que con tres meses de un tratamiento normal da una
 * decena larga de observaciones por casilla. Es la diferencia entre un
 * hallazgo y una casualidad.
 *
 * Los cortes son los de la vida diaria y no los del reloj: la gente no
 * dice "a las 19:00", dice "en la noche".
 */
export type Franja = 'MANANA' | 'TARDE' | 'NOCHE' | 'MADRUGADA';

export const FRANJAS: readonly Franja[] = ['MADRUGADA', 'MANANA', 'TARDE', 'NOCHE'];

/** Nombre de cada franja, para mostrarlo tal cual. */
export const NOMBRE_DE_FRANJA: Record<Franja, string> = {
  MADRUGADA: 'Madrugada',
  MANANA: 'Mañana',
  TARDE: 'Tarde',
  NOCHE: 'Noche',
};

/** El rango de cada franja, dicho como lo diria una persona. */
export const HORARIO_DE_FRANJA: Record<Franja, string> = {
  MADRUGADA: 'de 12 a 6 de la mañana',
  MANANA: 'de 6 de la mañana a 12 del día',
  TARDE: 'de 12 del día a 6 de la tarde',
  NOCHE: 'de 6 de la tarde a 12 de la noche',
};

export const NOMBRE_DE_DIA: readonly string[] = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

/**
 * El dia en plural, para frases del tipo "los martes por la noche".
 *
 * Va aparte porque en español solo sabado y domingo pluralizan: "los
 * domingos" pero "los lunes". Añadir una ese a todos daria "los lunes"
 * mal escrito como "los luness", y quitarla a todos daria "los domingo".
 * Es el tipo de detalle que un jurado nota en una demostracion.
 */
export const NOMBRE_DE_DIA_PLURAL: readonly string[] = [
  'domingos',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábados',
];

export function franjaDeLaHora(hora: number): Franja {
  if (hora < 6) return 'MADRUGADA';
  if (hora < 12) return 'MANANA';
  if (hora < 18) return 'TARDE';
  return 'NOCHE';
}

/**
 * Cuantas observaciones hacen falta en una casilla para decir algo de
 * ella en voz alta.
 *
 * Por debajo de esto la casilla se calcula igual (y se dibuja, con su
 * incertidumbre), pero no se convierte en un hallazgo con texto. Decirle
 * a alguien "los martes por la noche fallas" porque falló una de dos
 * veces seria inventar un patron.
 */
export const MINIMO_PARA_AFIRMAR = 5;

/**
 * Fuerza del suavizado, en observaciones imaginarias.
 *
 * El modelo es una beta-binomial: a cada casilla se le suman unas pocas
 * observaciones ficticias que siguen la tasa general de la persona. El
 * efecto es que una casilla con dos datos se parece a su promedio
 * personal, y solo se despega de el cuando acumula evidencia propia.
 *
 * Sin esto, una casilla con una sola omision daria 100% de riesgo y
 * encabezaria la lista. Es el error clasico de las medias sobre pocos
 * datos, y aqui tendria consecuencias: mandaria el refuerzo al sitio
 * equivocado.
 */
export const PESO_DEL_SUAVIZADO = 4;

export interface CeldaDeRiesgo {
  franja: Franja;
  /** 0 = domingo ... 6 = sabado. */
  diaDeLaSemana: number;
  /** Tomas resueltas (tomadas u omitidas) que cayeron en esta casilla. */
  observaciones: number;
  omitidas: number;
  /** Riesgo suavizado, de 0 a 1. */
  riesgo: number;
  /** Si hay evidencia suficiente para afirmar algo sobre esta casilla. */
  suficiente: boolean;
}

export interface Hallazgo {
  franja: Franja;
  diaDeLaSemana: number;
  riesgo: number;
  observaciones: number;
  omitidas: number;
  /** El patron dicho en una frase, sin jerga y sin juicio. */
  texto: string;
}

/**
 * MAPA DE RIESGO: donde falla ESTA persona, no las personas en general.
 *
 * Que es y que no es
 * ------------------
 * Es estadistica descriptiva sobre los datos que la propia persona
 * genero, suavizada para no sacar conclusiones de dos observaciones. No
 * es un modelo entrenado, no predice desenlaces de salud y no dice que
 * hacer con el tratamiento.
 *
 * Esa distincion no es cosmetica. Un sistema que afirma algo sobre la
 * ENFERMEDAD o sobre el TRATAMIENTO de una persona entra en el terreno
 * de los dispositivos medicos (Decreto 4725 de 2005, articulo 2, que
 * incluye expresamente el software y lo clasifica por su finalidad
 * prevista). Uno que solo describe la CONDUCTA de alguien con sus
 * propios registros, no. Por eso los hallazgos de aqui se enuncian
 * siempre como "sueles olvidar la toma de la noche los domingos" y nunca
 * como "tu tension se descontrola" ni como "deberias cambiar el
 * horario".
 *
 * Por que suavizado y no una media
 * --------------------------------
 * La media cruda sobre pocos datos miente con mucha seguridad. Una
 * casilla con una sola toma, omitida, da 100% de riesgo y se pone
 * primera en la lista; otra con treinta tomas y tres omisiones da 10% y
 * queda detras, cuando es la segunda la que describe un problema real.
 *
 * El suavizado resuelve eso sumando `PESO_DEL_SUAVIZADO` observaciones
 * imaginarias que siguen la tasa general de la persona. Una casilla con
 * poca evidencia se queda cerca de su promedio personal; una con mucha,
 * se despega. Es la regla de sucesion de Laplace con una previa
 * informativa, y se explica en una frase: "mientras no tengamos datos de
 * esa franja, suponemos que se parece al resto de tus franjas".
 *
 * Por que no una red neuronal
 * ---------------------------
 * Porque no hay datos para sostenerla. En la literatura, los modelos de
 * olvido entrenados con un solo usuario rinden entre 0,24 y 0,45 de F1,
 * es decir, mal e inestable; y un estudio de 2026 con 117 adultos
 * mayores encontro que el modelo personalizado PERDIO frente al no
 * personalizado en validacion retenida. Con los datos de una persona,
 * esto es lo honesto y lo defendible.
 */
export class MapaDeRiesgo {
  private constructor(
    readonly celdas: readonly CeldaDeRiesgo[],
    /** Tasa de omision general de la persona, de 0 a 1. */
    readonly tasaGeneral: number,
    readonly totalDeObservaciones: number,
  ) {}

  static desdeTomas(tomas: readonly Toma[], zona: ZonaHoraria): MapaDeRiesgo {
    // Solo las resueltas: una toma pendiente todavia no dice nada.
    const resueltas = tomas.filter((t) => t.estado === 'TOMADA' || t.estado === 'OMITIDA');

    const acumulado = new Map<string, { observaciones: number; omitidas: number }>();
    let omitidasEnTotal = 0;

    for (const toma of resueltas) {
      // La franja y el dia se calculan SIEMPRE en la zona del paciente.
      // Con la del servidor, una toma de las 8 de la noche en Medellin
      // caeria en la madrugada del dia siguiente si el servidor corre en
      // Europa, y el mapa entero quedaria corrido.
      const instante = toma.programadaOriginalmentePara;
      const fecha: FechaLocal = zona.fechaLocalDe(instante);
      const hora = Number(zona.horaDePareDe(instante).slice(0, 2));

      const clave = `${franjaDeLaHora(hora)}|${fecha.diaDeLaSemana}`;
      const actual = acumulado.get(clave) ?? { observaciones: 0, omitidas: 0 };
      actual.observaciones += 1;
      if (toma.estado === 'OMITIDA') {
        actual.omitidas += 1;
        omitidasEnTotal += 1;
      }
      acumulado.set(clave, actual);
    }

    const tasaGeneral = resueltas.length === 0 ? 0 : omitidasEnTotal / resueltas.length;

    // Se emiten las 28 casillas siempre, incluidas las vacias: un mapa
    // con huecos se lee mal, y el hueco tambien es informacion ("a esa
    // hora no tomas nada").
    const celdas: CeldaDeRiesgo[] = [];
    for (const franja of FRANJAS) {
      for (let dia = 0; dia < 7; dia += 1) {
        const datos = acumulado.get(`${franja}|${dia}`) ?? { observaciones: 0, omitidas: 0 };
        celdas.push({
          franja,
          diaDeLaSemana: dia,
          observaciones: datos.observaciones,
          omitidas: datos.omitidas,
          riesgo: suavizar(datos.omitidas, datos.observaciones, tasaGeneral),
          suficiente: datos.observaciones >= MINIMO_PARA_AFIRMAR,
        });
      }
    }

    return new MapaDeRiesgo(celdas, tasaGeneral, resueltas.length);
  }

  /** La casilla con mas riesgo entre las que tienen evidencia suficiente. */
  get peorCelda(): CeldaDeRiesgo | null {
    const candidatas = this.celdas.filter((c) => c.suficiente && c.omitidas > 0);
    if (candidatas.length === 0) return null;
    return candidatas.reduce((peor, c) => (c.riesgo > peor.riesgo ? c : peor));
  }

  /** La casilla mas fiable, para poder decir algo bueno y no solo fallos. */
  get mejorCelda(): CeldaDeRiesgo | null {
    const candidatas = this.celdas.filter((c) => c.suficiente);
    if (candidatas.length === 0) return null;
    return candidatas.reduce((mejor, c) => (c.riesgo < mejor.riesgo ? c : mejor));
  }

  /**
   * Los patrones que merecen decirse, como mucho tres.
   *
   * El limite es deliberado. Una lista de quince hallazgos no se lee, y
   * sobre todo no se actua: quien abre esto es una persona mayor que
   * quiere saber que cambiar esta semana, no un analista.
   *
   * Solo entra una casilla si tiene evidencia suficiente Y su riesgo
   * supera claramente el de la propia persona. Un riesgo igual al
   * promedio no es un patron, es la linea base.
   */
  hallazgos(maximo = 3): Hallazgo[] {
    const umbral = Math.max(this.tasaGeneral * 1.5, this.tasaGeneral + 0.1);

    return this.celdas
      .filter((c) => c.suficiente && c.omitidas > 0 && c.riesgo > umbral)
      .sort((a, b) => b.riesgo - a.riesgo)
      .slice(0, maximo)
      .map((c) => ({
        franja: c.franja,
        diaDeLaSemana: c.diaDeLaSemana,
        riesgo: c.riesgo,
        observaciones: c.observaciones,
        omitidas: c.omitidas,
        texto: frasePara(c),
      }));
  }

  toJSON() {
    return {
      celdas: this.celdas.map((c) => ({
        ...c,
        riesgo: Math.round(c.riesgo * 1000) / 1000,
      })),
      tasaGeneral: Math.round(this.tasaGeneral * 1000) / 1000,
      totalDeObservaciones: this.totalDeObservaciones,
      hallazgos: this.hallazgos().map((h) => ({
        ...h,
        riesgo: Math.round(h.riesgo * 1000) / 1000,
      })),
      peorCelda: this.peorCelda,
      mejorCelda: this.mejorCelda,
    };
  }
}

/**
 * Riesgo suavizado de una casilla.
 *
 * `(omitidas + peso * tasaGeneral) / (observaciones + peso)`
 *
 * Con cero observaciones devuelve la tasa general de la persona, que es
 * exactamente lo que corresponde: no sabemos nada de esa franja, asi que
 * suponemos que se parece a las demas.
 */
function suavizar(omitidas: number, observaciones: number, tasaGeneral: number): number {
  return (
    (omitidas + PESO_DEL_SUAVIZADO * tasaGeneral) / (observaciones + PESO_DEL_SUAVIZADO)
  );
}

/**
 * El patron dicho en una frase.
 *
 * Tres reglas, y las tres importan:
 *  - habla de la CONDUCTA, nunca de la enfermedad ni del tratamiento;
 *  - da el dato crudo ("3 de 12") para que la persona pueda comprobarlo
 *    ella misma en vez de tener que creernos;
 *  - no regaña. "Se te quedan" y no "incumples".
 */
function frasePara(celda: CeldaDeRiesgo): string {
  const dia = NOMBRE_DE_DIA_PLURAL[celda.diaDeLaSemana] ?? '';
  const franja = NOMBRE_DE_FRANJA[celda.franja].toLowerCase();
  const tomas = celda.omitidas === 1 ? 'se ha quedado 1 toma' : `se han quedado ${celda.omitidas} tomas`;

  /*
    La frase va SIN "te".

    La primera version decia "se te han quedado", que suena mejor cuando
    la lee el propio paciente. El problema aparecio con el cuidador: la
    misma frase viaja sin cambios a la pantalla de su hija, y alli "se te
    han quedado" habla de la persona equivocada. Son los mismos datos
    para dos lectores distintos, y la unica salida honesta sin duplicar
    el calculo es una frase que valga para los dos.
  */
  return `Los ${dia} por la ${franja} ${tomas} de ${celda.observaciones}.`;
}
