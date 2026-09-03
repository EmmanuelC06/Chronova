import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import {
  ErrorDeAutenticacion,
  ErrorDeAutorizacion,
  ErrorDeConflicto,
  ErrorDeDominio,
  ErrorDeReglaDeNegocio,
  ErrorDeValidacion,
  ErrorNoEncontrado,
} from '../../../domain/shared/errores.js';

/**
 * MIDDLEWARE de errores: el unico punto donde el dominio se traduce a HTTP.
 *
 * El dominio lanza ErrorNoEncontrado; aqui eso se convierte en un 404.
 * Gracias a esta traduccion, el nucleo del negocio no necesita conocer
 * ni un solo codigo de estado HTTP.
 */
const CODIGOS: Record<string, number> = {
  VALIDACION: 400,
  NO_AUTENTICADO: 401,
  NO_AUTORIZADO: 403,
  NO_ENCONTRADO: 404,
  CONFLICTO: 409,
  REGLA_DE_NEGOCIO: 422,
};

export function manejadorDeErrores(
  error: unknown,
  _peticion: Request,
  respuesta: Response,
  _siguiente: NextFunction,
): void {
  // Errores de forma detectados por Zod antes de llegar al dominio.
  if (error instanceof ZodError) {
    const primero = error.issues[0];
    respuesta.status(400).json({
      error: {
        codigo: 'VALIDACION',
        mensaje: primero?.message ?? 'Los datos enviados no son validos.',
        campo: primero?.path.join('.') || undefined,
        detalles: error.issues.map((i) => ({
          campo: i.path.join('.'),
          mensaje: i.message,
        })),
      },
    });
    return;
  }

  if (error instanceof ErrorDeDominio) {
    const estado = CODIGOS[error.codigo] ?? 400;
    respuesta.status(estado).json({
      error: {
        codigo: error.codigo,
        mensaje: error.message,
        campo: error instanceof ErrorDeValidacion ? error.campo : undefined,
      },
    });
    return;
  }

  /**
   * Errores que trae el propio Express y que YA saben su codigo.
   *
   * `express.json()` lanza con `status` puesto cuando el cuerpo no es
   * JSON valido (400) o cuando pasa del limite de 256 kB (413). Sin esta
   * rama caian abajo y se convertian en 500, con dos consecuencias: al
   * cliente se le decia "error inesperado del servidor" cuando el error
   * era suyo y reintentar no iba a arreglarlo, y el log del servidor se
   * llenaba de trazas completas por cada peticion mal formada, tapando
   * los fallos de verdad.
   *
   * Solo se acepta por debajo de 500: un `status` de 5xx que venga de una
   * libreria si es un fallo nuestro y debe registrarse como tal.
   */
  const estadoDeclarado = (error as { status?: unknown; statusCode?: unknown } | null)?.status;
  const estadoAlterno = (error as { statusCode?: unknown } | null)?.statusCode;
  const estado = typeof estadoDeclarado === 'number' ? estadoDeclarado : estadoAlterno;

  if (typeof estado === 'number' && estado >= 400 && estado < 500) {
    respuesta.status(estado).json({
      error: {
        codigo: 'VALIDACION',
        mensaje:
          estado === 413
            ? 'El contenido enviado es demasiado grande.'
            : 'No pudimos entender los datos enviados.',
      },
    });
    return;
  }

  // Cualquier otra cosa es un fallo nuestro: se registra completo en el
  // servidor y al cliente se le da un mensaje generico, para no filtrar
  // detalles internos de la aplicacion.
  console.error('[ERROR NO CONTROLADO]', error);
  respuesta.status(500).json({
    error: {
      codigo: 'ERROR_INTERNO',
      mensaje: 'Ocurrio un error inesperado. Intentalo de nuevo en un momento.',
    },
  });
}

/** Se exporta para que las pruebas puedan comprobar el mapeo. */
export const ERRORES_MAPEADOS = {
  ErrorDeValidacion,
  ErrorNoEncontrado,
  ErrorDeConflicto,
  ErrorDeAutenticacion,
  ErrorDeAutorizacion,
  ErrorDeReglaDeNegocio,
};
