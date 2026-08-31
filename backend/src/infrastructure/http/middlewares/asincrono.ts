import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Envoltura para controladores asincronos.
 *
 * Express 4 no captura las promesas rechazadas: si un "async handler"
 * lanza, la peticion se queda colgada para siempre. Esta funcion
 * engancha el .catch() al manejador de errores. Es exactamente el bug
 * que hacia que el MVP anterior se quedara sin responder ante fallos de
 * base de datos.
 */
export function asincrono(manejador: RequestHandler): RequestHandler {
  return (peticion: Request, respuesta: Response, siguiente: NextFunction) => {
    Promise.resolve(manejador(peticion, respuesta, siguiente)).catch(siguiente);
  };
}
