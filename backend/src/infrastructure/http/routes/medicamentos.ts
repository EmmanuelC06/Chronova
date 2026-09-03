import { Router } from 'express';
import type { Contenedor } from '../../../contenedor.js';
import { asincrono } from '../middlewares/asincrono.js';
import { autenticar, solicitanteDe } from '../middlewares/autenticacion.js';
import {
  esquemaDeMedicamentoActualizado,
  esquemaDeMedicamentoNuevo,
  esquemaDeReabastecimiento,
} from '../dtos/esquemas.js';

/**
 * Rutas de medicamentos.
 *
 * Convencion importante: cuando el paciente actua sobre si mismo no
 * necesita enviar su pacienteId; se toma del token. Un cuidador si debe
 * indicar sobre que paciente actua, y la politica de acceso comprueba
 * que tenga vinculo y permiso.
 */
export function rutasDeMedicamentos(contenedor: Contenedor): Router {
  const router = Router();
  const { casosDeUso } = contenedor;

  router.use(autenticar(casosDeUso.verificarSesion));

  // GET /api/medicamentos?pacienteId=...&incluirSuspendidos=true
  router.get(
    '/',
    asincrono(async (peticion, respuesta) => {
      const solicitante = solicitanteDe(peticion);
      const pacienteId = (peticion.query.pacienteId as string) ?? solicitante.id.valor;

      const lista = await casosDeUso.listarMedicamentos.ejecutar({
        solicitante,
        pacienteId,
        incluirSuspendidos: peticion.query.incluirSuspendidos === 'true',
      });
      respuesta.json({ medicamentos: lista });
    }),
  );

  // POST /api/medicamentos
  router.post(
    '/',
    asincrono(async (peticion, respuesta) => {
      const solicitante = solicitanteDe(peticion);
      const datos = esquemaDeMedicamentoNuevo.parse(peticion.body);

      const medicamento = await casosDeUso.registrarMedicamento.ejecutar({
        solicitante,
        ...datos,
        pacienteId: datos.pacienteId ?? solicitante.id.valor,
      });
      respuesta.status(201).json(medicamento);
    }),
  );

  // PATCH /api/medicamentos/:id
  router.patch(
    '/:id',
    asincrono(async (peticion, respuesta) => {
      const datos = esquemaDeMedicamentoActualizado.parse(peticion.body);
      const medicamento = await casosDeUso.actualizarMedicamento.ejecutar({
        solicitante: solicitanteDe(peticion),
        medicamentoId: peticion.params.id as string,
        ...datos,
      });
      respuesta.json(medicamento);
    }),
  );

  // DELETE /api/medicamentos/:id  (suspende, no borra)
  router.delete(
    '/:id',
    asincrono(async (peticion, respuesta) => {
      const resultado = await casosDeUso.suspenderMedicamento.ejecutar({
        solicitante: solicitanteDe(peticion),
        medicamentoId: peticion.params.id as string,
      });
      respuesta.json(resultado);
    }),
  );

  // POST /api/medicamentos/:id/stock
  router.post(
    '/:id/stock',
    asincrono(async (peticion, respuesta) => {
      const datos = esquemaDeReabastecimiento.parse(peticion.body);
      const medicamento = await casosDeUso.reabastecerStock.ejecutar({
        solicitante: solicitanteDe(peticion),
        medicamentoId: peticion.params.id as string,
        ...datos,
      });
      respuesta.json(medicamento);
    }),
  );

  return router;
}
