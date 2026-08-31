import { describe, expect, it } from 'vitest';

import { Email } from '../../src/domain/shared/Email.js';
import { FechaLocal } from '../../src/domain/shared/FechaLocal.js';
import { ZonaHoraria } from '../../src/domain/shared/ZonaHoraria.js';
import { Hora } from '../../src/domain/shared/Hora.js';
import { Identificador } from '../../src/domain/shared/Identificador.js';
import { Telefono } from '../../src/domain/shared/Telefono.js';
import { ErrorDeReglaDeNegocio, ErrorDeValidacion } from '../../src/domain/shared/errores.js';
import { Dosis } from '../../src/domain/medicamento/Dosis.js';
import { Frecuencia } from '../../src/domain/medicamento/Frecuencia.js';
import { Medicamento } from '../../src/domain/medicamento/Medicamento.js';
import { Stock } from '../../src/domain/medicamento/Stock.js';
import { Toma } from '../../src/domain/toma/Toma.js';
import { ResumenDeAdherencia } from '../../src/domain/toma/ResumenDeAdherencia.js';
import { Vinculo } from '../../src/domain/vinculo/Vinculo.js';

const ID_A = Identificador.desde('00000000-0000-4000-8000-000000000001');
const ID_B = Identificador.desde('00000000-0000-4000-8000-000000000002');
const ID_C = Identificador.desde('00000000-0000-4000-8000-000000000003');

// =================================================================
describe('Value objects', () => {
  it('normaliza el correo a minusculas y sin espacios', () => {
    expect(Email.desde('  Rosa@Correo.COM  ').valor).toBe('rosa@correo.com');
  });

  it('rechaza correos con formato invalido', () => {
    expect(() => Email.desde('rosa-arroba-correo')).toThrow(ErrorDeValidacion);
    expect(() => Email.desde('')).toThrow(/obligatorio/);
  });

  it('limpia los separadores del telefono', () => {
    expect(Telefono.desde('+57 (300) 111-2233').valor).toBe('+573001112233');
  });

  it('acepta horas validas y rechaza las imposibles', () => {
    expect(Hora.desde('8:05').toString()).toBe('08:05');
    expect(Hora.desde('23:59').minutosDesdeMedianoche).toBe(23 * 60 + 59);
    expect(() => Hora.desde('24:00')).toThrow(/00 a 23/);
    expect(() => Hora.desde('10:75')).toThrow(/00 a 59/);
    expect(() => Hora.desde('manana')).toThrow(/HH:mm/);
  });

  it('describe la dosis en lenguaje natural', () => {
    expect(Dosis.desde(1, 'tableta').descripcion).toBe('1 tableta');
    expect(Dosis.desde(2, 'tableta').descripcion).toBe('2 tabletas');
    expect(Dosis.desde(2, 'capsula').descripcion).toBe('2 capsulas');
    expect(Dosis.desde(500, 'mg').descripcion).toBe('500 mg');
  });

  it('calcula el consumo de inventario segun la unidad', () => {
    // 2 tabletas salen del frasco; 500 mg es "una toma" de un frasco.
    expect(Dosis.desde(2, 'tableta').unidadesConsumidasPorToma).toBe(2);
    expect(Dosis.desde(500, 'mg').unidadesConsumidasPorToma).toBe(1);
  });
});

// =================================================================
describe('Stock', () => {
  it('avisa cuando llega al umbral configurado', () => {
    const stock = Stock.desde(10, 5);
    expect(stock.necesitaReabastecimiento).toBe(false);
    expect(stock.descontar(5).necesitaReabastecimiento).toBe(true);
  });

  it('nunca baja de cero', () => {
    expect(Stock.desde(1, 0).descontar(5).unidadesDisponibles).toBe(0);
  });

  it('es inmutable: descontar devuelve un stock nuevo', () => {
    const original = Stock.desde(10, 2);
    const resultado = original.descontar(3);
    expect(original.unidadesDisponibles).toBe(10);
    expect(resultado.unidadesDisponibles).toBe(7);
  });

  it('sin umbral configurado no molesta al paciente', () => {
    expect(Stock.sinControl().necesitaReabastecimiento).toBe(false);
  });
});

