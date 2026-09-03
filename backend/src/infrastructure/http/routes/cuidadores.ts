import { Router } from 'express';
import type { Contenedor } from '../../../contenedor.js';
import { asincrono } from '../middlewares/asincrono.js';
import { autenticar, exigirTipo, solicitanteDe } from '../middlewares/autenticacion.js';
import {
  esquemaDeConsultaDelPanel,
  esquemaDePermisos,
  esquemaDeRespuestaAVinculo,
  esquemaDeSolicitudDeVinculo,
} from '../dtos/esquemas.js';

/** Rutas del vinculo cuidador-paciente y del panel de seguimiento. */
export function rutasDeCuidadores(contenedor: Contenedor): Router {
  const router = Router();
  const { casosDeUso } = contenedor;

  router.use(autenticar(casosDeUso.verificarSesion));

  // POST /api/vinculos  (lo puede iniciar cualquiera de las dos partes)
  router.post(
    '/vinculos',
    asincrono(async (peticion, respuesta) => {
      const datos = esquemaDeSolicitudDeVinculo.parse(peticion.body);
      const vinculo = await casosDeUso.solicitarVinculo.ejecutar({
        solicitante: solicitanteDe(peticion),
        ...datos,
      });
      respuesta.status(201).json(vinculo);
    }),
  );

  // POST /api/vinculos/:id/respuesta  (solo el paciente decide)
  router.post(
    '/vinculos/:id/respuesta',
    exigirTipo('PACIENTE'),
    asincrono(async (peticion, respuesta) => {
      const datos = esquemaDeRespuestaAVinculo.parse(peticion.body);
      const vinculo = await casosDeUso.responderSolicitudDeVinculo.ejecutar({
        solicitante: solicitanteDe(peticion),
        vinculoId: peticion.params.id as string,
        ...datos,
      });
      respuesta.json(vinculo);
    }),
  );

  // PATCH /api/vinculos/:id/permisos
  router.patch(
    '/vinculos/:id/permisos',
    exigirTipo('PACIENTE'),
    asincrono(async (peticion, respuesta) => {
      const permisos = esquemaDePermisos.parse(peticion.body);
      const vinculo = await casosDeUso.cambiarPermisosDelVinculo.ejecutar({
        solicitante: solicitanteDe(peticion),
        vinculoId: peticion.params.id as string,
        permisos,
      });
      respuesta.json(vinculo);
    }),
  );

  // GET /api/cuidadores/pacientes  -> panel del cuidador
  router.get(
    '/cuidadores/pacientes',
    exigirTipo('CUIDADOR'),
    asincrono(async (peticion, respuesta) => {
      const { dias } = esquemaDeConsultaDelPanel.parse(peticion.query);
      const pacientes = await casosDeUso.listarPacientesDelCuidador.ejecutar({
        solicitante: solicitanteDe(peticion),
        dias,
      });
      respuesta.json({ pacientes });
    }),
  );

  // GET /api/pacientes/cuidadores  -> quien acompana al paciente
  router.get(
    '/pacientes/cuidadores',
    exigirTipo('PACIENTE'),
    asincrono(async (peticion, respuesta) => {
      const cuidadores = await casosDeUso.listarCuidadoresDelPaciente.ejecutar({
        solicitante: solicitanteDe(peticion),
      });
      respuesta.json({ cuidadores });
    }),
  );

  return router;
}
