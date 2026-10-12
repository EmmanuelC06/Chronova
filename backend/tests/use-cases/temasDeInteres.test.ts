import { describe, expect, it } from 'vitest';

import {
  MAXIMO_DE_TEMAS,
  TemasDeInteres,
  TEMAS_DISPONIBLES,
} from '../../src/domain/paciente/TemasDeInteres.js';
import { comoPaciente, montarAplicacion } from '../ayudas.js';

/**
 * Los temas de interes del paciente.
 *
 * Lo que se fija aqui no es que se puedan guardar, que es lo facil. Es
 * que la lista sea CERRADA, que solo la cambie su dueño y que una fila
 * estropeada no impida entrar a la cuenta.
 */
describe('Temas de interes', () => {
  const registro = {
    nombre: 'Rosa Valencia',
    email: 'rosa@temas.test',
    contrasena: 'contrasena-segura',
    zonaHoraria: 'America/Bogota',
    aceptaPoliticaDeDatos: true,
  };

  describe('el value object', () => {
    it('nace vacio, porque nadie elige por el paciente', () => {
      expect(TemasDeInteres.ninguno().estanVacios).toBe(true);
      expect(TemasDeInteres.ninguno().toJSON()).toEqual([]);
    });

    it('acepta las claves del catalogo', () => {
      const temas = TemasDeInteres.desde(['SUENO', 'MEMORIA']);
      expect(temas.toJSON()).toEqual(['MEMORIA', 'SUENO']);
    });

    it('guarda en el orden del catalogo y no en el de llegada', () => {
      // Dos personas que marcan lo mismo en distinto orden tienen que
      // producir la misma frase en el reporte.
      const unOrden = TemasDeInteres.desde(['ANIMO', 'MEMORIA', 'SUENO']);
      const otroOrden = TemasDeInteres.desde(['SUENO', 'ANIMO', 'MEMORIA']);
      expect(unOrden.toJSON()).toEqual(otroOrden.toJSON());
    });

    it('RECHAZA cualquier clave que no este en el catalogo', () => {
      // Esta es la prueba importante. Si esto pasara, el campo seria
      // texto libre y acabaria guardando nombres de enfermedades.
      expect(() => TemasDeInteres.desde(['DIABETES'])).toThrow(/no es un tema/i);
      expect(() => TemasDeInteres.desde(['me duele la espalda'])).toThrow(/no es un tema/i);
      expect(() => TemasDeInteres.desde([''])).toThrow(/no es un tema/i);
    });

    it('rechaza lo que no sea texto', () => {
      expect(() => TemasDeInteres.desde([42])).toThrow(/texto/i);
      expect(() => TemasDeInteres.desde([{ clave: 'SUENO' }])).toThrow(/texto/i);
    });

    it('ignora los repetidos en vez de rechazar la peticion', () => {
      // Un doble toque o un reintento de red no es un error del usuario.
      expect(TemasDeInteres.desde(['SUENO', 'SUENO', 'SUENO']).toJSON()).toEqual(['SUENO']);
    });

    it('no deja marcar mas del maximo', () => {
      expect(() => TemasDeInteres.desde(TEMAS_DISPONIBLES)).toThrow(/máximo/i);
      expect(TEMAS_DISPONIBLES.length).toBeGreaterThan(MAXIMO_DE_TEMAS);
    });

    it('una fila guardada ilegible no revienta: se lee como "ninguno"', () => {
      // Esto es una preferencia de lectura. Si se corrompio, lo peor que
      // puede pasar es volver a marcarla; lo que no puede pasar es que
      // bloquee el perfil, y con el la agenda y los recordatorios.
      expect(TemasDeInteres.desdePlano(null).estanVacios).toBe(true);
      expect(TemasDeInteres.desdePlano('SUENO').estanVacios).toBe(true);
      expect(TemasDeInteres.desdePlano(['INVENTADO']).estanVacios).toBe(true);
      expect(TemasDeInteres.desdePlano([1, 2, 3]).estanVacios).toBe(true);
    });
  });

  describe('a traves del caso de uso', () => {
    it('los guarda y el perfil los devuelve', async () => {
      const app = montarAplicacion();
      const { usuario } = await app.contenedor.casosDeUso.registrarPaciente.ejecutar(registro);

      await app.contenedor.casosDeUso.actualizarTemasDeInteres.ejecutar({
        pacienteId: usuario.id,
        temas: ['MOVIMIENTO', 'CITA'],
      });

      const perfil = await app.contenedor.casosDeUso.obtenerPerfil.ejecutar({
        usuarioId: usuario.id,
        tipo: 'PACIENTE',
      });
      expect(perfil.temasDeInteres).toEqual(['CITA', 'MOVIMIENTO']);
    });

    it('reemplaza la lista entera, no la va sumando', async () => {
      // Dos telefonos de la misma persona no pueden acabar sumando temas
      // que ella ya habia quitado en el otro.
      const app = montarAplicacion();
      const { usuario } = await app.contenedor.casosDeUso.registrarPaciente.ejecutar(registro);

      await app.contenedor.casosDeUso.actualizarTemasDeInteres.ejecutar({
        pacienteId: usuario.id,
        temas: ['SUENO', 'ANIMO'],
      });
      await app.contenedor.casosDeUso.actualizarTemasDeInteres.ejecutar({
        pacienteId: usuario.id,
        temas: ['SUENO'],
      });

      const perfil = await app.contenedor.casosDeUso.obtenerPerfil.ejecutar({
        usuarioId: usuario.id,
        tipo: 'PACIENTE',
      });
      expect(perfil.temasDeInteres).toEqual(['SUENO']);
    });

    it('sobreviven a guardar y volver a leer desde el repositorio', async () => {
      const app = montarAplicacion();
      const { usuario } = await app.contenedor.casosDeUso.registrarPaciente.ejecutar(registro);

      await app.contenedor.casosDeUso.actualizarTemasDeInteres.ejecutar({
        pacienteId: usuario.id,
        temas: ['ALIMENTACION'],
      });

      // Ida y vuelta completa: entidad -> plano -> entidad.
      const guardado = await app.pacientes.buscarPorId(comoPaciente(usuario.id).id);
      const { Paciente } = await import('../../src/domain/paciente/Paciente.js');
      const revivido = Paciente.desdePlano(guardado!.aPlano());
      expect(revivido.temasDeInteres.toJSON()).toEqual(['ALIMENTACION']);
    });

    it('un paciente recien registrado no tiene ninguno', async () => {
      const app = montarAplicacion();
      const { usuario } = await app.contenedor.casosDeUso.registrarPaciente.ejecutar(registro);

      const perfil = await app.contenedor.casosDeUso.obtenerPerfil.ejecutar({
        usuarioId: usuario.id,
        tipo: 'PACIENTE',
      });
      expect(perfil.temasDeInteres).toEqual([]);
    });
  });

  describe('la analitica los lleva, para el reporte', () => {
    it('vienen en la respuesta de analitica', async () => {
      // El reporte lo puede preparar el cuidador desde su telefono, y su
      // propio perfil no sabe nada de los temas del paciente. Si no
      // viajaran aqui, el reporte del cuidador saldria sin esa linea.
      const app = montarAplicacion();
      const { usuario } = await app.contenedor.casosDeUso.registrarPaciente.ejecutar(registro);

      await app.contenedor.casosDeUso.actualizarTemasDeInteres.ejecutar({
        pacienteId: usuario.id,
        temas: ['MEMORIA'],
      });

      const analitica = await app.contenedor.casosDeUso.obtenerAnalitica.ejecutar({
        solicitante: comoPaciente(usuario.id),
        pacienteId: usuario.id,
      });
      expect(analitica.temasDeInteres).toEqual(['MEMORIA']);
    });
  });
});