// =================================================================
describe('Frecuencia', () => {
  const lunes = FechaLocal.desde('2026-08-31'); // 31/08/2026 es lunes

  it('la frecuencia diaria aplica siempre desde el inicio', () => {
    expect(Frecuencia.diaria().aplicaEn(lunes, lunes)).toBe(true);
  });

  it('no aplica antes de que empiece el tratamiento', () => {
    const manana = FechaLocal.desde('2026-09-01');
    expect(Frecuencia.diaria().aplicaEn(lunes, manana)).toBe(false);
  });

  it('los dias de la semana solo aplican en los dias elegidos', () => {
    const frecuencia = Frecuencia.diasDeLaSemana([1, 4]); // lunes y jueves
    expect(frecuencia.aplicaEn(lunes, lunes)).toBe(true);
    expect(frecuencia.aplicaEn(FechaLocal.desde('2026-09-01'), lunes)).toBe(false); // martes
    expect(frecuencia.aplicaEn(FechaLocal.desde('2026-09-03'), lunes)).toBe(true); // jueves
  });

  it('cada N dias cuenta desde el inicio del tratamiento', () => {
    const cada3 = Frecuencia.cadaNDias(3);
    expect(cada3.aplicaEn(lunes, lunes)).toBe(true);
    expect(cada3.aplicaEn(FechaLocal.desde('2026-09-02'), lunes)).toBe(false);
    expect(cada3.aplicaEn(FechaLocal.desde('2026-09-03'), lunes)).toBe(true);
  });

  it('cada 1 dia es exactamente lo mismo que diaria', () => {
    expect(Frecuencia.cadaNDias(1).tipo).toBe('DIARIA');
  });
});

// =================================================================
describe('Medicamento', () => {
  const ahora = new Date('2026-08-31T07:00:00');

  const crear = (extras: Partial<Parameters<typeof Medicamento.crear>[0]> = {}) =>
    Medicamento.crear({
      id: ID_A,
      pacienteId: ID_B,
      nombre: 'Losartan',
      dosis: Dosis.desde(1, 'tableta'),
      frecuencia: Frecuencia.diaria(),
      horarios: [Hora.desde('20:00'), Hora.desde('08:00')],
      fechaInicio: FechaLocal.desde('2026-08-31'),
      stock: Stock.desde(10, 3),
      ahora,
      ...extras,
    });

  it('ordena los horarios aunque lleguen desordenados', () => {
    expect(crear().horarios.map(String)).toEqual(['08:00', '20:00']);
  });

  it('rechaza horarios repetidos', () => {
    expect(() => crear({ horarios: [Hora.desde('08:00'), Hora.desde('08:00')] })).toThrow(
      /repetido/,
    );
  });

  it('exige al menos un horario', () => {
    expect(() => crear({ horarios: [] })).toThrow(/al menos una hora/);
  });

  it('no permite que el tratamiento termine antes de empezar', () => {
    expect(() => crear({ fechaFin: FechaLocal.desde('2026-08-01') })).toThrow(/anterior/);
  });

  it('devuelve los horarios del dia cuando corresponde', () => {
    const medicamento = crear({ frecuencia: Frecuencia.diasDeLaSemana([1]) });
    expect(medicamento.horariosDelDia(FechaLocal.desde('2026-08-31'))).toHaveLength(2); // lunes
    expect(medicamento.horariosDelDia(FechaLocal.desde('2026-09-01'))).toHaveLength(0); // martes
  });

  it('descuenta inventario al registrar una toma', () => {
    const medicamento = crear({ dosis: Dosis.desde(2, 'tableta'), stock: Stock.desde(10, 3) });
    medicamento.registrarConsumoDeUnaDosis();
    expect(medicamento.stock.unidadesDisponibles).toBe(8);
  });

  it('un medicamento suspendido ya no genera agenda ni admite cambios', () => {
    const medicamento = crear();
    medicamento.suspender();
    expect(medicamento.activo).toBe(false);
    expect(medicamento.horariosDelDia(FechaLocal.desde('2026-08-31'))).toHaveLength(0);
    expect(() => medicamento.actualizar({ nombre: 'Otro' })).toThrow(ErrorDeReglaDeNegocio);
  });

  it('sobrevive al viaje de ida y vuelta a la base de datos', () => {
    const original = crear();
    const recuperado = Medicamento.desdePlano(original.aPlano());
    expect(recuperado.aPlano()).toEqual(original.aPlano());
  });
});

