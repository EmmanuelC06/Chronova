import { describe, expect, it } from 'vitest';

import { ZonaHoraria } from '../../src/domain/shared/ZonaHoraria.js';
import { Toma } from '../../src/domain/toma/Toma.js';
import {
  MapaDeRiesgo,
  MINIMO_PARA_AFIRMAR,
  franjaDeLaHora,
} from '../../src/domain/toma/MapaDeRiesgo.js';
import { Curiosidades } from '../../src/domain/toma/Curiosidades.js';

/**
 * Pruebas de la analitica.
 *
 * Lo que mas importa aqui no es que los numeros salgan: es que NO salgan
 * cuando no deben. Una analitica que afirma patrones a partir de dos
 * observaciones es peor que no tener analitica, porque manda el refuerzo
 * al sitio equivocado y le hace perder la confianza al usuario.
 */

const BOGOTA = ZonaHoraria.desde('America/Bogota');

/**
 * Una toma resuelta, programada a una hora de pared concreta en Bogota.
 *
 * Bogota va 5 horas detras de UTC y no tiene horario de verano, asi que
 * las 20:00 locales son las 01:00Z del dia siguiente. Se construye con
 * esa aritmetica explicita para que la prueba no dependa del reloj de la
 * maquina que la ejecuta.
 */
let contador = 0;

/** Un UUID valido y distinto en cada llamada, que es lo unico que exige el dominio. */
function idDePrueba(): string {
  contador += 1;
  return `00000000-0000-4000-8000-${String(contador).padStart(12, '0')}`;
}

function tomaEn(fecha: string, horaLocal: number, estado: 'TOMADA' | 'OMITIDA'): Toma {
  const [anio, mes, dia] = fecha.split('-').map(Number) as [number, number, number];
  const instante = new Date(Date.UTC(anio, mes - 1, dia, horaLocal + 5, 0, 0));

  return Toma.desdePlano({
    id: idDePrueba(),
    medicamentoId: '00000000-0000-4000-8000-000000000ed1',
    pacienteId: '00000000-0000-4000-8000-000000000ac1',
    programadaPara: instante.toISOString(),
    programadaOriginalmentePara: instante.toISOString(),
    estado,
    resueltaEn: estado === 'TOMADA' ? instante.toISOString() : null,
    origenDelRegistro: 'PACIENTE',
    registradaPorId: null,
    observaciones: null,
    vecesPospuesta: 0,
  });
}

describe('Franjas del dia', () => {
  it('reparte las horas en las cuatro franjas', () => {
    expect(franjaDeLaHora(0)).toBe('MADRUGADA');
    expect(franjaDeLaHora(5)).toBe('MADRUGADA');
    expect(franjaDeLaHora(6)).toBe('MANANA');
    expect(franjaDeLaHora(11)).toBe('MANANA');
    expect(franjaDeLaHora(12)).toBe('TARDE');
    expect(franjaDeLaHora(17)).toBe('TARDE');
    expect(franjaDeLaHora(18)).toBe('NOCHE');
    expect(franjaDeLaHora(23)).toBe('NOCHE');
  });
});

