import { describe, expect, it } from 'vitest';

import {
  MAXIMO_DE_PERIODOS,
  MAXIMO_DE_TEMAS,
  TemasDeInteres,
  TEMAS_DISPONIBLES,
} from '../../src/domain/paciente/TemasDeInteres.js';
import { comoPaciente, montarAplicacion } from '../ayudas.js';

/**
 * Los temas de interes del paciente.
 *
 * Lo que se fija aqui no es que se puedan guardar, que es lo facil. Es
 * que la lista sea CERRADA, que el reporte pueda preguntar por un
 * PERIODO y no por el instante, que solo los cambie su dueño y que una
 * fila estropeada no impida entrar a la cuenta.
 */
describe('Temas de interes', () => {
  const registro = {
    nombre: 'Rosa Valencia',
    email: 'rosa@temas.test',
    contrasena: 'contrasena-segura',
    zonaHoraria: 'America/Bogota',
    aceptaPoliticaDeDatos: true,
  };

  const EN_ABRIL = new Date('2026-04-10T15:00:00Z');
  const EN_JULIO = new Date('2026-07-10T15:00:00Z');
  const EN_OCTUBRE = new Date('2026-10-10T15:00:00Z');

  describe('lo marcado ahora', () => {
    it('nace vacio, porque nadie elige por el paciente', () => {
      expect(TemasDeInteres.ninguno().estanVacios).toBe(true);
      expect(TemasDeInteres.ninguno().vigentes).toEqual([]);
    });

    it('acepta las claves del catalogo', () => {
      const temas = TemasDeInteres.ninguno().cambiarA(['SUENO', 'MEMORIA'], EN_ABRIL);
      expect(temas.vigentes).toEqual(['MEMORIA', 'SUENO']);
    });

    it('guarda en el orden del catalogo y no en el de llegada', () => {
      // Dos personas que marcan lo mismo en distinto orden tienen que
      // producir la misma frase en el reporte.
      const uno = TemasDeInteres.ninguno().cambiarA(['ANIMO', 'MEMORIA', 'SUENO'], EN_ABRIL);
      const otro = TemasDeInteres.ninguno().cambiarA(['SUENO', 'ANIMO', 'MEMORIA'], EN_ABRIL);
      expect(uno.vigentes).toEqual(otro.vigentes);
    });

    it('RECHAZA cualquier clave que no este en el catalogo', () => {
      // Esta es la prueba importante. Si esto pasara, el campo seria
      // texto libre y acabaria guardando nombres de enfermedades.
      const vacio = TemasDeInteres.ninguno();
      expect(() => vacio.cambiarA(['DIABETES'], EN_ABRIL)).toThrow(/no es un tema/i);
      expect(() => vacio.cambiarA(['me duele la espalda'], EN_ABRIL)).toThrow(/no es un tema/i);
      expect(() => vacio.cambiarA([''], EN_ABRIL)).toThrow(/no es un tema/i);
      expect(() => vacio.cambiarA([42], EN_ABRIL)).toThrow(/texto/i);
    });

    it('ignora los repetidos en vez de rechazar la peticion', () => {
      const temas = TemasDeInteres.ninguno().cambiarA(['SUENO', 'SUENO', 'SUENO'], EN_ABRIL);
      expect(temas.vigentes).toEqual(['SUENO']);
    });

    it('no deja marcar mas del maximo', () => {
      expect(() => TemasDeInteres.ninguno().cambiarA(TEMAS_DISPONIBLES, EN_ABRIL)).toThrow(
        /máximo/i,
      );
      expect(TEMAS_DISPONIBLES.length).toBeGreaterThan(MAXIMO_DE_TEMAS);
    });

    it('reemplaza la lista entera, no la va sumando', () => {
      // Dos telefonos de la misma persona no pueden acabar sumando temas
      // que ella ya habia quitado en el otro.
      const temas = TemasDeInteres.ninguno()
        .cambiarA(['SUENO', 'ANIMO'], EN_ABRIL)
        .cambiarA(['SUENO'], EN_JULIO);
      expect(temas.vigentes).toEqual(['SUENO']);
    });
  });

  describe('la historia, que es de lo que vive el reporte', () => {
    it('un tema que se tuvo y se quito SIGUE contando para su periodo', () => {
      // El caso que motivo todo esto. El animo estuvo marcado de abril a
      // julio: un reporte de abril a octubre tiene que mencionarlo,
      // aunque hoy ya no este marcado.
      const temas = TemasDeInteres.ninguno()
        .cambiarA(['ANIMO'], EN_ABRIL)
        .cambiarA([], EN_JULIO);

      expect(temas.vigentes).toEqual([]);
      expect(temas.marcadosEntre(EN_ABRIL, EN_OCTUBRE)).toEqual(['ANIMO']);
    });

    it('un tema marcado DESPUES del periodo no se cuela en el', () => {
      // El otro lado del mismo error: marcar el sueño en octubre no
      // puede insinuar que interesaba desde abril.
      const temas = TemasDeInteres.ninguno().cambiarA(['SUENO'], EN_OCTUBRE);

      expect(temas.marcadosEntre(EN_ABRIL, EN_JULIO)).toEqual([]);
      expect(temas.marcadosEntre(EN_ABRIL, EN_OCTUBRE)).toEqual(['SUENO']);
    });

    it('un tema que se quito ANTES del periodo tampoco aparece', () => {
      const temas = TemasDeInteres.ninguno()
        .cambiarA(['MEMORIA'], EN_ABRIL)
        .cambiarA([], new Date('2026-05-01T00:00:00Z'));

      expect(temas.marcadosEntre(EN_JULIO, EN_OCTUBRE)).toEqual([]);
    });

    it('distingue lo que estuvo en el periodo de lo que sigue marcado', () => {
      const temas = TemasDeInteres.ninguno()
        .cambiarA(['ANIMO'], EN_ABRIL)
        .cambiarA(['SUENO'], EN_JULIO);

      expect(temas.marcadosEntre(EN_ABRIL, EN_OCTUBRE)).toEqual(['SUENO', 'ANIMO']);
      expect(temas.vigentes).toEqual(['SUENO']);
    });

    it('volver a mandar lo mismo no parte el periodo ni mueve la fecha', () => {
      // La pantalla guarda en cada toque y un reintento de red no debe
      // inventar historia: si fuera asi, un tema marcado en abril
      // pareceria marcado hoy y se perderia el periodo real.
      const temas = TemasDeInteres.ninguno()
        .cambiarA(['SUENO'], EN_ABRIL)
        .cambiarA(['SUENO'], EN_OCTUBRE);

      expect(temas.periodos).toHaveLength(1);
      expect(temas.periodos[0]!.desde?.toISOString()).toBe(EN_ABRIL.toISOString());
    });

    it('volver a marcar algo que se quito abre un periodo nuevo', () => {
      const temas = TemasDeInteres.ninguno()
        .cambiarA(['SUENO'], EN_ABRIL)
        .cambiarA([], EN_JULIO)
        .cambiarA(['SUENO'], EN_OCTUBRE);

      expect(temas.periodos).toHaveLength(2);
      expect(temas.vigentes).toEqual(['SUENO']);
    });

    it('los extremos del periodo cuentan', () => {
      const temas = TemasDeInteres.ninguno().cambiarA(['CITA'], EN_JULIO);
      // Marcado exactamente el ultimo instante del periodo consultado.
      expect(temas.marcadosEntre(EN_ABRIL, EN_JULIO)).toEqual(['CITA']);
    });

    it('no guarda historia infinita', () => {
      // Una persona indecisa no puede hacer crecer la fila sin limite.
      let temas = TemasDeInteres.ninguno();
      for (let i = 0; i < MAXIMO_DE_PERIODOS + 20; i += 1) {
        temas = temas.cambiarA(i % 2 === 0 ? ['SUENO'] : [], new Date(2026, 0, 1 + i));
      }
      expect(temas.periodos.length).toBeLessThanOrEqual(MAXIMO_DE_PERIODOS);
    });

    it('al podar NUNCA tira un periodo abierto', () => {
      // Tirar uno abierto desmarcaria un tema a espaldas de la persona.
      let temas = TemasDeInteres.ninguno().cambiarA(['SUENO', 'ANIMO'], EN_ABRIL);
      for (let i = 0; i < MAXIMO_DE_PERIODOS + 20; i += 1) {
        temas = temas.cambiarA(
          i % 2 === 0 ? ['SUENO', 'ANIMO', 'CITA'] : ['SUENO', 'ANIMO'],
          new Date(2026, 1, 1 + i),
        );
      }
      expect(temas.vigentes).toEqual(['MEMORIA', 'CITA', 'SUENO', 'ANIMO'].filter((t) =>
        temas.vigentes.includes(t as never),
      ));
      expect(temas.vigentes).toContain('SUENO');
      expect(temas.vigentes).toContain('ANIMO');
    });
  });

  describe('leer lo guardado', () => {
    it('sobrevive a guardar y volver a leer, con sus fechas', () => {
      const original = TemasDeInteres.ninguno()
        .cambiarA(['ANIMO'], EN_ABRIL)
        .cambiarA(['SUENO'], EN_JULIO);

      const revivido = TemasDeInteres.desdePlano(JSON.parse(JSON.stringify(original.toJSON())));

      expect(revivido.vigentes).toEqual(original.vigentes);
      expect(revivido.marcadosEntre(EN_ABRIL, EN_OCTUBRE)).toEqual(['SUENO', 'ANIMO']);
    });

    it('entiende el formato ANTIGUO, de cuando no se guardaba la fecha', () => {
      // Entre que existio el selector y que existio la historia se
      // guardo una lista de cadenas. Esas cuentan "desde siempre", que
      // es lo unico honesto: consta que lo marco y no consta cuando.
      // Lo importante es que no desaparezcan de los reportes.
      const viejo = TemasDeInteres.desdePlano(['SUENO', 'MEMORIA']);

      expect(viejo.vigentes).toEqual(['MEMORIA', 'SUENO']);
      expect(viejo.marcadosEntre(EN_ABRIL, EN_JULIO)).toEqual(['MEMORIA', 'SUENO']);
      expect(viejo.marcadosEntre(new Date('2020-01-01'), new Date('2020-02-01'))).toEqual([
        'MEMORIA',
        'SUENO',
      ]);
    });

    it('una fila ilegible no revienta: se lee como "ninguno"', () => {
      // Esto es una preferencia de lectura. Si se corrompio, lo peor que
      // puede pasar es volver a marcarla; lo que no puede pasar es que
      // bloquee el perfil, y con el la agenda y los recordatorios.
      expect(TemasDeInteres.desdePlano(null).estanVacios).toBe(true);
      expect(TemasDeInteres.desdePlano('SUENO').estanVacios).toBe(true);
      expect(TemasDeInteres.desdePlano(['INVENTADO']).estanVacios).toBe(true);
      expect(TemasDeInteres.desdePlano([{ tema: 'SUENO', desde: 'ayer' }]).estanVacios).toBe(
        true,
      );
      expect(TemasDeInteres.desdePlano([1, 2, 3]).estanVacios).toBe(true);
    });
  });

  describe('a traves del caso de uso', () => {
    it('los guarda y el perfil devuelve los vigentes', async () => {
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

    it('un paciente recien registrado no tiene ninguno', async () => {
      const app = montarAplicacion();
      const { usuario } = await app.contenedor.casosDeUso.registrarPaciente.ejecutar(registro);

      const perfil = await app.contenedor.casosDeUso.obtenerPerfil.ejecutar({
        usuarioId: usuario.id,
        tipo: 'PACIENTE',
      });
      expect(perfil.temasDeInteres).toEqual([]);
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
      expect(revivido.temasDeInteres.vigentes).toEqual(['ALIMENTACION']);
    });
  });

  describe('la analitica los lleva referidos al periodo', () => {
    it('separa lo que estuvo en el periodo de lo que sigue marcado', async () => {
      // El reporte lo puede preparar el cuidador desde su telefono, y su
      // propio perfil no sabe nada de los temas del paciente. Si no
      // viajaran aqui, el reporte del cuidador saldria sin esa linea.
      const app = montarAplicacion(new Date('2026-04-10T15:00:00Z'));
      const { usuario } = await app.contenedor.casosDeUso.registrarPaciente.ejecutar(registro);

      await app.contenedor.casosDeUso.actualizarTemasDeInteres.ejecutar({
        pacienteId: usuario.id,
        temas: ['ANIMO'],
      });

      // Pasa el tiempo y cambia de idea.
      app.reloj.mover(new Date('2026-07-10T15:00:00Z'));
      await app.contenedor.casosDeUso.actualizarTemasDeInteres.ejecutar({
        pacienteId: usuario.id,
        temas: ['SUENO'],
      });

      app.reloj.mover(new Date('2026-10-10T15:00:00Z'));
      const analitica = await app.contenedor.casosDeUso.obtenerAnalitica.ejecutar({
        solicitante: comoPaciente(usuario.id),
        pacienteId: usuario.id,
        desde: '2026-04-01',
        hasta: '2026-10-10',
      });

      expect(analitica.temasDeInteres.enElPeriodo).toEqual(['SUENO', 'ANIMO']);
      expect(analitica.temasDeInteres.vigentes).toEqual(['SUENO']);
    });

    it('un periodo corto no arrastra temas antiguos', async () => {
      const app = montarAplicacion(new Date('2026-04-10T15:00:00Z'));
      const { usuario } = await app.contenedor.casosDeUso.registrarPaciente.ejecutar(registro);

      await app.contenedor.casosDeUso.actualizarTemasDeInteres.ejecutar({
        pacienteId: usuario.id,
        temas: ['ANIMO'],
      });
      app.reloj.mover(new Date('2026-05-01T15:00:00Z'));
      await app.contenedor.casosDeUso.actualizarTemasDeInteres.ejecutar({
        pacienteId: usuario.id,
        temas: [],
      });

      app.reloj.mover(new Date('2026-10-10T15:00:00Z'));
      const analitica = await app.contenedor.casosDeUso.obtenerAnalitica.ejecutar({
        solicitante: comoPaciente(usuario.id),
        pacienteId: usuario.id,
        desde: '2026-09-01',
        hasta: '2026-10-10',
      });

      expect(analitica.temasDeInteres.enElPeriodo).toEqual([]);
    });
  });
});
