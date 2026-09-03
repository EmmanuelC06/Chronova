export type TipoDeUsuario = 'PACIENTE' | 'CUIDADOR';

/** Lo que el sistema sabe de quien esta haciendo la peticion. */
export interface Sesion {
  usuarioId: string;
  tipo: TipoDeUsuario;

  /**
   * Marca de "sesiones validas desde" que tenia la cuenta al emitir.
   *
   * Viaja dentro del token y se compara con la que hay guardada. Si no
   * coinciden es que la persona cambio su contrasena despues de emitir
   * este token, y entonces el token ya no vale.
   *
   * Se compara por igualdad exacta y no "iat contra la fecha de cambio"
   * a proposito: el `iat` de un JWT tiene precision de un segundo, asi
   * que al restablecer la contrasena y entrar acto seguido —que es
   * justo lo que hace la app— el token nuevo podia parecer anterior al
   * cambio y quedar invalidado al nacer.
   */
  validaDesde: number;
}

/** Una sesion ya verificada, con lo que hace falta para decidir si renovarla. */
export interface SesionVerificada extends Sesion {
  /** Instante en que este token deja de valer por si solo. */
  expiraEn: Date;
}

/**
 * PUERTO de emision y verificacion de tokens de sesion.
 * El adaptador actual usa JWT, pero podria ser cualquier otro mecanismo.
 */
export interface ServicioDeTokens {
  emitir(sesion: Sesion): string;
  /** Devuelve null si el token es invalido o expiro. */
  verificar(token: string): SesionVerificada | null;
}
