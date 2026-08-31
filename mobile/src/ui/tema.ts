import type { TamanoDeLetra } from '../dominio/modelos';

/**
 * Sistema de diseno de Chronova.
 *
 * No es decoracion. La revision de literatura del proyecto identifica la
 * experiencia de usuario como la causa principal de abandono de las apps
 * de salud entre adultos mayores, asi que estas decisiones son parte de
 * la solucion al problema, no un adorno encima:
 *
 *  - Texto grande por defecto (18 pt de base, no 14) y escalable hasta
 *    un 45% mas desde las preferencias del paciente.
 *  - Contraste alto: todos los pares texto/fondo superan la relacion
 *    4.5:1 que pide la norma WCAG AA, y varios llegan a 7:1 (AAA).
 *  - Zonas tactiles de 64 px de alto minimo, muy por encima de los 44 px
 *    recomendados, porque el temblor y la artritis son comunes a esta
 *    edad.
 *  - El estado nunca se comunica solo con color: siempre lleva ademas un
 *    icono y una palabra, para que funcione con daltonismo y con
 *    cataratas.
 */

export const colores = {
  fondo: '#F4F6F8',
  superficie: '#FFFFFF',
  superficieSuave: '#EDF2F1',
  borde: '#D3DAD9',

  texto: '#14181C',
  textoSuave: '#4B5563',
  textoInverso: '#FFFFFF',

  primario: '#0E6E62',
  primarioOscuro: '#0A544B',
  primarioSuave: '#DCEFEB',

  exito: '#15803D',
  exitoSuave: '#DCFCE7',
  advertencia: '#A45A08',
  advertenciaSuave: '#FEF3C7',
  peligro: '#B3261E',
  peligroSuave: '#FDE7E5',
} as const;

/** Multiplicador aplicado a todos los tamanos de texto. */
export const ESCALAS: Record<TamanoDeLetra, number> = {
  NORMAL: 1,
  GRANDE: 1.2,
  MUY_GRANDE: 1.45,
};

const TAMANOS_BASE = {
  titulo: 30,
  subtitulo: 23,
  cuerpo: 18,
  etiqueta: 16,
  pequeno: 14,
} as const;

export type NombreDeTamano = keyof typeof TAMANOS_BASE;

export function tamanoDeTexto(nombre: NombreDeTamano, escala: TamanoDeLetra): number {
  return Math.round(TAMANOS_BASE[nombre] * ESCALAS[escala]);
}

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
  md: 14,
  lg: 20,
  redondo: 999,
} as const;

/** Alto minimo de cualquier elemento tocable. */
export const ALTO_TACTIL_MINIMO = 64;

export const sombra = {
  shadowColor: '#0B1F1C',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
} as const;

/** Colores y etiqueta de cada estado de toma. Nunca solo color. */
export const ESTILO_POR_ESTADO = {
  PENDIENTE: { color: colores.advertencia, fondo: colores.advertenciaSuave, icono: '○', etiqueta: 'Pendiente' },
  POSPUESTA: { color: colores.advertencia, fondo: colores.advertenciaSuave, icono: '↻', etiqueta: 'Pospuesta' },
  TOMADA: { color: colores.exito, fondo: colores.exitoSuave, icono: '✓', etiqueta: 'Tomada' },
  OMITIDA: { color: colores.peligro, fondo: colores.peligroSuave, icono: '✕', etiqueta: 'No tomada' },
} as const;

export const ESTILO_POR_NIVEL = {
  BUENA: { color: colores.exito, fondo: colores.exitoSuave, etiqueta: 'Buena adherencia' },
  REGULAR: { color: colores.advertencia, fondo: colores.advertenciaSuave, etiqueta: 'Adherencia regular' },
  BAJA: { color: colores.peligro, fondo: colores.peligroSuave, etiqueta: 'Adherencia baja' },
  SIN_DATOS: { color: colores.textoSuave, fondo: colores.superficieSuave, etiqueta: 'Sin datos aun' },
} as const;
