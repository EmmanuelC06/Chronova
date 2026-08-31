import { Router } from 'express';
import type { Contenedor } from '../../../contenedor.js';
import { asincrono } from '../middlewares/asincrono.js';
import { autenticar, exigirTipo, solicitanteDe } from '../middlewares/autenticacion.js';
import {
  esquemaDeInicioDeSesion,
  esquemaDePreferencias,
  esquemaDeRegistroDeCuidador,
  esquemaDeRegistroDePaciente,
} from '../dtos/esquemas.js';

/**
 * Rutas de autenticacion y perfil.
 *
 * Un controlador aqui hace exactamente tres cosas: validar la forma de
 * la entrada, llamar al caso de uso y devolver el resultado. Ninguna
 * regla de negocio. Si un controlador crece, es senal de que hay logica
 * que deberia estar en un caso de uso o en el dominio.
 */
export function rutasDeAutenticacion(contenedor: Contenedor): Router {
  const router = Router();
  const { casosDeUso, tokens } = contenedor;

  // POST /api/auth/registro/paciente
  router.post(
    '/registro/paciente',
    asincrono(async (peticion, respuesta) => {
      const datos = esquemaDeRegistroDePaciente.parse(peticion.body);
      const resultado = await casosDeUso.registrarPaciente.ejecutar(datos);
      respuesta.status(201).json(resultado);
    }),
  );

  // POST /api/auth/registro/cuidador
  router.post(
    '/registro/cuidador',
    asincrono(async (peticion, respuesta) => {
      const datos = esquemaDeRegistroDeCuidador.parse(peticion.body);
      const resultado = await casosDeUso.registrarCuidador.ejecutar(datos);
      respuesta.status(201).json(resultado);
    }),
  );

  // POST /api/auth/sesion
  router.post(
    '/sesion',
    asincrono(async (peticion, respuesta) => {
      const datos = esquemaDeInicioDeSesion.parse(peticion.body);
      const resultado = await casosDeUso.iniciarSesion.ejecutar(datos);
      respuesta.json(resultado);
    }),
  );

  // GET /api/auth/perfil
  router.get(
    '/perfil',
    autenticar(tokens),
    asincrono(async (peticion, respuesta) => {
      const solicitante = solicitanteDe(peticion);
      const perfil = await casosDeUso.obtenerPerfil.ejecutar({
        usuarioId: solicitante.id.valor,
        tipo: solicitante.tipo,
      });
      respuesta.json(perfil);
    }),
  );

  // PATCH /api/auth/preferencias
  router.patch(
    '/preferencias',
    autenticar(tokens),
    exigirTipo('PACIENTE'),
    asincrono(async (peticion, respuesta) => {
      const datos = esquemaDePreferencias.parse(peticion.body);
      const preferencias = await casosDeUso.actualizarPreferencias.ejecutar({
        pacienteId: solicitanteDe(peticion).id.valor,
        ...datos,
      });
      respuesta.json(preferencias);
    }),
  );

  return router;
}
