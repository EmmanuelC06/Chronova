import type { NextFunction, Request, Response } from 'express';
import { ErrorDeAutenticacion, ErrorDeAutorizacion } from '../../../domain/shared/errores.js';
import type { TipoDeUsuario } from '../../../application/ports/ServicioDeTokens.js';
import type { VerificarSesion } from '../../../application/use-cases/auth/VerificarSesion.js';
import type { Solicitante } from '../../../application/services/PoliticaDeAcceso.js';

/**
 * Cabecera por la que viaja un token de recambio.
 *
 * La app la lee en cada respuesta y, si viene, reemplaza el token que
 * tenia guardado. Se eligio una cabecera y no un campo en el cuerpo
 * porque asi funciona igual en las 30 rutas sin tocar ni una: el cuerpo
 * de cada respuesta sigue siendo exactamente lo que la ruta devuelve.
 */
export const CABECERA_DE_RENOVACION = 'X-Sesion-Renovada';

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
 *
 * Este archivo no decide NADA sobre si una sesion vale: solo lee la
 * cabecera, se lo pregunta al caso de uso y escribe la respuesta. La
 * regla —cuenta activa, token posterior al ultimo cambio de contrasena,
 * renovacion si esta a punto de caducar— vive en VerificarSesion, que se
 * puede probar sin levantar un servidor.
 */
export function autenticar(verificarSesion: VerificarSesion) {
  return async (
    peticion: Request,
    respuesta: Response,
    siguiente: NextFunction,
  ): Promise<void> => {
    const encabezado = peticion.headers.authorization ?? '';
    const [esquema, token] = encabezado.split(' ');

    if (esquema !== 'Bearer' || !token) {
      return siguiente(
        new ErrorDeAutenticacion('Falta el token de sesion. Inicia sesion de nuevo.'),
      );
    }

    try {
      const { solicitante, tokenRenovado } = await verificarSesion.ejecutar(token);
      peticion.solicitante = solicitante;

      if (tokenRenovado) {
        respuesta.setHeader(CABECERA_DE_RENOVACION, tokenRenovado);
      }
      siguiente();
    } catch (problema) {
      siguiente(problema);
    }
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