// =================================================================
describe('Toma', () => {
  const programadaPara = new Date('2026-08-31T08:00:00');
  const nueva = () => Toma.programar({ id: ID_A, medicamentoId: ID_B, pacienteId: ID_C, programadaPara });

  it('nace pendiente', () => {
    expect(nueva().estado).toBe('PENDIENTE');
    expect(nueva().estaResuelta).toBe(false);
  });

  it('marca como a tiempo lo que entra en la ventana de tolerancia', () => {
    const toma = nueva();
    toma.confirmar({ ahora: new Date('2026-08-31T08:30:00'), origen: 'PACIENTE' });
    expect(toma.estado).toBe('TOMADA');
    expect(toma.puntualidad(60)).toBe('A_TIEMPO');
    expect(toma.minutosDeDesfase()).toBe(30);
  });

  it('marca como retrasado lo que se sale de la ventana', () => {
    const toma = nueva();
    toma.confirmar({ ahora: new Date('2026-08-31T10:30:00'), origen: 'PACIENTE' });
    expect(toma.puntualidad(60)).toBe('CON_RETRASO');
  });

  it('no deja registrar dos veces la misma toma', () => {
    const toma = nueva();
    toma.confirmar({ ahora: programadaPara, origen: 'PACIENTE' });
    expect(() => toma.omitir({ ahora: programadaPara, origen: 'PACIENTE' })).toThrow(
      ErrorDeReglaDeNegocio,
    );
  });

  it('permite posponer hasta tres veces', () => {
    const toma = nueva();
    for (let i = 0; i < 3; i += 1) toma.posponer(15, programadaPara);
    expect(toma.vecesPospuesta).toBe(3);
    expect(toma.estado).toBe('POSPUESTA');
    expect(() => toma.posponer(15, programadaPara)).toThrow(/ya se pospuso/);
  });

  it('aplazar no maquilla la puntualidad: se mide contra la hora original', () => {
    const toma = nueva();
    toma.posponer(120, programadaPara);
    toma.confirmar({ ahora: new Date('2026-08-31T10:00:00'), origen: 'PACIENTE' });
    // Aunque la tomo justo a la hora corrida, llegan 2 horas tarde.
    expect(toma.puntualidad(60)).toBe('CON_RETRASO');
    expect(toma.minutosDeDesfase()).toBe(120);
  });

  it('el cierre automatico la deja omitida y con origen SISTEMA', () => {
    const toma = nueva();
    toma.cerrarPorFaltaDeRespuesta(new Date('2026-08-31T12:00:00'));
    expect(toma.estado).toBe('OMITIDA');
    expect(toma.origenDelRegistro).toBe('SISTEMA');
  });

  it('no considera vencida una toma dentro del margen de gracia', () => {
    const toma = nueva();
    expect(toma.estaVencidaEn(new Date('2026-08-31T09:00:00'), 120)).toBe(false);
    expect(toma.estaVencidaEn(new Date('2026-08-31T11:00:00'), 120)).toBe(true);
  });
});

