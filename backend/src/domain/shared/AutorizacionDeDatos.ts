import { ErrorDeValidacion } from './errores.js';

/**
 * Value Object: la autorización que el titular otorgó para tratar sus
 * datos personales.
 *
 * No es burocracia. El artículo 8, literal b) de la Ley 1581 de 2012 le
 * da al titular el derecho a **solicitar prueba de la autorización
 * otorgada**, y una casilla marcada en una pantalla que no deja rastro
 * no es prueba de nada. Guardando la VERSIÓN del documento aceptado y el
 * INSTANTE exacto, y conservando cada versión del texto en el
 * repositorio, se puede reconstruir qué aceptó exactamente cada persona
 * y cuándo.
 *
 * Vive en el dominio, y no en la capa web, por la misma razón que el
 * resto de reglas: cualquier otra vía de entrada —una tarea, un script,
 * otro adaptador— tendría que respetarla igual. Es una condición para
 * que exista una cuenta, no un detalle del formulario.
 *
 * Los datos de salud son SENSIBLES (art. 5), y para ellos el artículo 6
 * exige autorización **explícita**. De ahí que sea un campo obligatorio
 * al registrarse y no algo que se pueda dejar para después.
 */
export class AutorizacionDeDatos {
  /**
   * Marca para las cuentas creadas antes de que esto se registrara.
   *
   * Existe por honestidad, no por comodidad: es preferible que la
   * aplicación pueda decir "de esta cuenta no consta la autorización"
   * a inventarse una fecha que nadie otorgó. Cuando aparece, lo correcto
   * es volver a pedirla.
   */
  static readonly SIN_CONSTANCIA = '0.0';

  private constructor(
    /** Versión del documento que el titular aceptó. Por ejemplo "1.0". */
    readonly versionDePolitica: string,
    readonly otorgadaEn: Date,
  ) {}

  static otorgar(datos: { versionDePolitica: string; ahora: Date }): AutorizacionDeDatos {
    const version = (datos.versionDePolitica ?? '').trim();

    if (version === '') {
      throw new ErrorDeValidacion(
        'Falta la version de la politica de tratamiento que se acepto.',
        'autorizacionDeDatos',
      );
    }
    // Formato "mayor.menor": suficiente para identificar el texto y
    // ordenarlo, y lo bastante estricto para que un valor accidental no
    // pase por una version real.
    if (!/^\d+\.\d+$/.test(version)) {
      throw new ErrorDeValidacion(
        `"${version}" no es una version valida de la politica (se espera algo como "1.0").`,
        'autorizacionDeDatos',
      );
    }

    return new AutorizacionDeDatos(version, datos.ahora);
  }

  /** Para las cuentas anteriores a este registro. */
  static sinConstancia(creadoEn: Date): AutorizacionDeDatos {
    return new AutorizacionDeDatos(AutorizacionDeDatos.SIN_CONSTANCIA, creadoEn);
  }

  static desdePlano(plano: AutorizacionDeDatosPlana | null | undefined, creadoEn: Date): AutorizacionDeDatos {
    if (!plano || !plano.versionDePolitica) return AutorizacionDeDatos.sinConstancia(creadoEn);
    return new AutorizacionDeDatos(plano.versionDePolitica, new Date(plano.otorgadaEn));
  }

  /** Falso cuando la cuenta es anterior a que esto se registrara. */
  get constaOtorgada(): boolean {
    return this.versionDePolitica !== AutorizacionDeDatos.SIN_CONSTANCIA;
  }

  /**
   * ¿Aceptó una version distinta de la que está vigente hoy?
   *
   * Sirve para pedir una autorización nueva cuando la política cambia de
   * forma sustancial, que es lo que la propia política promete hacer.
   */
  esAnteriorA(versionVigente: string): boolean {
    return this.versionDePolitica !== versionVigente;
  }

  toJSON(): AutorizacionDeDatosPlana {
    return {
      versionDePolitica: this.versionDePolitica,
      otorgadaEn: this.otorgadaEn.toISOString(),
    };
  }
}

export interface AutorizacionDeDatosPlana {
  versionDePolitica: string;
  otorgadaEn: string;
}
