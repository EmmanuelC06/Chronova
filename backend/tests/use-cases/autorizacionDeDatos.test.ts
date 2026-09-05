import { describe, expect, it } from 'vitest';

import { AutorizacionDeDatos } from '../../src/domain/shared/AutorizacionDeDatos.js';
import { VERSION_VIGENTE_DE_LA_POLITICA } from '../../src/application/services/politicaDeDatos.js';
import { comoPaciente, montarAplicacion } from '../ayudas.js';

/**
 * La autorización de tratamiento de datos.
 *
 * Chronova trata datos de salud, que el artículo 5 de la Ley 1581 de
 * 2012 clasifica como **sensibles**, y el artículo 6 exige para ellos
 * autorización explícita. Estas pruebas fijan tres cosas:
 *
 *  1. Que sin autorización no se cree la cuenta —ni siquiera llamando a
 *     la API directamente, saltándose el formulario—.
 *  2. Que quede constancia de QUÉ versión se aceptó y CUÁNDO, porque el
 *     titular tiene derecho a pedir prueba de ello (art. 8, lit. b).
 *  3. Que una cuenta anterior a este registro se distinga de una que sí
 *     autorizó, en vez de fabricarle una fecha.
 */
describe('Autorizacion de tratamiento de datos', () => {
  const datosDeRegistro = {
    nombre: 'Rosa Valencia',
    email: 'rosa@autorizacion.test',
    contrasena: 'contrasena-segura',
    zonaHoraria: 'America/Bogota',
  };

  describe('sin autorizacion no hay cuenta', () => {
    it('rechaza el registro de un paciente que no autoriza', async () => {
      const app = montarAplicacion();

      await expect(
        app.contenedor.casosDeUso.registrarPaciente.ejecutar({ ...datosDeRegistro } as never),
      ).rejects.toThrow(/autorizar el tratamiento/i);
    });

    it('rechaza tambien si llega explicitamente en falso', async () => {
      const app = montarAplicacion();

      await expect(
        app.contenedor.casosDeUso.registrarPaciente.ejecutar({
          ...datosDeRegistro,
          aceptaPoliticaDeDatos: false,
        }),
      ).rejects.toThrow(/autorizar el tratamiento/i);
    });

    it('rechaza el registro de un cuidador que no autoriza', async () => {
      const app = montarAplicacion();

      await expect(
        app.contenedor.casosDeUso.registrarCuidador.ejecutar({
          nombre: 'Ana Correa',
          email: 'ana@autorizacion.test',
          contrasena: 'contrasena-segura',
        } as never),
      ).rejects.toThrow(/autorizar el tratamiento/i);
    });

    it('no crea la cuenta a medias: el correo sigue libre despues de rechazarla', async () => {
      const app = montarAplicacion();

      await expect(
        app.contenedor.casosDeUso.registrarPaciente.ejecutar({ ...datosDeRegistro } as never),
      ).rejects.toThrow();

      // Si hubiera quedado un registro a medias, este segundo intento
      // fallaria por correo duplicado en vez de funcionar.
      const segundo = await app.contenedor.casosDeUso.registrarPaciente.ejecutar({
        ...datosDeRegistro,
        aceptaPoliticaDeDatos: true,
      });
      expect(segundo.usuario.email).toBe(datosDeRegistro.email);
    });
  });

  describe('queda constancia de que se autorizo', () => {
    it('guarda la version vigente y el instante exacto', async () => {
      const app = montarAplicacion(new Date('2026-09-05T14:32:10Z'));

      const { usuario } = await app.contenedor.casosDeUso.registrarPaciente.ejecutar({
        ...datosDeRegistro,
        aceptaPoliticaDeDatos: true,
      });

      const perfil = await app.contenedor.casosDeUso.obtenerPerfil.ejecutar({
        usuarioId: usuario.id,
        tipo: 'PACIENTE',
      });

      expect(perfil.autorizacionDeDatos).toEqual({
        consta: true,
        versionDePolitica: VERSION_VIGENTE_DE_LA_POLITICA,
        otorgadaEn: '2026-09-05T14:32:10.000Z',
        hayVersionMasReciente: false,
      });
    });

    it('guarda la version que el cliente declara haber mostrado, no la del servidor', async () => {
      const app = montarAplicacion();

      // El texto que la persona tuvo delante es el que hay que poder
      // probar. Si la app va una version atrasada, se registra esa.
      const { usuario } = await app.contenedor.casosDeUso.registrarPaciente.ejecutar({
        ...datosDeRegistro,
        aceptaPoliticaDeDatos: true,
        versionDePolitica: '0.9',
      });

      const perfil = await app.contenedor.casosDeUso.obtenerPerfil.ejecutar({
        usuarioId: usuario.id,
        tipo: 'PACIENTE',
      });

      expect(perfil.autorizacionDeDatos.versionDePolitica).toBe('0.9');
      expect(perfil.autorizacionDeDatos.hayVersionMasReciente).toBe(true);
    });

    it('sobrevive a guardar y volver a leer desde el repositorio', async () => {
      const app = montarAplicacion(new Date('2026-09-05T14:32:10Z'));

      const { usuario } = await app.contenedor.casosDeUso.registrarPaciente.ejecutar({
        ...datosDeRegistro,
        aceptaPoliticaDeDatos: true,
      });

      // Ida y vuelta completa: entidad -> plano -> entidad.
      const guardado = await app.pacientes.buscarPorId(
        comoPaciente(usuario.id).id,
      );
      expect(guardado?.autorizacionDeDatos.constaOtorgada).toBe(true);
      expect(guardado?.autorizacionDeDatos.otorgadaEn.toISOString()).toBe(
        '2026-09-05T14:32:10.000Z',
      );
    });
  });

  describe('cuentas anteriores a este registro', () => {
    it('se distinguen de las que si autorizaron, sin inventarles una fecha', () => {
      const creadoEn = new Date('2026-08-01T10:00:00Z');
      const sinConstancia = AutorizacionDeDatos.sinConstancia(creadoEn);

      expect(sinConstancia.constaOtorgada).toBe(false);
      expect(sinConstancia.versionDePolitica).toBe(AutorizacionDeDatos.SIN_CONSTANCIA);
    });

    it('el perfil las reporta como que no consta, y pide autorizacion nueva', async () => {
      const app = montarAplicacion();
      const { usuario } = await app.contenedor.casosDeUso.registrarPaciente.ejecutar({
        ...datosDeRegistro,
        aceptaPoliticaDeDatos: true,
      });

      // Se simula una fila antigua: la misma persona, sin la columna.
      const guardado = await app.pacientes.buscarPorId(comoPaciente(usuario.id).id);
      const plano = guardado!.aPlano();
      const { Paciente } = await import('../../src/domain/paciente/Paciente.js');
      await app.pacientes.guardar(
        Paciente.desdePlano({ ...plano, autorizacionDeDatos: null }),
      );

      const perfil = await app.contenedor.casosDeUso.obtenerPerfil.ejecutar({
        usuarioId: usuario.id,
        tipo: 'PACIENTE',
      });

      expect(perfil.autorizacionDeDatos.consta).toBe(false);
      expect(perfil.autorizacionDeDatos.otorgadaEn).toBeNull();
      // Sin constancia hay que volver a preguntar.
      expect(perfil.autorizacionDeDatos.hayVersionMasReciente).toBe(true);
    });
  });

  describe('el value object valida lo que guarda', () => {
    it('rechaza una version vacia', () => {
      expect(() =>
        AutorizacionDeDatos.otorgar({ versionDePolitica: '  ', ahora: new Date() }),
      ).toThrow(/version/i);
    });

    it('rechaza algo que no tenga forma de version', () => {
      expect(() =>
        AutorizacionDeDatos.otorgar({ versionDePolitica: 'la ultima', ahora: new Date() }),
      ).toThrow(/version/i);
    });

    it('acepta el formato mayor.menor', () => {
      const autorizacion = AutorizacionDeDatos.otorgar({
        versionDePolitica: '2.13',
        ahora: new Date('2026-09-05T00:00:00Z'),
      });
      expect(autorizacion.versionDePolitica).toBe('2.13');
      expect(autorizacion.esAnteriorA('2.13')).toBe(false);
      expect(autorizacion.esAnteriorA('3.0')).toBe(true);
    });
  });
});