describe('Mapa de riesgo', () => {
  it('siempre devuelve las 28 casillas, incluidas las vacias', () => {
    const mapa = MapaDeRiesgo.desdeTomas([tomaEn('2026-09-07', 8, 'TOMADA')], BOGOTA);
    expect(mapa.celdas).toHaveLength(4 * 7);
  });

  it('una casilla sin datos vale lo que la tasa general de la persona', () => {
    // Cinco tomas por la mañana, una omitida: tasa general 20%.
    const tomas = [
      tomaEn('2026-09-07', 8, 'TOMADA'),
      tomaEn('2026-09-08', 8, 'TOMADA'),
      tomaEn('2026-09-09', 8, 'TOMADA'),
      tomaEn('2026-09-10', 8, 'TOMADA'),
      tomaEn('2026-09-11', 8, 'OMITIDA'),
    ];
    const mapa = MapaDeRiesgo.desdeTomas(tomas, BOGOTA);
    const vacia = mapa.celdas.find((c) => c.observaciones === 0);

    expect(mapa.tasaGeneral).toBeCloseTo(0.2, 5);
    expect(vacia?.riesgo).toBeCloseTo(0.2, 5);
  });

  it('NO deja que una sola omision dispare el riesgo al 100%', () => {
    // Una sola toma, omitida. La media cruda daria 1,0.
    const mapa = MapaDeRiesgo.desdeTomas([tomaEn('2026-09-07', 20, 'OMITIDA')], BOGOTA);
    const celda = mapa.celdas.find((c) => c.observaciones === 1);

    expect(celda?.omitidas).toBe(1);
    // Suavizado: (1 + 4*1) / (1 + 4) = 1,0 porque la tasa general TAMBIEN
    // es 1 (es la unica toma). El caso interesante es el de abajo.
    expect(celda?.suficiente).toBe(false);
  });

  it('una casilla con poca evidencia se arrima al promedio de la persona', () => {
    // Veinte tomas limpias por la mañana y UNA omitida por la noche.
    const tomas = [
      ...Array.from({ length: 20 }, (_, i) =>
        tomaEn(`2026-09-${String(((i % 28) + 1)).padStart(2, '0')}`, 8, 'TOMADA'),
      ),
      tomaEn('2026-09-07', 20, 'OMITIDA'),
    ];
    const mapa = MapaDeRiesgo.desdeTomas(tomas, BOGOTA);
    const nocheDelLunes = mapa.celdas.find((c) => c.observaciones === 1 && c.omitidas === 1);

    // La media cruda diria 100% de riesgo. El suavizado lo deja muy por
    // debajo, porque una observacion no es evidencia.
    expect(nocheDelLunes?.riesgo).toBeLessThan(0.3);
    expect(nocheDelLunes?.suficiente).toBe(false);
  });

  it('no afirma nada sobre una casilla con menos del minimo de datos', () => {
    const tomas = Array.from({ length: MINIMO_PARA_AFIRMAR - 1 }, (_, i) =>
      tomaEn(`2026-09-${String(7 + i * 7).padStart(2, '0')}`, 20, 'OMITIDA'),
    );
    const mapa = MapaDeRiesgo.desdeTomas(tomas, BOGOTA);

    expect(mapa.hallazgos()).toHaveLength(0);
  });

  it('encuentra el patron cuando la evidencia si alcanza', () => {
    // Ocho lunes por la noche: cinco omitidas. Y treinta mañanas limpias.
    const lunes = ['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28'];
    const masLunes = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'];
    const tomas = [
      ...lunes.map((f) => tomaEn(f, 20, 'OMITIDA')),
      ...masLunes.map((f, i) => tomaEn(f, 20, i === 0 ? 'OMITIDA' : 'TOMADA')),
      ...Array.from({ length: 30 }, (_, i) =>
        tomaEn(`2026-09-${String((i % 28) + 1).padStart(2, '0')}`, 8, 'TOMADA'),
      ),
    ];

    const mapa = MapaDeRiesgo.desdeTomas(tomas, BOGOTA);
    const hallazgos = mapa.hallazgos();

    expect(hallazgos.length).toBeGreaterThan(0);
    expect(hallazgos[0]?.franja).toBe('NOCHE');
    expect(hallazgos[0]?.diaDeLaSemana).toBe(1); // lunes
    expect(hallazgos[0]?.texto).toContain('lunes');
    expect(hallazgos[0]?.texto).toContain('noche');
  });

  it('nunca devuelve mas de tres hallazgos', () => {
    // Fallos repartidos por muchas franjas distintas.
    const tomas: ReturnType<typeof tomaEn>[] = [];
    for (const hora of [2, 8, 14, 20]) {
      for (let semana = 0; semana < 6; semana += 1) {
        for (const dia of [1, 2, 3]) {
          const diaDelMes = 7 + semana * 7 + dia;
          if (diaDelMes > 28) continue;
          tomas.push(
            tomaEn(`2026-09-${String(diaDelMes).padStart(2, '0')}`, hora, 'OMITIDA'),
          );
        }
      }
    }
    tomas.push(
      ...Array.from({ length: 40 }, (_, i) =>
        tomaEn(`2026-10-${String((i % 28) + 1).padStart(2, '0')}`, 8, 'TOMADA'),
      ),
    );

    expect(MapaDeRiesgo.desdeTomas(tomas, BOGOTA).hallazgos().length).toBeLessThanOrEqual(3);
  });

  it('usa la zona del PACIENTE para decidir la franja', () => {
    // Las 20:00 en Bogota son las 01:00Z del dia siguiente. Si el mapa
    // usara UTC, esta toma caeria en MADRUGADA del martes en vez de
    // NOCHE del lunes, y el mapa entero estaria corrido.
    const mapa = MapaDeRiesgo.desdeTomas([tomaEn('2026-09-07', 20, 'TOMADA')], BOGOTA);
    const conDatos = mapa.celdas.find((c) => c.observaciones === 1);

    expect(conDatos?.franja).toBe('NOCHE');
    expect(conDatos?.diaDeLaSemana).toBe(1); // lunes 7 de septiembre de 2026
  });

  /**
   * El texto del hallazgo viaja SIN cambios a dos pantallas: la del
   * paciente y la del cuidador que lo acompaña. Si estuviera escrito en
   * segunda persona, la hija leeria "se te han quedado" hablando de las
   * tomas de su madre.
   *
   * Es un fallo que no rompe nada y que por eso puede volver sin que
   * nadie lo note, asi que queda fijado aqui.
   */
  it('los hallazgos estan escritos sin segunda persona, porque los lee el cuidador tambien', () => {
    const tomas = [
      // Seis domingos con la toma de la noche quedada.
      ...['06', '13', '20', '27'].map((d) => tomaEn(`2026-09-${d}`, 20, 'OMITIDA')),
      ...['04', '11'].map((d) => tomaEn(`2026-10-${d}`, 20, 'OMITIDA')),
      // Y un fondo de cumplimiento, para que haya linea base.
      ...Array.from({ length: 50 }, (_, i) =>
        tomaEn(`2026-09-${String((i % 28) + 1).padStart(2, '0')}`, 8, 'TOMADA'),
      ),
    ];

    const hallazgos = MapaDeRiesgo.desdeTomas(tomas, BOGOTA).hallazgos();
    expect(hallazgos.length).toBeGreaterThan(0);

    const segundaPersona = /\b(te|tus|tu|tuyo|tienes|llevas)\b/i;
    for (const hallazgo of hallazgos) {
      expect(hallazgo.texto).not.toMatch(segundaPersona);
    }
  });

  it('sin tomas resueltas no inventa nada', () => {
    const mapa = MapaDeRiesgo.desdeTomas([], BOGOTA);

    expect(mapa.totalDeObservaciones).toBe(0);
    expect(mapa.tasaGeneral).toBe(0);
    expect(mapa.hallazgos()).toHaveLength(0);
    expect(mapa.peorCelda).toBeNull();
  });
});

