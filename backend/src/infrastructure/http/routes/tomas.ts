import { Router } from 'express';
import type { Contenedor } from '../../../contenedor.js';
import { asincrono } from '../middlewares/asincrono.js';
import { autenticar, solicitanteDe } from '../middlewares/autenticacion.js';
import { esquemaDeRegistroDeToma } from '../dtos/esquemas.js';

/** Rutas de agenda, registro de tomas e historial de adherencia. */
export function rutasDeTomas(contenedor: Contenedor): Router {
  const router = Router();
  const { casosDeUso, tokens } = contenedor;

  router.use(autenticar(tokens));

  // GET /api/tomas/agenda?fecha=2026-08-31&pacienteId=...
  router.get(
    '/agenda',
    asincrono(async (peticion, respuesta) => {
      const solicitante = solicitanteDe(peticion);
      const agenda = await casosDeUso.obtenerAgendaDelDia.ejecutar({
        solicitante,
        pacienteId: (peticion.query.pacienteId as string) ?? solicitante.id.valor,
        fecha: peticion.query.fecha as string | undefined,
      });
      respuesta.json(agenda);
    }),
  );

  // POST /api/tomas/:id/registro
  router.post(
    '/:id/registro',
    asincrono(async (peticion, respuesta) => {
      const datos = esquemaDeRegistroDeToma.parse(peticion.body);
      const resultado = await casosDeUso.registrarToma.ejecutar({
        solicitante: solicitanteDe(peticion),
        tomaId: peticion.params.id as string,
        ...datos,
      });
      respuesta.json(resultado);
    }),
  );

  // GET /api/tomas/historial?desde=...&hasta=...&medicamentoId=...
  router.get(
    '/historial',
    asincrono(async (peticion, respuesta) => {
      const solicitante = solicitanteDe(peticion);
      const historial = await casosDeUso.consultarHistorial.ejecutar({
        solicitante,
        pacienteId: (peticion.query.pacienteId as string) ?? solicitante.id.valor,
        desde: peticion.query.desde as string | undefined,
        hasta: peticion.query.hasta as string | undefined,
        medicamentoId: peticion.query.medicamentoId as string | undefined,
      });
      respuesta.json(historial);
    }),
  );

  return router;
}
