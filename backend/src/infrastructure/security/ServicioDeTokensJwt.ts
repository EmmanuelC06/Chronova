import jwt from 'jsonwebtoken';
import type {
  Sesion,
  SesionVerificada,
  ServicioDeTokens,
  TipoDeUsuario,
} from '../../application/ports/ServicioDeTokens.js';

/**
 * ADAPTADOR del puerto ServicioDeTokens usando JWT.
 *
 * El token lleva firmado quien es el usuario, de que tipo, y desde
 * cuando valen sus sesiones. El servidor no guarda sesiones en base de
 * datos: verifica la firma y confia en el contenido.
 *
 * Esa ultima afirmacion tiene una excepcion importante y deliberada.
 * Verificar la firma NO basta para dar por buena una sesion: un token
 * firmado sigue siendo un token firmado despues de que su dueno cambie
 * la contrasena. Quien decide si una sesion vale es el caso de uso
 * VerificarSesion, que ademas consulta la cuenta. Aqui solo se
 * comprueba que el papel no este falsificado ni caducado.
 */
export class ServicioDeTokensJwt implements ServicioDeTokens {
  constructor(
    private readonly secreto: string,
    private readonly duracion: string = '7d',
  ) {
    if (!secreto || secreto.length < 16) {
      throw new Error(
        'JWT_SECRET debe tener al menos 16 caracteres. Revisa tu archivo .env.',
      );
    }
  }

  emitir(sesion: Sesion): string {
    return jwt.sign({ tipo: sesion.tipo, vd: sesion.validaDesde }, this.secreto, {
      subject: sesion.usuarioId,
      expiresIn: this.duracion,
      issuer: 'chronova',
    } as jwt.SignOptions);
  }

  verificar(token: string): SesionVerificada | null {
    try {
      const contenido = jwt.verify(token, this.secreto, { issuer: 'chronova' });
      if (typeof contenido === 'string' || !contenido.sub || !contenido.exp) return null;

      const tipo = (contenido as { tipo?: string }).tipo;
      if (tipo !== 'PACIENTE' && tipo !== 'CUIDADOR') return null;

      const validaDesde = (contenido as { vd?: unknown }).vd;
      if (typeof validaDesde !== 'number') return null;

      return {
        usuarioId: contenido.sub,
        tipo: tipo as TipoDeUsuario,
        validaDesde,
        // `exp` viene en segundos, que es como lo define el estandar.
        expiraEn: new Date(contenido.exp * 1000),
      };
    } catch {
      // Token vencido, firma invalida o manipulado: todo es "no valido".
      return null;
    }
  }
}