// =================================================================
describe('ResumenDeAdherencia', () => {
  const construir = (estados: ('TOMADA' | 'OMITIDA' | 'PENDIENTE')[]) =>
    estados.map((estado, indice) => {
      const toma = Toma.programar({
        id: Identificador.desde(`00000000-0000-4000-8000-${String(indice + 1).padStart(12, '0')}`),
        medicamentoId: ID_B,
        pacienteId: ID_C,
        programadaPara: new Date('2026-08-31T08:00:00'),
      });
      if (estado === 'TOMADA') toma.confirmar({ ahora: new Date('2026-08-31T08:10:00'), origen: 'PACIENTE' });
      if (estado === 'OMITIDA') toma.omitir({ ahora: new Date('2026-08-31T12:00:00'), origen: 'PACIENTE' });
      return toma;
    });

  it('las tomas aun pendientes no castigan el porcentaje', () => {
    const resumen = ResumenDeAdherencia.calcular(
      construir(['TOMADA', 'TOMADA', 'PENDIENTE']),
      60,
    );
    expect(resumen.porcentaje).toBe(100);
    expect(resumen.pendientes).toBe(1);
  });

  it('clasifica el nivel segun el umbral clinico del 80%', () => {
    expect(
      ResumenDeAdherencia.calcular(construir(['TOMADA', 'TOMADA', 'TOMADA', 'TOMADA', 'OMITIDA']), 60)
        .nivel,
    ).toBe('BUENA'); // 80%
    expect(
      ResumenDeAdherencia.calcular(construir(['TOMADA', 'TOMADA', 'OMITIDA', 'OMITIDA']), 60).nivel,
    ).toBe('REGULAR'); // 50%
    expect(
      ResumenDeAdherencia.calcular(construir(['TOMADA', 'OMITIDA', 'OMITIDA', 'OMITIDA']), 60).nivel,
    ).toBe('BAJA'); // 25%
  });

  it('sin tomas resueltas informa SIN_DATOS en vez de 0%', () => {
    const resumen = ResumenDeAdherencia.calcular(construir(['PENDIENTE']), 60);
    expect(resumen.nivel).toBe('SIN_DATOS');
  });

  it('senala cuando el cuidador deberia intervenir', () => {
    const resumen = ResumenDeAdherencia.calcular(
      construir(['TOMADA', 'OMITIDA', 'OMITIDA', 'OMITIDA']),
      60,
    );
    expect(resumen.requiereAtencionDelCuidador).toBe(true);
  });
});

// =================================================================
describe('Vinculo (consentimiento)', () => {
  const ahora = new Date('2026-08-31T07:00:00');

  it('si lo pide el cuidador queda pendiente de aprobacion', () => {
    const vinculo = Vinculo.solicitar({
      id: ID_A,
      cuidadorId: ID_B,
      pacienteId: ID_C,
      solicitadoPor: 'CUIDADOR',
      ahora,
    });
    expect(vinculo.estado).toBe('PENDIENTE');
    expect(vinculo.estaActivo).toBe(false);
  });

  it('si lo pide el paciente nace aceptado', () => {
    const vinculo = Vinculo.solicitar({
      id: ID_A,
      cuidadorId: ID_B,
      pacienteId: ID_C,
      solicitadoPor: 'PACIENTE',
      ahora,
    });
    expect(vinculo.estado).toBe('ACEPTADO');
  });

  it('por defecto el cuidador solo puede mirar, no modificar', () => {
    const vinculo = Vinculo.solicitar({
      id: ID_A,
      cuidadorId: ID_B,
      pacienteId: ID_C,
      solicitadoPor: 'PACIENTE',
      ahora,
    });
    expect(vinculo.autorizar('puedeVerHistorial')).toBe(true);
    expect(vinculo.autorizar('puedeGestionarMedicamentos')).toBe(false);
  });

  it('revocar corta el acceso de inmediato', () => {
    const vinculo = Vinculo.solicitar({
      id: ID_A,
      cuidadorId: ID_B,
      pacienteId: ID_C,
      solicitadoPor: 'PACIENTE',
      ahora,
    });
    vinculo.revocar(ahora);
    expect(vinculo.autorizar('puedeVerHistorial')).toBe(false);
  });

  it('no se puede aceptar un vinculo ya revocado', () => {
    const vinculo = Vinculo.solicitar({
      id: ID_A,
      cuidadorId: ID_B,
      pacienteId: ID_C,
      solicitadoPor: 'CUIDADOR',
      ahora,
    });
    vinculo.revocar(ahora);
    expect(() => vinculo.aceptar(ahora)).toThrow(ErrorDeReglaDeNegocio);
  });
});
