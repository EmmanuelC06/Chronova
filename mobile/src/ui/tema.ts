import type { TamanoDeLetra } from '../dominio/modelos';

/**
 * Sistema de diseno de Chronova. Direccion: "clinico sereno".
 *
 * No es decoracion. La revision de literatura del proyecto identifica la
 * experiencia de usuario como la causa principal de abandono de las apps
 * de salud entre adultos mayores, asi que estas decisiones son parte de
 * la solucion al problema, no un adorno encima:
 *
 *  - Texto grande por defecto (18 pt de base, no 14) y escalable hasta
 *    un 45% mas desde las preferencias del paciente.
 *  - Contraste alto: los 20 pares texto/fondo de esta paleta se
 *    comprobaron con la formula de la WCAG y ninguno baja de 4.5:1;
 *    ocho llegan a 7:1 (AAA).
 *  - Zonas tactiles de 64 px de alto minimo, muy por encima de los 44 px
 *    recomendados, porque el temblor y la artritis son comunes a esta
 *    edad.
 *  - El estado nunca se comunica solo con color: siempre lleva ademas un
 *    icono y una palabra, para que funcione con daltonismo y con
 *    cataratas.
 *
 * Lo que cambio al pasar a esta direccion, y por que:
 *
 *  - LOS ICONOS SE DIBUJAN. Antes eran emoji (☀ 💊 ✓). Cada telefono los
 *    pinta distinto —el mismo simbolo cambia de forma y de color entre
 *    Android y iOS— y visualmente delatan un prototipo. Ahora son trazos
 *    vectoriales, del mismo grosor y la misma familia. Ver `Icono.tsx`.
 *  - HAY JERARQUIA. Antes solo existian los pesos 400 y 700, asi que la
 *    unica forma de destacar algo era agrandarlo. Entran el 500 y el 600,
 *    el interletrado negativo en los titulares y un rotulo pequeno en
 *    mayusculas para los encabezados de seccion.
 *  - UNA TARJETA, UN RECURSO. Antes cada tarjeta llevaba sombra, borde y
 *    una barra de color de 6 px a la izquierda. Tres cosas compitiendo.
 *    Ahora solo un borde fino; el estado lo lleva el icono con su palabra.
 */

export const colores = {
  fondo: '#F7F9FA',
  superficie: '#FFFFFF',
  superficieSuave: '#EFF3F5',
  borde: '#E2E8EC',
  /** Para bordes que deben verse solos, como los de un boton secundario. */
  bordeFuerte: '#CBD5DC',

  texto: '#0F1B21',
  textoSuave: '#5A6B75',
  /**
   * Solo para rotulos y notas al pie.
   *
   * Empezo siendo #8494A0 y se oscurecio hasta aqui porque aquel se
   * quedaba en 2.96:1 sobre el fondo, por debajo del minimo de la norma.
   * Es el limite: cualquier gris mas claro incumple.
   */
  textoTenue: '#67737D',
  textoInverso: '#FFFFFF',

  primario: '#0B5563',
  primarioOscuro: '#083F4A',
  primarioSuave: '#E3EFF2',

  exito: '#16704F',
  exitoSuave: '#DFF1E9',
  advertencia: '#8A5209',
  advertenciaSuave: '#FBEEDC',
  peligro: '#A3251F',
  peligroSuave: '#FBE6E4',
} as const;

/**
 * Tipografia: Atkinson Hyperlegible Next.
 *
 * La diseno el Braille Institute con un objetivo explicito: aumentar la
 * legibilidad para personas con baja vision. Sus letras se distinguen a
 * proposito unas de otras —el cero lleva un corte, la ele tiene cola, la
 * i mayuscula lleva remates— justo donde otras familias las confunden.
 * Para una aplicacion cuyo publico son adultos mayores no es una
 * preferencia estetica: es la misma decision que el cuerpo de 18 pt.
 *
 * La carga `useFuenteDeLaApp` (src/ui/tipografia.ts), que llama el
 * proveedor de sesion al arrancar. Mientras carga, y si
 * fallara, se usa la del sistema: `undefined` en React Native significa
 * exactamente eso, asi que la app nunca se queda sin texto.
 */
export const FUENTE = {
  regular: 'Atkinson_400Regular',
  media: 'Atkinson_500Medium',
  semi: 'Atkinson_600SemiBold',
  negrita: 'Atkinson_700Bold',
} as const;

export type PesoDeTexto = 'regular' | 'media' | 'semi' | 'negrita';

