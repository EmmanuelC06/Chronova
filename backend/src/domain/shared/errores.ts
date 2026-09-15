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
        ? `No se encontró ${recurso} con identificador ${identificador}.`
        : `No se encontró ${recurso}.`,
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
  constructor(mensaje = 'Las credenciales no son válidas.') {
    super(mensaje);
  }
}

/** Esta autenticado, pero no tiene permiso sobre ese recurso. */
export class ErrorDeAutorizacion extends ErrorDeDominio {
  readonly codigo = 'NO_AUTORIZADO';
  constructor(mensaje = 'No tienes permiso para realizar esta acción.') {
    super(mensaje);
  }
}

/** Una regla de negocio impide la operacion. */
export class ErrorDeReglaDeNegocio extends ErrorDeDominio {
  readonly codigo = 'REGLA_DE_NEGOCIO';
}

/**
 * El correo y la contrasena sirven para DOS cuentas distintas.
 *
 * Chronova permite a proposito que una misma persona tenga cuenta de
 * paciente y de cuidadora con el mismo correo: una hija que acompaña a
 * su madre y que ademas sigue su propio tratamiento es un caso real, no
 * rebuscado. El inicio de sesion acepta un `tipo` justamente para eso.
 *
 * El problema era que la app nunca lo enviaba, y sin `tipo` el servidor
 * devolvia siempre la cuenta de paciente. La de cuidadora quedaba
 * inalcanzable para siempre, y ni recuperar la contrasena la rescataba.
 *
 * Con este error el servidor deja de elegir por su cuenta cuando no
 * puede saberlo, y le pasa la pregunta a quien si la puede responder.
 * No revela nada: solo se lanza DESPUES de comprobar que la contrasena
 * es correcta para las dos cuentas.
 */
export class ErrorDeCuentaAmbigua extends ErrorDeDominio {
  readonly codigo = 'CUENTA_AMBIGUA';
  constructor(
    mensaje = 'Este correo tiene una cuenta de paciente y otra de acompañante. ' +
      'Elige con cuál quieres entrar.',
  ) {
    super(mensaje);
  }
}
