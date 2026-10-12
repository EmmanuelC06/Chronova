import type { NombreDeIcono } from './componentes/Icono';

/**
 * DATOS DE HÁBITOS: la parte del módulo de curiosidades que no sale de
 * los datos de la persona.
 *
 * Por qué es una lista FIJA y escrita a mano
 * ------------------------------------------
 * Esto podría haber sido una llamada a un modelo de lenguaje que
 * generara un dato curioso distinto cada día, y habría quedado más
 * vistoso. Se descartó, y la razón es la misma que gobierna toda la app.
 *
 * Un texto generado en el momento no se puede revisar antes de que la
 * persona lo lea. Si un día ese texto sugiere algo sobre una dosis, una
 * enfermedad o un medicamento, Chronova deja de ser una aplicación de
 * recordatorios y pasa a dar información de salud, que es justo la
 * frontera que el Decreto 4725 de 2005 usa para clasificar un software
 * como dispositivo médico: la **finalidad prevista**. No se cruza esa
 * frontera por una tarjeta bonita.
 *
 * Una lista fija, en cambio, está escrita, revisada y es la misma para
 * todo el mundo. Se puede enseñar en la sustentación, se puede defender
 * y se puede corregir.
 *
 * Las tres reglas de redacción
 * ----------------------------
 * 1. Ninguna tarjeta nombra un medicamento, una dosis ni una
 *    enfermedad concreta.
 * 2. Ninguna tarjeta dice qué hacer con un tratamiento. Habla de
 *    conducta: de memoria, de rutinas y de hábitos.
 * 3. Todo número tiene fuente. Un dato sin fuente en un trabajo
 *    académico es una opinión con cara de dato.
 */
export interface DatoDeHabito {
  clave: string;
  icono: NombreDeIcono;
  titulo: string;
  texto: string;
  /** De dónde sale. Va impreso en la tarjeta, no escondido. */
  fuente: string;
}

export const DATOS_DE_HABITOS: readonly DatoDeHabito[] = [
  {
    clave: 'ES_COMUN',
    icono: 'informacion',
    titulo: 'No eres el único al que se le queda',
    texto:
      'En los tratamientos largos, alrededor de la mitad de las personas no los siguen ' +
      'tal como se los indicaron. Olvidarse no es un defecto de carácter: es lo normal, ' +
      'y es justo el problema que esta aplicación intenta resolver.',
    fuente: 'OMS, "Adherencia a los tratamientos a largo plazo" (2003)',
  },
  {
    clave: 'SESENTA_Y_SEIS',
    icono: 'calendario',
    titulo: 'Un hábito no se hace en 21 días',
    texto:
      'La cifra de los 21 días es un mito. En el estudio que de verdad lo midió, una ' +
      'conducta nueva tardó 66 días de promedio en volverse automática, y según la ' +
      'persona iba de 18 días a más de 200. Si todavía te cuesta, no es que lo estés ' +
      'haciendo mal: es que todavía es pronto.',
    fuente: 'Lally y otros, European Journal of Social Psychology (2010)',
  },
  {
    clave: 'RECORDATORIOS',
    icono: 'campana',
    titulo: 'El recordatorio funciona, y está medido',
    texto:
      'Se revisaron 16 ensayos clínicos con 2.742 pacientes para ver si un simple aviso ' +
      'en el teléfono cambiaba algo. Lo cambiaba: quienes lo recibían tenían alrededor ' +
      'del doble de probabilidad de tomarse la medicina como estaba indicado.',
    fuente: 'Thakkar y otros, JAMA Internal Medicine (2016)',
  },
  {
    clave: 'ENGANCHAR',
    icono: 'idea',
    titulo: 'Engánchalo a algo que ya haces',
    texto:
      'Cuesta mucho menos acordarse de algo pegado a una costumbre que ya existe (el ' +
      'desayuno, lavarse los dientes, el noticiero de la noche) que de un número en el ' +
      'reloj. Si una franja se te queda siempre, suele ser porque no está pegada a nada.',
    fuente: 'Principio de anclaje de hábitos, usado en psicología de la conducta',
  },
  {
    clave: 'LO_ESCRITO',
    icono: 'libro',
    titulo: 'Lo escrito pesa más que lo recordado',
    texto:
      'En una consulta de quince minutos nadie se acuerda bien de cómo le fue el mes ' +
      'pasado. Un registro de lo que de verdad pasó dice mucho más que un "me ha ido ' +
      'bien". Para eso está el botón de preparar el reporte.',
    fuente: 'Chronova',
  },
];

/**
 * El icono de cada curiosidad calculada.
 *
 * Va por CLAVE y no por el texto a propósito: el servidor puede cambiar
 * la redacción de una tarjeta sin que la app se quede sin icono. Si
 * llega una clave que esta versión de la app no conoce, cae en el icono
 * genérico en vez de romperse.
 */
export const ICONO_POR_CURIOSIDAD: Record<string, NombreDeIcono> = {
  TOTAL: 'check',
  MEJOR_RACHA: 'logro',
  RACHA_ACTUAL: 'racha',
  PUNTUALIDAD: 'reloj',
  MEJOR_DIA: 'calendario',
  MEJOR_FRANJA: 'hoy',
  ANTIGUEDAD: 'historial',
};

export function iconoDeCuriosidad(clave: string): NombreDeIcono {
  return ICONO_POR_CURIOSIDAD[clave] ?? 'diana';
}
