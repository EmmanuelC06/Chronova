import type { Toma } from './Toma.js';

export type NivelDeAdherencia = 'BUENA' | 'REGULAR' | 'BAJA' | 'SIN_DATOS';

/**
 * Umbral clinico clasico: se considera que hay adherencia adecuada a
 * partir del 80% de las dosis cumplidas. Debajo del 50% se considera
 * adherencia baja, que es la situacion de riesgo que el proyecto busca
 * detectar a tiempo.
 */
export const UMBRAL_ADHERENCIA_BUENA = 80;
export const UMBRAL_ADHERENCIA_REGULAR = 50;

/**
 * Servicio de dominio: calcula la adherencia de un conjunto de tomas.
 *
 * Es un calculo de negocio puro (no toca base de datos ni HTTP), asi que
 * vive en el dominio y se puede probar con un arreglo de objetos en un
 * test que corre en milisegundos.
 */
export class ResumenDeAdherencia {
  private constructor(
    readonly totalProgramadas: number,
    readonly tomadas: number,
    readonly omitidas: number,
    readonly pendientes: number,
    readonly tomadasATiempo: number,
    readonly tomadasConRetraso: number,
    /** Confirmadas antes de que llegara su hora. */
    readonly tomadasAdelantadas: number,
  ) {}

  static calcular(tomas: readonly Toma[], ventanaDeToleranciaEnMinutos: number): ResumenDeAdherencia {
    let tomadas = 0;
    let omitidas = 0;
    let pendientes = 0;
    let aTiempo = 0;
    let conRetraso = 0;
    let adelantadas = 0;

    for (const toma of tomas) {
      switch (toma.estado) {
        case 'TOMADA': {
          tomadas += 1;
          const puntualidad = toma.puntualidad(ventanaDeToleranciaEnMinutos);
          // Solo cuenta como puntual la que se hizo DENTRO de la ventana.
          // Antes, cualquier cosa que no fuera CON_RETRASO sumaba a
          // tiempo, asi que confirmar por error la toma de las 20:00 a las
          // 07:00 de la manana —trece horas antes, un desliz de un pulgar
          // en una pantalla de letra grande— daba 100% de puntualidad.
          if (puntualidad === 'A_TIEMPO') aTiempo += 1;
          else if (puntualidad === 'CON_RETRASO') conRetraso += 1;
          else if (puntualidad === 'ADELANTADA') adelantadas += 1;
          break;
        }
        case 'OMITIDA':
          omitidas += 1;
          break;
        default:
          pendientes += 1;
      }
    }

    return new ResumenDeAdherencia(
      tomas.length,
      tomadas,
      omitidas,
      pendientes,
      aTiempo,
      conRetraso,
      adelantadas,
    );
  }

  /** Base del calculo: solo las tomas que ya se resolvieron. */
  private get resueltas(): number {
    return this.tomadas + this.omitidas;
  }

  /** Porcentaje de cumplimiento, redondeado a un decimal. */
  get porcentaje(): number {
    if (this.resueltas === 0) return 0;
    return Math.round((this.tomadas / this.resueltas) * 1000) / 10;
  }

  /** Porcentaje de tomas que ademas se hicieron dentro del horario. */
  get porcentajeDePuntualidad(): number {
    if (this.tomadas === 0) return 0;
    return Math.round((this.tomadasATiempo / this.tomadas) * 1000) / 10;
  }

  get nivel(): NivelDeAdherencia {
    if (this.resueltas === 0) return 'SIN_DATOS';
    if (this.porcentaje >= UMBRAL_ADHERENCIA_BUENA) return 'BUENA';
    if (this.porcentaje >= UMBRAL_ADHERENCIA_REGULAR) return 'REGULAR';
    return 'BAJA';
  }

  /** Señal para avisar al cuidador. */
  get requiereAtencionDelCuidador(): boolean {
    return this.nivel === 'BAJA' || (this.nivel === 'REGULAR' && this.omitidas >= 3);
  }

  get mensaje(): string {
    switch (this.nivel) {
      case 'SIN_DATOS':
        return 'Todavia no hay tomas registradas en este periodo.';
      case 'BUENA':
        return `Excelente: se cumplio el ${this.porcentaje}% del tratamiento.`;
      case 'REGULAR':
        return `Atencion: se cumplio el ${this.porcentaje}% del tratamiento. Hay margen de mejora.`;
      case 'BAJA':
        return `Riesgo: solo se cumplio el ${this.porcentaje}% del tratamiento. Conviene revisar con el cuidador o el medico.`;
    }
  }

  toJSON() {
    return {
      totalProgramadas: this.totalProgramadas,
      tomadas: this.tomadas,
      omitidas: this.omitidas,
      pendientes: this.pendientes,
      tomadasATiempo: this.tomadasATiempo,
      tomadasConRetraso: this.tomadasConRetraso,
      tomadasAdelantadas: this.tomadasAdelantadas,
      porcentaje: this.porcentaje,
      porcentajeDePuntualidad: this.porcentajeDePuntualidad,
      nivel: this.nivel,
      requiereAtencionDelCuidador: this.requiereAtencionDelCuidador,
      mensaje: this.mensaje,
    };
  }
}
