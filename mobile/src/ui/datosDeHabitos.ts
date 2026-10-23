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
 * Las cuatro reglas de redacción
 * ------------------------------
 * 1. Ninguna tarjeta nombra un medicamento, una dosis ni una
 *    enfermedad concreta.
 * 2. Ninguna tarjeta dice qué hacer. Describe lo que se sabe y deja la
 *    decisión donde tiene que estar. La diferencia entre «conviene que
 *    bebas más agua» y «la sed deja de ser un buen aviso con la edad»
 *    es la diferencia entre aconsejar y contar.
 * 3. Todo número tiene fuente. Un dato sin fuente en un trabajo
 *    académico es una opinión con cara de dato.
 * 4. Donde la decisión dependa del tratamiento de cada quien, la tarjeta
 *    lo dice y remite al médico. No es un parche legal: para algunas
 *    personas beber más líquido o moverse más está limitado por su
 *    tratamiento, y una tarjeta que lo ignore sería un mal consejo
 *    aunque el dato sea cierto.
 */

/**
 * Los temas que una persona puede marcar.
 *
 * Las claves son las mismas que valida el servidor
 * (`backend/src/domain/paciente/TemasDeInteres.ts`). Si alguien añade un
 * tema allí sin añadirlo aquí, la app sencillamente no lo dibuja; si lo
 * añade aquí sin añadirlo allí, el servidor rechaza el guardado. Las dos
 * mitades fallan de forma visible, que es mejor que una que calle.
 */
export const TEMAS = [
  {
    clave: 'MEMORIA',
    titulo: 'Acordarse mejor',
    descripcion: 'Cómo se forman los hábitos y por qué a veces cuesta.',
    icono: 'idea' as NombreDeIcono,
  },
  {
    clave: 'CITA',
    titulo: 'Hablar con el médico',
    descripcion: 'Sacarle más provecho a los quince minutos de consulta.',
    icono: 'libro' as NombreDeIcono,
  },
  {
    clave: 'SUENO',
    titulo: 'El sueño',
    descripcion: 'Cuánto se duerme y qué cambia con los años.',
    icono: 'sueno' as NombreDeIcono,
  },
  {
    clave: 'ALIMENTACION',
    titulo: 'La alimentación',
    descripcion: 'Lo que cambia en el cuerpo con la edad.',
    icono: 'alimentacion' as NombreDeIcono,
  },
  {
    clave: 'MOVIMIENTO',
    titulo: 'Moverse',
    descripcion: 'Qué recomienda la OMS a partir de los 65.',
    icono: 'movimiento' as NombreDeIcono,
  },
  {
    clave: 'ANIMO',
    titulo: 'El ánimo',
    descripcion: 'La compañía y los días difíciles.',
    icono: 'animo' as NombreDeIcono,
  },
] as const;

export type ClaveDeTema = (typeof TEMAS)[number]['clave'];

/** El mismo tope que el dominio del servidor. */
export const MAXIMO_DE_TEMAS = 4;

export interface DatoDeHabito {
  clave: string;
  /**
   * El tema al que pertenece, o `null` si se enseña siempre.
   *
   * Solo hay un dato sin tema, y es a propósito: el que dice que
   * olvidarse es lo normal. Esa es la idea de la que cuelga todo lo
   * demás, y nadie debería tener que marcar nada para encontrarla.
   */
  tema: ClaveDeTema | null;
  icono: NombreDeIcono;
  titulo: string;
  texto: string;
  /** De dónde sale. Va impreso en la tarjeta, no escondido. */
  fuente: string;
}

