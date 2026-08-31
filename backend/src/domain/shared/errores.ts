/**
 * Errores del dominio.
 *
 * El dominio no sabe que existe HTTP. Por eso lanza errores "de negocio"
 * y es la capa de infraestructura (el adaptador HTTP) la que decide
 * que codigo de estado corresponde a cada uno.
 */

export abstract class ErrorDeDominio extends Error {
  /** Codigo estable, pensado para que el cliente lo interprete. */
  abstract readonly codigo: string;

  constructor(mensaje: string) {
    super(mensaje);
    this.name = new.target.name;
    Error.captureStackTrace?.(this, new.target);
  }
}

/** Un dato de entrada no cumple las reglas de formato del dominio. */
export class ErrorDeValidacion extends ErrorDeDominio {
  readonly codigo = 'VALIDACION';
  constructor(
    mensaje: string,
    readonly campo?: string,
  ) {
    super(mensaje);
  }
}

/** Se pidio algo que no existe. */
export class ErrorNoEncontrado extends ErrorDeDominio {
  readonly codigo = 'NO_ENCONTRADO';
  constructor(recurso: string, identificador?: string) {
    super(
      identificador
        ? `No se encontro ${recurso} con identificador ${identificador}.`
        : `No se encontro ${recurso}.`,
    );
  }
}

/** Choca con algo que ya existe (por ejemplo, un email repetido). */
export class ErrorDeConflicto extends ErrorDeDominio {
  readonly codigo = 'CONFLICTO';
}

/** Credenciales invalidas o sesion ausente. */
export class ErrorDeAutenticacion extends ErrorDeDominio {
  readonly codigo = 'NO_AUTENTICADO';
  constructor(mensaje = 'Las credenciales no son validas.') {
    super(mensaje);
  }
}

/** Esta autenticado, pero no tiene permiso sobre ese recurso. */
export class ErrorDeAutorizacion extends ErrorDeDominio {
  readonly codigo = 'NO_AUTORIZADO';
  constructor(mensaje = 'No tienes permiso para realizar esta accion.') {
    super(mensaje);
  }
}

/** Una regla de negocio impide la operacion. */
export class ErrorDeReglaDeNegocio extends ErrorDeDominio {
  readonly codigo = 'REGLA_DE_NEGOCIO';
}
