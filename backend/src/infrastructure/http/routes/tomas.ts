import { Router } from 'express';
import type { Contenedor } from '../../../contenedor.js';
import { asincrono } from '../middlewares/asincrono.js';
import { autenticar, solicitanteDe } from '../middlewares/autenticacion.js';
import {
  esquemaDeConsultaDeAgenda,
  esquemaDeConsultaDeHistorial,
  esquemaDeRegistroDeToma,
} from '../dtos/esquemas.js';

/** Rutas de agenda, registro de tomas e historial de adherencia. */
export function rutasDeTomas(contenedor: Contenedor): Router {
  const router = Router();
  const { casosDeUso } = contenedor;

  router.use(autenticar(casosDeUso.verificarSesion));

  // GET /api/tomas/agenda?fecha=2026-08-31&pacienteId=...
  router.get(
    '/agenda',
    asincrono(async (peticion, respuesta) => {
      const solicitante = solicitanteDe(peticion);
      const consulta = esquemaDeConsultaDeAgenda.parse(peticion.query);
      const agenda = await casosDeUso.obtenerAgendaDelDia.ejecutar({
        solicitante,
        pacienteId: consulta.pacienteId ?? solicitante.id.valor,
        fecha: consulta.fecha,
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
      const consulta = esquemaDeConsultaDeHistorial.parse(peticion.query);
      const historial = await casosDeUso.consultarHistorial.ejecutar({
        solicitante,
        pacienteId: consulta.pacienteId ?? solicitante.id.valor,
        desde: consulta.desde,
        hasta: consulta.hasta,
        medicamentoId: consulta.medicamentoId,
      });
      respuesta.json(historial);
    }),
  );

  return router;
}