export const DATOS_DE_HABITOS: readonly DatoDeHabito[] = [
  {
    clave: 'ES_COMUN',
    tema: null,
    icono: 'informacion',
    titulo: 'No eres el único al que se le queda',
    texto:
      'En los tratamientos largos, alrededor de la mitad de las personas no los siguen ' +
      'tal como se los indicaron. Olvidarse no es un defecto de carácter: es lo normal, ' +
      'y es justo el problema que esta aplicación intenta resolver.',
    fuente: 'OMS, "Adherencia a los tratamientos a largo plazo" (2003)',
  },

  // ---- Acordarse mejor ----
  {
    clave: 'SESENTA_Y_SEIS',
    tema: 'MEMORIA',
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
    clave: 'ENGANCHAR',
    tema: 'MEMORIA',
    icono: 'idea',
    titulo: 'Engánchalo a algo que ya haces',
    texto:
      'Cuesta mucho menos acordarse de algo pegado a una costumbre que ya existe (el ' +
      'desayuno, lavarse los dientes, el noticiero de la noche) que de un número en el ' +
      'reloj. Si una franja se te queda siempre, suele ser porque no está pegada a nada.',
    fuente: 'Principio de anclaje de hábitos, usado en psicología de la conducta',
  },
  {
    clave: 'RECORDATORIOS',
    tema: 'MEMORIA',
    icono: 'campana',
    titulo: 'El recordatorio funciona, y está medido',
    texto:
      'Se revisaron 16 ensayos clínicos con 2.742 pacientes para ver si un simple aviso ' +
      'en el teléfono cambiaba algo. Lo cambiaba: quienes lo recibían tenían alrededor ' +
      'del doble de probabilidad de tomarse la medicina como estaba indicado.',
    fuente: 'Thakkar y otros, JAMA Internal Medicine (2016)',
  },

  // ---- Hablar con el médico ----
  {
    clave: 'LO_ESCRITO',
    tema: 'CITA',
    icono: 'libro',
    titulo: 'Lo escrito pesa más que lo recordado',
    texto:
      'En una consulta de quince minutos nadie se acuerda bien de cómo le fue el mes ' +
      'pasado. Un registro de lo que de verdad pasó dice mucho más que un "me ha ido ' +
      'bien". Para eso está el botón de preparar el reporte.',
    fuente: 'Chronova',
  },

  // ---- El sueño ----
  {
    clave: 'SUENO_HORAS',
    tema: 'SUENO',
    icono: 'sueno',
    titulo: 'No se necesita dormir mucho menos con los años',
    texto:
      'Se suele decir que de mayor se duerme poco porque hace falta poco. La ' +
      'recomendación es de 7 a 9 horas para un adulto y de 7 a 8 a partir de los 65: ' +
      'baja una hora, no tres. Y dentro de ese rango hay gente que está bien en el ' +
      'extremo bajo y gente que no.',
    fuente: 'National Sleep Foundation, recomendaciones de duración del sueño (2015, revisadas en 2026)',
  },

  // ---- La alimentación ----
  {
    clave: 'SED',
    tema: 'ALIMENTACION',
    icono: 'alimentacion',
    titulo: 'La sed deja de ser un buen aviso',
    texto:
      'Con la edad, la sensación de sed se atenúa. Es uno de los motivos por los que el ' +
      'cuerpo puede ir falto de líquido sin que aparezcan ganas de beber, junto con los ' +
      'cambios en el riñón y el número de medicamentos que se toman. Cuánto conviene ' +
      'beber depende de cada persona y de su tratamiento: eso se habla con el médico.',
    fuente: 'Hooper y otros, Mechanisms of Ageing and Development (2014)',
  },

  // ---- Moverse ----
  {
    clave: 'MOVERSE',
    tema: 'MOVIMIENTO',
    icono: 'movimiento',
    titulo: 'Lo que la OMS recomienda a partir de los 65',
    texto:
      'De 150 a 300 minutos de actividad moderada a la semana, que son unos 20 a 40 ' +
      'minutos al día, y tres días o más de ejercicios de equilibrio y fuerza. No es una ' +
      'meta que haya que alcanzar mañana, y qué parte de esto le conviene a cada quien ' +
      'depende de su situación: eso se habla con el médico.',
    fuente: 'OMS, directrices sobre actividad física y hábitos sedentarios (2020)',
  },

  // ---- Hablar con el médico ----
  {
    clave: 'SE_OLVIDA_LA_CONSULTA',
    tema: 'CITA',
    icono: 'informacion',
    titulo: 'De la consulta se olvida casi todo',
    texto:
      'Entre el 40 y el 80 por ciento de lo que dice el médico se olvida nada más salir, y ' +
      'de lo que sí se recuerda, casi la mitad se recuerda mal. No es cosa de la memoria de ' +
      'cada quien: pasa con todo el mundo. Por eso lo que se apunta vale más que lo que se ' +
      'promete recordar.',
    fuente: 'Kessels, Journal of the Royal Society of Medicine (2003)',
  },
  {
    clave: 'LO_IMPORTANTE_PRIMERO',
    tema: 'CITA',
    icono: 'reloj',
    titulo: 'Di lo más importante de primero',
    texto:
      'En un estudio de consultas grabadas, de las veces en que el médico preguntó qué le ' +
      'preocupaba al paciente, interrumpió en dos de cada tres; y cuando interrumpió, lo hizo ' +
      'a los once segundos de mediana. No es mala intención, es el reloj. Si llevas tres ' +
      'cosas que contar, empieza por la que más te pesa.',
    fuente: 'Singh Ospina y otros, Journal of General Internal Medicine (2019)',
  },

  // ---- El sueño ----
  {
    clave: 'SUENO_SE_ESTABILIZA',
    tema: 'SUENO',
    icono: 'sueno',
    titulo: 'No todo empeora cada año',
    texto:
      'A lo largo de la vida adulta el sueño se va fragmentando: más minutos despierto por ' +
      'la noche y menos sueño profundo, década a década. Pero el mayor análisis que lo midió ' +
      'encontró que, pasados los 60, casi todos esos valores se estabilizan. Dicho de otro ' +
      'modo: a los 75 no se duerme peor que a los 65 solo por haber cumplido años.',
    fuente: 'Ohayon y otros, Sleep (2004), metaanálisis de parámetros del sueño',
  },
  {
    clave: 'QUEJAS_DE_SUENO',
    tema: 'SUENO',
    icono: 'informacion',
    titulo: 'Dormir mal no viene con la edad',
    texto:
      'En un estudio con más de nueve mil personas de 65 años o más, más de la mitad dijo ' +
      'tener alguna queja de sueño casi siempre. Lo interesante es la conclusión de los ' +
      'autores: esas molestias suelen acompañar a otras enfermedades, no al hecho de ' +
      'envejecer. Si duermes mal, no es que te toque por edad; vale la pena contarlo en la ' +
      'consulta.',
    fuente: 'Foley y otros, Sleep (1995), estudio en tres comunidades',
  },

  // ---- La alimentación ----
  {
    clave: 'OLFATO',
    tema: 'ALIMENTACION',
    icono: 'alimentacion',
    titulo: 'La comida sabe distinta, y casi siempre es la nariz',
    texto:
      'Lo que llamamos sabor es en buena parte olor. Y el olfato se va perdiendo con los ' +
      'años: medido en población general, lo tiene alterado el 13 por ciento entre los 60 y ' +
      'los 69, el 25 por ciento entre los 70 y los 79, y el 39 por ciento a partir de los 80. ' +
      'Si la comida te sabe a menos, no te lo estás imaginando.',
    fuente: 'Instituto Nacional de Sordera y Trastornos de la Comunicación, NIH (datos NHANES)',
  },
  {
    clave: 'APETITO',
    tema: 'ALIMENTACION',
    icono: 'informacion',
    titulo: 'Perder el apetito tiene nombre',
    texto:
      'Se llama anorexia del envejecimiento y está descrita desde hace décadas. En una ' +
      'revisión de 62 estudios con más de ochenta mil personas mayores de 60, la presentaba ' +
      'uno de cada cuatro de los que viven en su casa. Tener menos hambre que antes es ' +
      'frecuente y se puede comentar con el médico como cualquier otra cosa.',
    fuente: 'Li y otros, Age and Ageing (2025), revisión sistemática',
  },

  // ---- Moverse ----
  {
    clave: 'MUSCULO',
    tema: 'MOVIMIENTO',
    icono: 'movimiento',
    titulo: 'El músculo se va solo si no se usa',
    texto:
      'Reuniendo los estudios que lo han medido, la masa muscular baja alrededor de un 4,7 ' +
      'por ciento por década en hombres y un 3,7 por ciento en mujeres, contando desde el ' +
      'máximo de la juventud. Es una mediana de estudios, no un destino: el músculo responde ' +
      'al uso a cualquier edad.',
    fuente: 'Mitchell y otros, Frontiers in Physiology (2012), revisión cuantitativa',
  },
  {
    clave: 'ALGO_ES_MEJOR',
    tema: 'MOVIMIENTO',
    icono: 'check',
    titulo: 'Algo es mejor que nada',
    texto:
      'Es una frase literal de las directrices de la OMS: para cualquier población, hacer ' +
      'algo de actividad física es mejor que no hacer nada. Y a los adultos mayores les ' +
      'dirige otra: ser tan activos como su capacidad funcional les permita. Ninguna de las ' +
      'dos habla de alcanzar una meta, sino de empezar donde cada quien esté.',
    fuente: 'OMS, directrices sobre actividad física y hábitos sedentarios (2020)',
  },

  // ---- El ánimo ----
  {
    clave: 'ANIMO_MEJORA',
    tema: 'ANIMO',
    icono: 'animo',
    titulo: 'El ánimo suele mejorar con los años',
    texto:
      'Va en contra de lo que se supone. Un estudio siguió a las mismas personas durante más ' +
      'de diez años, preguntándoles varias veces al día cómo se sentían. A mayor edad, el ' +
      'ánimo del día a día resultó en promedio más positivo y más estable. Los días malos ' +
      'siguen existiendo; lo que cambia es que pesan menos tiempo.',
    fuente: 'Carstensen y otros, Psychology and Aging (2011)',
  },
  {
    clave: 'COMPANIA',
    tema: 'ANIMO',
    icono: 'animo',
    titulo: 'Sentirse solo es más común de lo que parece',
    texto:
      'Una de cada seis personas en el mundo se siente sola, y el aislamiento social ' +
      'alcanza hasta a uno de cada tres adultos mayores. Es tan frecuente que la OMS ' +
      'creó una comisión para estudiarlo. Si el ánimo bajo te dura muchos días seguidos, ' +
      'vale la pena contárselo a alguien de confianza y a tu médico.',
    fuente: 'OMS, Comisión sobre Conexión Social (2025)',
  },
];

/**
 * Las curiosidades de un tema, en orden.
 *
 * La conversación las entrega de una en una, y por eso el orden importa:
 * la primera de cada tema es la que mejor se sostiene sola, por si nadie
 * toca «cuéntame otra».
 */
export function datosDelTema(clave: string): DatoDeHabito[] {
  return DATOS_DE_HABITOS.filter((d) => d.tema === clave);
}

/** El título de un tema, o `null` si esta versión de la app no lo conoce. */
export function tituloDeTema(clave: string): string | null {
  return TEMAS.find((t) => t.clave === clave)?.titulo ?? null;
}

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