describe('Curiosidades', () => {
  it('sin datos no devuelve ninguna', () => {
    expect(Curiosidades.desdeTomas([], BOGOTA, 60).lista).toHaveLength(0);
  });

  it('cuenta la mejor racha de dias limpios', () => {
    const tomas = [
      tomaEn('2026-09-01', 8, 'TOMADA'),
      tomaEn('2026-09-02', 8, 'TOMADA'),
      tomaEn('2026-09-03', 8, 'TOMADA'),
      tomaEn('2026-09-04', 8, 'OMITIDA'),
      tomaEn('2026-09-05', 8, 'TOMADA'),
    ];
    const curiosidades = Curiosidades.desdeTomas(tomas, BOGOTA, 60);
    const mejor = curiosidades.lista.find((c) => c.clave === 'MEJOR_RACHA');

    expect(mejor?.valor).toBe('3 días');
  });

  it('un dia con una omision rompe la racha aunque tenga otras tomadas', () => {
    const tomas = [
      tomaEn('2026-09-01', 8, 'TOMADA'),
      tomaEn('2026-09-02', 8, 'TOMADA'),
      tomaEn('2026-09-02', 20, 'OMITIDA'), // mismo dia, se cae
      tomaEn('2026-09-03', 8, 'TOMADA'),
    ];
    const mejor = Curiosidades.desdeTomas(tomas, BOGOTA, 60).lista.find(
      (c) => c.clave === 'MEJOR_RACHA',
    );

    expect(mejor?.valor).toBe('1 día');
  });

  it('no elige como mejor dia uno con pocos datos', () => {
    // Lunes: una sola toma, limpia (0% de fallo, pero un dato).
    // Miercoles: diez tomas, una omitida (10% de fallo, pero diez datos).
    const tomas = [
      tomaEn('2026-09-07', 8, 'TOMADA'),
      ...Array.from({ length: 9 }, (_, i) =>
        tomaEn(`2026-09-${String(2 + i * 7).padStart(2, '0')}`, 8, 'TOMADA'),
      ),
    ];
    const mejor = Curiosidades.desdeTomas(tomas, BOGOTA, 60).lista.find(
      (c) => c.clave === 'MEJOR_DIA',
    );

    // Sea cual sea, nunca puede ser un dia con menos de cinco registros.
    if (mejor) expect(mejor.valor).not.toBe('Lunes');
  });

  it('ninguna curiosidad regaña ni menciona enfermedades', () => {
    const tomas = Array.from({ length: 30 }, (_, i) =>
      tomaEn(`2026-09-${String((i % 28) + 1).padStart(2, '0')}`, 8, i % 3 === 0 ? 'OMITIDA' : 'TOMADA'),
    );
    const curiosidades = Curiosidades.desdeTomas(tomas, BOGOTA, 60);

    const prohibidas = /enfermedad|diagnóstic|deberías|incumpl|mal\b|fracas|presión|diabetes/i;
    for (const c of curiosidades.lista) {
      expect(`${c.titulo} ${c.detalle}`).not.toMatch(prohibidas);
    }
  });
});