/**
 * Traduce un peso al estilo que entiende React Native.
 *
 * Se devuelve `fontFamily` O `fontWeight`, nunca los dos a la vez, y la
 * razon es una peculiaridad de Android que estropea el resultado:
 *
 *  - Cada peso de Atkinson es una FAMILIA distinta y ya viene con su
 *    grosor dentro. Al pedir ademas `fontWeight: '700'`, Android intenta
 *    engordar por su cuenta una tipografia que ya es negrita, y el
 *    resultado es un texto emborronado con los huecos de las letras
 *    cerrados. Es un efecto conocido como "negrita sintetica" y en una
 *    aplicacion para baja vision es justo lo contrario de lo que se
 *    busca.
 *  - Mientras la fuente carga, o si fallara, no hay familia que pedir y
 *    entonces `fontWeight` es lo unico que distingue un titular de un
 *    parrafo. Ahi si se envia.
 */
export function familiaYPeso(peso: PesoDeTexto, cargada: boolean) {
  if (cargada) return { fontFamily: FUENTE[peso] };

  const delSistema = {
    regular: '400',
    media: '500',
    semi: '600',
    negrita: '700',
  } as const;
  return { fontWeight: delSistema[peso] };
}

/** Multiplicador aplicado a todos los tamanos de texto. */
export const ESCALAS: Record<TamanoDeLetra, number> = {
  NORMAL: 1,
  GRANDE: 1.2,
  MUY_GRANDE: 1.45,
};

const TAMANOS_BASE = {
  /** Para el dato que manda en la pantalla: el porcentaje, el "1 de 3". */
  cifra: 40,
  titulo: 28,
  subtitulo: 22,
  cuerpo: 18,
  etiqueta: 16,
  pequeno: 14,
  /** Rotulo de seccion. Va en mayusculas y con interletrado abierto. */
  rotulo: 13,
} as const;

export type NombreDeTamano = keyof typeof TAMANOS_BASE;

export function tamanoDeTexto(nombre: NombreDeTamano, escala: TamanoDeLetra): number {
  return Math.round(TAMANOS_BASE[nombre] * ESCALAS[escala]);
}

/**
 * Interletrado por tamano.
 *
 * Los titulares se cierran un poco y los rotulos se abren mucho. Es de
 * los ajustes que no se notan de uno en uno y que juntos separan un
 * texto compuesto de un texto puesto.
 */
export const INTERLETRADO: Record<NombreDeTamano, number> = {
  cifra: -1.2,
  titulo: -0.6,
  subtitulo: -0.2,
  cuerpo: 0,
  etiqueta: 0,
  pequeno: 0,
  rotulo: 1,
};

/** Alto de linea por tamano. Los titulares respiran menos que el cuerpo. */
export const INTERLINEADO: Record<NombreDeTamano, number> = {
  cifra: 1.0,
  titulo: 1.2,
  subtitulo: 1.25,
  cuerpo: 1.4,
  etiqueta: 1.4,
  pequeno: 1.45,
  rotulo: 1.3,
};

export const espacio = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radio = {
  sm: 8,
  /** Botones. */
  md: 12,
  /** Tarjetas. Bajo de 20 a 14: menos blando, mas preciso. */
  lg: 14,
  redondo: 999,
} as const;

/** Alto minimo de cualquier elemento tocable. */
export const ALTO_TACTIL_MINIMO = 64;

/**
 * Colores, icono y etiqueta de cada estado de toma. Nunca solo color.
 *
 * `icono` es ahora el NOMBRE de un icono dibujado, no un caracter. La
 * palabra sigue estando: es lo que hace que el estado se entienda sin
 * distinguir colores y lo que lee un lector de pantalla.
 */
export const ESTILO_POR_ESTADO = {
  PENDIENTE: {
    color: colores.advertencia,
    fondo: colores.advertenciaSuave,
    icono: 'reloj',
    etiqueta: 'Pendiente',
  },
  POSPUESTA: {
    color: colores.advertencia,
    fondo: colores.advertenciaSuave,
    icono: 'posponer',
    etiqueta: 'Pospuesta',
  },
  TOMADA: {
    color: colores.exito,
    fondo: colores.exitoSuave,
    icono: 'check',
    etiqueta: 'Tomada',
  },
  OMITIDA: {
    color: colores.peligro,
    fondo: colores.peligroSuave,
    icono: 'equis',
    etiqueta: 'No tomada',
  },
} as const;

export const ESTILO_POR_NIVEL = {
  BUENA: {
    color: colores.exito,
    fondo: colores.exitoSuave,
    etiqueta: 'Buena adherencia',
  },
  REGULAR: {
    color: colores.advertencia,
    fondo: colores.advertenciaSuave,
    etiqueta: 'Adherencia regular',
  },
  BAJA: {
    color: colores.peligro,
    fondo: colores.peligroSuave,
    etiqueta: 'Adherencia baja',
  },
  SIN_DATOS: {
    color: colores.textoTenue,
    fondo: colores.superficieSuave,
    etiqueta: 'Sin datos aun',
  },
} as const;
