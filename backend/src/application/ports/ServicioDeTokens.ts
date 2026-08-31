export type TipoDeUsuario = 'PACIENTE' | 'CUIDADOR';

/** Lo que el sistema sabe de quien esta haciendo la peticion. */
export interface Sesion {
  usuarioId: string;
  tipo: TipoDeUsuario;
}

/**
 * PUERTO de emision y verificacion de tokens de sesion.
 * El adaptador actual usa JWT, pero podria ser cualquier otro mecanismo.
 */
export interface ServicioDeTokens {
  emitir(sesion: Sesion): string;
  /** Devuelve null si el token es invalido o expiro. */
  verificar(token: string): Sesion | null;
}
