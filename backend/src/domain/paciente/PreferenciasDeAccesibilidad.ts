import { ErrorDeValidacion } from '../shared/errores.js';

export const TAMANOS_DE_LETRA = ['NORMAL', 'GRANDE', 'MUY_GRANDE'] as const;
export type TamanoDeLetra = (typeof TAMANOS_DE_LETRA)[number];

/**
 * Value Object con las preferencias de accesibilidad del paciente.
 *
 * El proyecto se dirige a adultos mayores, y la literatura revisada
 * (Borghouts et al., 2021; Yildirim y Ayyildiz, 2025) señala la
 * experiencia de usuario como el principal factor de abandono de las
 * apps de salud. Por eso la accesibilidad no es un detalle de la
 * interfaz: es parte del modelo de negocio y viaja con el paciente,
 * de modo que se respeta en cualquier dispositivo donde inicie sesion.
 */
export class PreferenciasDeAccesibilidad {
  private constructor(
    readonly tamanoDeLetra: TamanoDeLetra,
    readonly altoContraste: boolean,
    readonly alertasSonoras: boolean,
    readonly alertasVibracion: boolean,
    /** Minutos que espera el sistema antes de dar una toma por perdida. */
    readonly minutosDeGracia: number,
  ) {}

  static porDefecto(): PreferenciasDeAccesibilidad {
    return new PreferenciasDeAccesibilidad('GRANDE', false, true, true, 120);
  }

  static desde(datos: {
    tamanoDeLetra?: string;
    altoContraste?: boolean;
    alertasSonoras?: boolean;
    alertasVibracion?: boolean;
    minutosDeGracia?: number;
  }): PreferenciasDeAccesibilidad {
    const base = PreferenciasDeAccesibilidad.porDefecto();

    const tamano = (datos.tamanoDeLetra ?? base.tamanoDeLetra).toUpperCase();
    if (!TAMANOS_DE_LETRA.includes(tamano as TamanoDeLetra)) {
      throw new ErrorDeValidacion(
        `El tamano de letra debe ser uno de: ${TAMANOS_DE_LETRA.join(', ')}.`,
        'tamanoDeLetra',
      );
    }

    const minutosDeGracia = datos.minutosDeGracia ?? base.minutosDeGracia;
    if (!Number.isInteger(minutosDeGracia) || minutosDeGracia < 15 || minutosDeGracia > 720) {
      throw new ErrorDeValidacion(
        'Los minutos de gracia deben estar entre 15 y 720.',
        'minutosDeGracia',
      );
    }

    return new PreferenciasDeAccesibilidad(
      tamano as TamanoDeLetra,
      datos.altoContraste ?? base.altoContraste,
      datos.alertasSonoras ?? base.alertasSonoras,
      datos.alertasVibracion ?? base.alertasVibracion,
      minutosDeGracia,
    );
  }

  toJSON() {
    return {
      tamanoDeLetra: this.tamanoDeLetra,
      altoContraste: this.altoContraste,
      alertasSonoras: this.alertasSonoras,
      alertasVibracion: this.alertasVibracion,
      minutosDeGracia: this.minutosDeGracia,
    };
  }
}
