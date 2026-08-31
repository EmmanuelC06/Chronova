import { describe, expect, it } from 'vitest';

import { FechaLocal } from '../../src/domain/shared/FechaLocal.js';
import { Hora } from '../../src/domain/shared/Hora.js';
import { ZonaHoraria } from '../../src/domain/shared/ZonaHoraria.js';
import { ErrorDeValidacion } from '../../src/domain/shared/errores.js';

/**
 * Pruebas de fecha local y zona horaria.
 *
 * Existen por un error concreto: las alarmas se agendaban en la hora del
 * SERVIDOR, no en la del paciente. Con el servidor en UTC y la paciente
 * en Colombia, su pastilla de las 08:00 sonaba a las 03:00 de la
 * madrugada. En el portatil del desarrollador nunca se veia, porque ahi
 * ambos relojes coinciden.
 *
 * Estas pruebas fijan el comportamiento correcto para que nadie lo
 * rompa sin darse cuenta.
 */

describe('FechaLocal', () => {
  it('rechaza formatos que no sean AAAA-MM-DD', () => {
    expect(() => FechaLocal.desde('31/08/2026')).toThrow(ErrorDeValidacion);
    expect(() => FechaLocal.desde('2026-8-31')).toThrow(/AAAA-MM-DD/);
  });

  it('rechaza dias que no existen en el calendario', () => {
    expect(() => FechaLocal.desde('2026-02-31')).toThrow(/no existe/);
    expect(() => FechaLocal.desde('2026-13-01')).toThrow(/mes/);
  });

  it('acepta el 29 de febrero solo en anios bisiestos', () => {
    expect(FechaLocal.desde('2028-02-29').toString()).toBe('2028-02-29');
    expect(() => FechaLocal.desde('2026-02-29')).toThrow(/no existe/);
  });

  it('conoce el dia de la semana', () => {
    expect(FechaLocal.desde('2026-08-31').diaDeLaSemana).toBe(1); // lunes
    expect(FechaLocal.desde('2026-09-06').diaDeLaSemana).toBe(0); // domingo
  });

  it('suma dias cruzando el fin de mes y el fin de anio', () => {
    expect(FechaLocal.desde('2026-08-31').sumarDias(1).toString()).toBe('2026-09-01');
    expect(FechaLocal.desde('2026-12-31').sumarDias(1).toString()).toBe('2027-01-01');
    expect(FechaLocal.desde('2026-03-01').sumarDias(-1).toString()).toBe('2026-02-28');
  });

  it('cuenta los dias entre dos fechas', () => {
    const inicio = FechaLocal.desde('2026-08-31');
    expect(inicio.diasHasta(FechaLocal.desde('2026-09-03'))).toBe(3);
    expect(inicio.diasHasta(FechaLocal.desde('2026-08-28'))).toBe(-3);
  });
});

describe('ZonaHoraria', () => {
  const bogota = ZonaHoraria.desde('America/Bogota');

  it('rechaza zonas que no existen', () => {
    expect(() => ZonaHoraria.desde('America/Medellin_Centro')).toThrow(/no es una zona horaria/);
    expect(() => ZonaHoraria.desde('')).toThrow(/obligatoria/);
  });

  it('cae en la zona del proyecto cuando el valor falta o no sirve', () => {
    expect(ZonaHoraria.desdeOPorDefecto(null).valor).toBe('America/Bogota');
    expect(ZonaHoraria.desdeOPorDefecto('inventada/zona').valor).toBe('America/Bogota');
    expect(ZonaHoraria.desdeOPorDefecto('Europe/Madrid').valor).toBe('Europe/Madrid');
  });

  it('traduce la hora de pared del paciente al instante correcto', () => {
    // Colombia va 5 horas detras de UTC: las 08:00 de alla son las 13:00Z.
    const instante = bogota.instanteDe(FechaLocal.desde('2026-09-01'), Hora.desde('08:00'));
    expect(instante.toISOString()).toBe('2026-09-01T13:00:00.000Z');
  });

  it('respeta el horario de verano donde existe', () => {
    const madrid = ZonaHoraria.desde('Europe/Madrid');
    const enVerano = madrid.instanteDe(FechaLocal.desde('2026-07-01'), Hora.desde('08:00'));
    const enInvierno = madrid.instanteDe(FechaLocal.desde('2026-01-15'), Hora.desde('08:00'));

    // Las mismas "8 de la manana" caen en instantes distintos segun la
    // epoca del anio. Por eso se guarda la zona y no un desfase fijo.
    expect(enVerano.toISOString()).toBe('2026-07-01T06:00:00.000Z'); // CEST, +2
    expect(enInvierno.toISOString()).toBe('2026-01-15T07:00:00.000Z'); // CET, +1
  });

  it('la ida y la vuelta devuelven la misma hora de pared', () => {
    const instante = bogota.instanteDe(FechaLocal.desde('2026-09-01'), Hora.desde('20:30'));
    expect(bogota.fechaLocalDe(instante).toString()).toBe('2026-09-01');
    expect(bogota.horaDePareDe(instante)).toBe('20:30');
  });

  it('sabe en que dia del paciente cae un instante, aunque en UTC ya sea otro', () => {
    // Las 02:00Z del 2 de septiembre son las 21:00 del 1 en Bogota.
    const instante = new Date('2026-09-02T02:00:00Z');
    expect(bogota.fechaLocalDe(instante).toString()).toBe('2026-09-01');
  });

  it('el inicio del dia del paciente no es la medianoche UTC', () => {
    const inicio = bogota.inicioDelDia(FechaLocal.desde('2026-09-01'));
    expect(inicio.toISOString()).toBe('2026-09-01T05:00:00.000Z');
  });

  it('funciona igual al este y al oeste de Greenwich', () => {
    const tokio = ZonaHoraria.desde('Asia/Tokyo');
    const instante = tokio.instanteDe(FechaLocal.desde('2026-09-01'), Hora.desde('08:00'));
    // Japon va 9 horas por delante: sus 08:00 son las 23:00Z del dia anterior.
    expect(instante.toISOString()).toBe('2026-08-31T23:00:00.000Z');
  });
});
