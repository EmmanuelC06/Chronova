import jwt from 'jsonwebtoken';
import type { Sesion, ServicioDeTokens, TipoDeUsuario } from '../../application/ports/ServicioDeTokens.js';

/**
 * ADAPTADOR del puerto ServicioDeTokens usando JWT.
 *
 * El token lleva firmado quien es el usuario y de que tipo. El servidor
 * no guarda sesiones en base de datos: verifica la firma y confia en el
 * contenido. Es simple y escala bien, con la contrapartida de que un
 * token no se puede invalidar antes de que expire, por eso la duracion
 * es limitada.
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
    return jwt.sign({ tipo: sesion.tipo }, this.secreto, {
      subject: sesion.usuarioId,
      expiresIn: this.duracion,
      issuer: 'chronova',
    } as jwt.SignOptions);
  }

  verificar(token: string): Sesion | null {
    try {
      const contenido = jwt.verify(token, this.secreto, { issuer: 'chronova' });
      if (typeof contenido === 'string' || !contenido.sub) return null;

      const tipo = (contenido as { tipo?: string }).tipo;
      if (tipo !== 'PACIENTE' && tipo !== 'CUIDADOR') return null;

      return { usuarioId: contenido.sub, tipo: tipo as TipoDeUsuario };
    } catch {
      // Token vencido, firma invalida o manipulado: todo es "no valido".
      return null;
    }
  }
}
