import type { NextFunction, Request, Response } from 'express';
import { Identificador } from '../../../domain/shared/Identificador.js';
import { ErrorDeAutenticacion, ErrorDeAutorizacion } from '../../../domain/shared/errores.js';
import type { ServicioDeTokens, TipoDeUsuario } from '../../../application/ports/ServicioDeTokens.js';
import type { Solicitante } from '../../../application/services/PoliticaDeAcceso.js';

/** Se anade el solicitante ya resuelto a la peticion de Express. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      solicitante?: Solicitante;
    }
  }
}

/**
 * MIDDLEWARE de autenticacion.
 *
 * Traduce el encabezado "Authorization: Bearer <token>" en un objeto
 * Solicitante que los casos de uso entienden. A partir de aqui, nada mas
 * en el sistema vuelve a saber que existen los JWT.
 */
export function autenticar(tokens: ServicioDeTokens) {
  return (peticion: Request, _respuesta: Response, siguiente: NextFunction): void => {
    const encabezado = peticion.headers.authorization ?? '';
    const [esquema, token] = encabezado.split(' ');

    if (esquema !== 'Bearer' || !token) {
      return siguiente(
        new ErrorDeAutenticacion('Falta el token de sesion. Inicia sesion de nuevo.'),
      );
    }

    const sesion = tokens.verificar(token);
    if (!sesion) {
      return siguiente(
        new ErrorDeAutenticacion('Tu sesion expiro o no es valida. Inicia sesion de nuevo.'),
      );
    }

    peticion.solicitante = {
      id: Identificador.desde(sesion.usuarioId),
      tipo: sesion.tipo,
    };
    siguiente();
  };
}

/** Restringe una ruta a un tipo de usuario concreto. */
export function exigirTipo(tipo: TipoDeUsuario) {
  return (peticion: Request, _respuesta: Response, siguiente: NextFunction): void => {
    if (peticion.solicitante?.tipo !== tipo) {
      return siguiente(
        new ErrorDeAutorizacion(
          tipo === 'PACIENTE'
            ? 'Esta accion solo puede realizarla un paciente.'
            : 'Esta accion solo puede realizarla un cuidador.',
        ),
      );
    }
    siguiente();
  };
}

/** Atajo tipado para leer el solicitante ya verificado. */
export function solicitanteDe(peticion: Request): Solicitante {
  if (!peticion.solicitante) {
    throw new ErrorDeAutenticacion('No hay una sesion activa.');
  }
  return peticion.solicitante;
}
