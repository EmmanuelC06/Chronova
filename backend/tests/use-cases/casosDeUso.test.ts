import { beforeEach, describe, expect, it } from 'vitest';

import {
  comoCuidador,
  comoPaciente,
  crearCuidadorDePrueba,
  crearPacienteDePrueba,
  montarAplicacion,
} from '../ayudas.js';
import type { EntornoDePrueba } from '../ayudas.js';

/**
 * Pruebas de los casos de uso completos.
 *
 * Cada prueba monta la aplicacion entera (repositorios en memoria, reloj
 * congelado) y ejerce el flujo de punta a punta, sin base de datos ni
 * servidor HTTP. Esto es lo que permite la arquitectura hexagonal.
 */

const HOY = '2026-08-31'; // lunes
const MANANA_7AM = new Date('2026-08-31T07:00:00');

let app: EntornoDePrueba;

beforeEach(() => {
  app = montarAplicacion(MANANA_7AM);
});

// =================================================================
describe('Registro e inicio de sesion', () => {
  it('registra un paciente y devuelve un token utilizable', async () => {
    const resultado = await app.contenedor.casosDeUso.registrarPaciente.ejecutar({
      nombre: 'Rosa Valencia',
      email: 'rosa@test.com',
      contrasena: 'contrasena-segura',
    });

    expect(resultado.usuario.tipo).toBe('PACIENTE');
    expect(app.contenedor.tokens.verificar(resultado.token)).toEqual({
      usuarioId: resultado.usuario.id,
      tipo: 'PACIENTE',
    });
  });

  it('no permite dos cuentas con el mismo correo', async () => {
    await crearPacienteDePrueba(app, 'rosa@test.com');
    await expect(crearPacienteDePrueba(app, 'ROSA@test.com')).rejects.toThrow(/Ya existe/);
  });

  it('rechaza contrasenas debiles', async () => {
    await expect(
      app.contenedor.casosDeUso.registrarPaciente.ejecutar({
        nombre: 'Rosa',
        email: 'r@test.com',
        contrasena: '12345678',
      }),
    ).rejects.toThrow(/facil de adivinar/);
  });

  it('da el mismo mensaje si falla el correo o la contrasena', async () => {
    await crearPacienteDePrueba(app, 'rosa@test.com');

    const mensajes: string[] = [];
    for (const intento of [
      { email: 'noexiste@test.com', contrasena: 'contrasena-segura' },
      { email: 'rosa@test.com', contrasena: 'equivocada' },
    ]) {
      await app.contenedor.casosDeUso.iniciarSesion
        .ejecutar(intento)
        .catch((error: Error) => mensajes.push(error.message));
    }

    expect(mensajes).toHaveLength(2);
    expect(mensajes[0]).toBe(mensajes[1]);
  });

  it('distingue entre cuenta de paciente y de cuidador con el mismo correo', async () => {
    await crearPacienteDePrueba(app, 'mismo@test.com');
    await crearCuidadorDePrueba(app, 'mismo@test.com');

    const comoPac = await app.contenedor.casosDeUso.iniciarSesion.ejecutar({
      email: 'mismo@test.com',
      contrasena: 'contrasena-segura',
      tipo: 'PACIENTE',
    });
    const comoCui = await app.contenedor.casosDeUso.iniciarSesion.ejecutar({
      email: 'mismo@test.com',
      contrasena: 'contrasena-segura',
      tipo: 'CUIDADOR',
    });

    expect(comoPac.usuario.tipo).toBe('PACIENTE');
    expect(comoCui.usuario.tipo).toBe('CUIDADOR');
  });
});

// =================================================================
describe('Gestion de medicamentos', () => {
  it('registra un medicamento y lo devuelve en la lista', async () => {
    const paciente = await crearPacienteDePrueba(app);

    await app.contenedor.casosDeUso.registrarMedicamento.ejecutar({
      solicitante: paciente.solicitante,
      pacienteId: paciente.id,
      nombre: 'Losartan',
      dosis: { cantidad: 1, unidad: 'tableta' },
      frecuencia: { tipo: 'DIARIA' },
      horarios: ['08:00', '20:00'],
      fechaInicio: HOY,
      stock: { unidadesDisponibles: 10, umbralDeAlerta: 3 },
    });

    const lista = await app.contenedor.casosDeUso.listarMedicamentos.ejecutar({
      solicitante: paciente.solicitante,
      pacienteId: paciente.id,
    });

    expect(lista).toHaveLength(1);
    expect(lista[0]?.nombre).toBe('Losartan');
    expect(lista[0]?.descripcionDeDosis).toBe('1 tableta');
    expect(lista[0]?.descripcionDeFrecuencia).toBe('Todos los dias');
  });

  it('un paciente no puede ver los medicamentos de otro', async () => {
    const rosa = await crearPacienteDePrueba(app, 'rosa@test.com');
    const pedro = await crearPacienteDePrueba(app, 'pedro@test.com');

    await expect(
      app.contenedor.casosDeUso.listarMedicamentos.ejecutar({
        solicitante: pedro.solicitante,
        pacienteId: rosa.id,
      }),
    ).rejects.toThrow(/Solo el propio paciente/);
  });

  it('suspender oculta el medicamento pero no borra el registro', async () => {
    const paciente = await crearPacienteDePrueba(app);
    const medicamento = await registrarLosartan(paciente.solicitante, paciente.id);

    await app.contenedor.casosDeUso.suspenderMedicamento.ejecutar({
      solicitante: paciente.solicitante,
      medicamentoId: medicamento.id,
    });

    const activos = await app.contenedor.casosDeUso.listarMedicamentos.ejecutar({
      solicitante: paciente.solicitante,
      pacienteId: paciente.id,
    });
    const todos = await app.contenedor.casosDeUso.listarMedicamentos.ejecutar({
      solicitante: paciente.solicitante,
      pacienteId: paciente.id,
      incluirSuspendidos: true,
    });

    expect(activos).toHaveLength(0);
    expect(todos).toHaveLength(1);
    expect(todos[0]?.activo).toBe(false);
  });

  it('reabastecer suma unidades al inventario', async () => {
    const paciente = await crearPacienteDePrueba(app);
    const medicamento = await registrarLosartan(paciente.solicitante, paciente.id, {
      unidadesDisponibles: 2,
      umbralDeAlerta: 3,
    });

    const actualizado = await app.contenedor.casosDeUso.reabastecerStock.ejecutar({
      solicitante: paciente.solicitante,
      medicamentoId: medicamento.id,
      unidades: 30,
    });

    expect(actualizado.stock.unidadesDisponibles).toBe(32);
  });
});

// =================================================================
describe('Agenda del dia', () => {
  it('genera una toma por cada horario del medicamento', async () => {
    const paciente = await crearPacienteDePrueba(app);
    await registrarLosartan(paciente.solicitante, paciente.id);

    const agenda = await app.contenedor.casosDeUso.obtenerAgendaDelDia.ejecutar({
      solicitante: paciente.solicitante,
      pacienteId: paciente.id,
      fecha: HOY,
    });

    expect(agenda.elementos).toHaveLength(2);
    expect(agenda.elementos.map((e) => e.horaProgramada)).toEqual(['08:00', '20:00']);
    expect(agenda.elementos[0]?.estado).toBe('PENDIENTE');
  });

  it('es idempotente: consultarla varias veces no duplica tomas', async () => {
    const paciente = await crearPacienteDePrueba(app);
    await registrarLosartan(paciente.solicitante, paciente.id);

    for (let i = 0; i < 3; i += 1) {
      await app.contenedor.casosDeUso.obtenerAgendaDelDia.ejecutar({
        solicitante: paciente.solicitante,
        pacienteId: paciente.id,
        fecha: HOY,
      });
    }

    const agenda = await app.contenedor.casosDeUso.obtenerAgendaDelDia.ejecutar({
      solicitante: paciente.solicitante,
      pacienteId: paciente.id,
      fecha: HOY,
    });
    expect(agenda.elementos).toHaveLength(2);
  });

  it('dos consultas simultaneas no duplican la agenda ni fallan', async () => {
    // Caso real: la app pide la agenda al abrir y un refresco automatico
    // la pide otra vez casi al mismo tiempo. Ambas ven el dia vacio y
    // ambas intentan crear las mismas tomas.
    const paciente = await crearPacienteDePrueba(app);
    await registrarLosartan(paciente.solicitante, paciente.id);

    const consulta = () =>
      app.contenedor.casosDeUso.obtenerAgendaDelDia.ejecutar({
        solicitante: paciente.solicitante,
        pacienteId: paciente.id,
        fecha: HOY,
      });

    const resultados = await Promise.all([consulta(), consulta(), consulta()]);

    // Ninguna falla y todas ven exactamente la misma agenda.
    for (const agenda of resultados) {
      expect(agenda.elementos).toHaveLength(2);
    }
    const identificadores = resultados.map((a) =>
      a.elementos.map((e) => e.tomaId).sort().join(','),
    );
    expect(new Set(identificadores).size).toBe(1);
  });

  it('posponer una toma no genera un duplicado en la siguiente consulta', async () => {
    const paciente = await crearPacienteDePrueba(app);
    await registrarLosartan(paciente.solicitante, paciente.id);

    const primera = await app.contenedor.casosDeUso.obtenerAgendaDelDia.ejecutar({
      solicitante: paciente.solicitante,
      pacienteId: paciente.id,
      fecha: HOY,
    });

    await app.contenedor.casosDeUso.registrarToma.ejecutar({
      solicitante: paciente.solicitante,
      tomaId: primera.elementos[0]!.tomaId,
      accion: 'POSPONER',
      minutos: 30,
    });

    const segunda = await app.contenedor.casosDeUso.obtenerAgendaDelDia.ejecutar({
      solicitante: paciente.solicitante,
      pacienteId: paciente.id,
      fecha: HOY,
    });

    expect(segunda.elementos).toHaveLength(2);
    expect(segunda.elementos.find((e) => e.tomaId === primera.elementos[0]!.tomaId)?.estado).toBe(
      'POSPUESTA',
    );
  });

  it('respeta la frecuencia por dias de la semana', async () => {
    const paciente = await crearPacienteDePrueba(app);

    await app.contenedor.casosDeUso.registrarMedicamento.ejecutar({
      solicitante: paciente.solicitante,
      pacienteId: paciente.id,
      nombre: 'Vitamina D',
      dosis: { cantidad: 1, unidad: 'capsula' },
      frecuencia: { tipo: 'DIAS_DE_LA_SEMANA', diasDeLaSemana: [1] }, // solo lunes
      horarios: ['09:00'],
      fechaInicio: HOY,
    });

    const lunes = await app.contenedor.casosDeUso.obtenerAgendaDelDia.ejecutar({
      solicitante: paciente.solicitante,
      pacienteId: paciente.id,
      fecha: '2026-08-31',
    });
    const martes = await app.contenedor.casosDeUso.obtenerAgendaDelDia.ejecutar({
      solicitante: paciente.solicitante,
      pacienteId: paciente.id,
      fecha: '2026-09-01',
    });

    expect(lunes.elementos).toHaveLength(1);
    expect(martes.elementos).toHaveLength(0);
  });

  it('un medicamento suspendido desaparece de la agenda', async () => {
    const paciente = await crearPacienteDePrueba(app);
    const medicamento = await registrarLosartan(paciente.solicitante, paciente.id);

    await app.contenedor.casosDeUso.suspenderMedicamento.ejecutar({
      solicitante: paciente.solicitante,
      medicamentoId: medicamento.id,
    });

    const agenda = await app.contenedor.casosDeUso.obtenerAgendaDelDia.ejecutar({
      solicitante: paciente.solicitante,
      pacienteId: paciente.id,
      fecha: '2026-09-01',
    });
    expect(agenda.elementos).toHaveLength(0);
  });
});

// =================================================================
describe('Registro de tomas y stock', () => {
  it('confirmar una toma descuenta el inventario', async () => {
    const paciente = await crearPacienteDePrueba(app);
    await registrarLosartan(paciente.solicitante, paciente.id, {
      unidadesDisponibles: 10,
      umbralDeAlerta: 3,
    });

    const agenda = await app.contenedor.casosDeUso.obtenerAgendaDelDia.ejecutar({
      solicitante: paciente.solicitante,
      pacienteId: paciente.id,
      fecha: HOY,
    });

    await app.contenedor.casosDeUso.registrarToma.ejecutar({
      solicitante: paciente.solicitante,
      tomaId: agenda.elementos[0]!.tomaId,
      accion: 'CONFIRMAR',
    });

    const lista = await app.contenedor.casosDeUso.listarMedicamentos.ejecutar({
      solicitante: paciente.solicitante,
      pacienteId: paciente.id,
    });
    expect(lista[0]?.stock.unidadesDisponibles).toBe(9);
  });

  it('avisa y notifica cuando el inventario llega al umbral', async () => {
    const paciente = await crearPacienteDePrueba(app);
    await registrarLosartan(paciente.solicitante, paciente.id, {
      unidadesDisponibles: 4,
      umbralDeAlerta: 3,
    });

    const agenda = await app.contenedor.casosDeUso.obtenerAgendaDelDia.ejecutar({
      solicitante: paciente.solicitante,
      pacienteId: paciente.id,
      fecha: HOY,
    });

    const resultado = await app.contenedor.casosDeUso.registrarToma.ejecutar({
      solicitante: paciente.solicitante,
      tomaId: agenda.elementos[0]!.tomaId,
      accion: 'CONFIRMAR',
    });

    expect(resultado.avisoDeStock).toMatch(/3 unidades/);
    expect(app.notificador.avisosEnviados().some((a) => a.tipo === 'STOCK_BAJO')).toBe(true);
  });

  it('omitir no descuenta inventario', async () => {
    const paciente = await crearPacienteDePrueba(app);
    await registrarLosartan(paciente.solicitante, paciente.id, {
      unidadesDisponibles: 10,
      umbralDeAlerta: 3,
    });

    const agenda = await app.contenedor.casosDeUso.obtenerAgendaDelDia.ejecutar({
      solicitante: paciente.solicitante,
      pacienteId: paciente.id,
      fecha: HOY,
    });

    await app.contenedor.casosDeUso.registrarToma.ejecutar({
      solicitante: paciente.solicitante,
      tomaId: agenda.elementos[0]!.tomaId,
      accion: 'OMITIR',
      observaciones: 'Se me acabo el agua',
    });

    const lista = await app.contenedor.casosDeUso.listarMedicamentos.ejecutar({
      solicitante: paciente.solicitante,
      pacienteId: paciente.id,
    });
    expect(lista[0]?.stock.unidadesDisponibles).toBe(10);
  });
});

// =================================================================
describe('Historial y adherencia', () => {
  it('calcula el porcentaje sobre las tomas resueltas', async () => {
    const paciente = await crearPacienteDePrueba(app);
    await registrarLosartan(paciente.solicitante, paciente.id);

    const agenda = await app.contenedor.casosDeUso.obtenerAgendaDelDia.ejecutar({
      solicitante: paciente.solicitante,
      pacienteId: paciente.id,
      fecha: HOY,
    });

    await app.contenedor.casosDeUso.registrarToma.ejecutar({
      solicitante: paciente.solicitante,
      tomaId: agenda.elementos[0]!.tomaId,
      accion: 'CONFIRMAR',
    });
    await app.contenedor.casosDeUso.registrarToma.ejecutar({
      solicitante: paciente.solicitante,
      tomaId: agenda.elementos[1]!.tomaId,
      accion: 'OMITIR',
    });

    const historial = await app.contenedor.casosDeUso.consultarHistorial.ejecutar({
      solicitante: paciente.solicitante,
      pacienteId: paciente.id,
      desde: HOY,
      hasta: HOY,
    });

    expect(historial.registros).toHaveLength(2);
    expect(historial.resumen.porcentaje).toBe(50);
    expect(historial.resumen.nivel).toBe('REGULAR');
    expect(historial.porDia).toEqual([
      { fecha: HOY, tomadas: 1, omitidas: 1, porcentaje: 50 },
    ]);
  });
});

// =================================================================
describe('Cierre automatico de tomas sin respuesta', () => {
  it('cierra las vencidas y avisa a los cuidadores', async () => {
    const paciente = await crearPacienteDePrueba(app);
    const cuidador = await crearCuidadorDePrueba(app);
    await registrarLosartan(paciente.solicitante, paciente.id);

    await app.contenedor.casosDeUso.solicitarVinculo.ejecutar({
      solicitante: paciente.solicitante,
      emailDeLaOtraParte: 'ana@test.com',
      permisos: { recibeAlertas: true },
    });

    await app.contenedor.casosDeUso.obtenerAgendaDelDia.ejecutar({
      solicitante: paciente.solicitante,
      pacienteId: paciente.id,
      fecha: HOY,
    });

    // Son las 8:00 + 121 minutos, y el margen por defecto son 120.
    app.reloj.mover(new Date('2026-08-31T10:01:00'));
    const resultado = await app.contenedor.casosDeUso.cerrarTomasVencidas.ejecutar();

    expect(resultado.tomasCerradas).toBe(1); // la de las 20:00 aun no vence
    expect(resultado.avisosEnviados).toBe(1);
    expect(
      app.notificador.avisosEnviados().some((a) => a.tipo === 'TOMA_PERDIDA'),
    ).toBe(true);
    void cuidador;
  });

  it('no cierra nada dentro del margen de gracia', async () => {
    const paciente = await crearPacienteDePrueba(app);
    await registrarLosartan(paciente.solicitante, paciente.id);

    await app.contenedor.casosDeUso.obtenerAgendaDelDia.ejecutar({
      solicitante: paciente.solicitante,
      pacienteId: paciente.id,
      fecha: HOY,
    });

    app.reloj.mover(new Date('2026-08-31T09:00:00'));
    const resultado = await app.contenedor.casosDeUso.cerrarTomasVencidas.ejecutar();
    expect(resultado.tomasCerradas).toBe(0);
  });
});

// =================================================================
describe('Vinculo cuidador-paciente y control de acceso', () => {
  it('la solicitud del cuidador no da acceso hasta que el paciente acepta', async () => {
    const paciente = await crearPacienteDePrueba(app);
    const cuidador = await crearCuidadorDePrueba(app);
    await registrarLosartan(paciente.solicitante, paciente.id);

    const vinculo = await app.contenedor.casosDeUso.solicitarVinculo.ejecutar({
      solicitante: cuidador.solicitante,
      emailDeLaOtraParte: 'rosa@test.com',
    });
    expect(vinculo.estado).toBe('PENDIENTE');

    await expect(
      app.contenedor.casosDeUso.listarMedicamentos.ejecutar({
        solicitante: cuidador.solicitante,
        pacienteId: paciente.id,
      }),
    ).rejects.toThrow(/No tienes acceso/);

    await app.contenedor.casosDeUso.responderSolicitudDeVinculo.ejecutar({
      solicitante: paciente.solicitante,
      vinculoId: vinculo.id,
      respuesta: 'ACEPTAR',
    });

    const lista = await app.contenedor.casosDeUso.listarMedicamentos.ejecutar({
      solicitante: cuidador.solicitante,
      pacienteId: paciente.id,
    });
    expect(lista).toHaveLength(1);
  });

  it('el cuidador no puede modificar medicamentos sin ese permiso', async () => {
    const paciente = await crearPacienteDePrueba(app);
    const cuidador = await crearCuidadorDePrueba(app);
    const medicamento = await registrarLosartan(paciente.solicitante, paciente.id);

    await app.contenedor.casosDeUso.solicitarVinculo.ejecutar({
      solicitante: paciente.solicitante,
      emailDeLaOtraParte: 'ana@test.com',
    });

    await expect(
      app.contenedor.casosDeUso.actualizarMedicamento.ejecutar({
        solicitante: cuidador.solicitante,
        medicamentoId: medicamento.id,
        nombre: 'Otro nombre',
      }),
    ).rejects.toThrow(/no te ha concedido permiso/);
  });

  it('el paciente puede ampliar los permisos y entonces si funciona', async () => {
    const paciente = await crearPacienteDePrueba(app);
    const cuidador = await crearCuidadorDePrueba(app);
    const medicamento = await registrarLosartan(paciente.solicitante, paciente.id);

    const vinculo = await app.contenedor.casosDeUso.solicitarVinculo.ejecutar({
      solicitante: paciente.solicitante,
      emailDeLaOtraParte: 'ana@test.com',
    });

    await app.contenedor.casosDeUso.cambiarPermisosDelVinculo.ejecutar({
      solicitante: paciente.solicitante,
      vinculoId: vinculo.id,
      permisos: { puedeGestionarMedicamentos: true },
    });

    const actualizado = await app.contenedor.casosDeUso.actualizarMedicamento.ejecutar({
      solicitante: cuidador.solicitante,
      medicamentoId: medicamento.id,
      nombre: 'Losartan potasico',
    });
    expect(actualizado.nombre).toBe('Losartan potasico');
  });

  it('revocar corta el acceso de inmediato', async () => {
    const paciente = await crearPacienteDePrueba(app);
    const cuidador = await crearCuidadorDePrueba(app);
    await registrarLosartan(paciente.solicitante, paciente.id);

    const vinculo = await app.contenedor.casosDeUso.solicitarVinculo.ejecutar({
      solicitante: paciente.solicitante,
      emailDeLaOtraParte: 'ana@test.com',
    });

    await app.contenedor.casosDeUso.responderSolicitudDeVinculo.ejecutar({
      solicitante: paciente.solicitante,
      vinculoId: vinculo.id,
      respuesta: 'REVOCAR',
    });

    await expect(
      app.contenedor.casosDeUso.listarMedicamentos.ejecutar({
        solicitante: cuidador.solicitante,
        pacienteId: paciente.id,
      }),
    ).rejects.toThrow(/No tienes acceso/);
  });

  it('solo el paciente decide sobre el vinculo, nunca el cuidador', async () => {
    const paciente = await crearPacienteDePrueba(app);
    const cuidador = await crearCuidadorDePrueba(app);

    const vinculo = await app.contenedor.casosDeUso.solicitarVinculo.ejecutar({
      solicitante: cuidador.solicitante,
      emailDeLaOtraParte: 'rosa@test.com',
    });

    await expect(
      app.contenedor.casosDeUso.responderSolicitudDeVinculo.ejecutar({
        solicitante: cuidador.solicitante,
        vinculoId: vinculo.id,
        respuesta: 'ACEPTAR',
      }),
    ).rejects.toThrow(/Solo el paciente/);
    void paciente;
  });

  it('no revela si un correo esta registrado cuando no lo esta', async () => {
    const cuidador = await crearCuidadorDePrueba(app);
    await expect(
      app.contenedor.casosDeUso.solicitarVinculo.ejecutar({
        solicitante: cuidador.solicitante,
        emailDeLaOtraParte: 'nadie@test.com',
      }),
    ).rejects.toThrow(/No se encontro/);
  });
});

// =================================================================
describe('Panel del cuidador', () => {
  it('ordena primero a los pacientes que requieren atencion', async () => {
    const cuidador = await crearCuidadorDePrueba(app);

    const rosa = await crearPacienteDePrueba(app, 'rosa@test.com');
    const pedro = await crearPacienteDePrueba(app, 'pedro@test.com');

    for (const paciente of [rosa, pedro]) {
      await registrarLosartan(paciente.solicitante, paciente.id);
      await app.contenedor.casosDeUso.solicitarVinculo.ejecutar({
        solicitante: paciente.solicitante,
        emailDeLaOtraParte: 'ana@test.com',
      });
    }

    // Rosa cumple; Pedro omite todo.
    for (const [paciente, accion] of [
      [rosa, 'CONFIRMAR'],
      [pedro, 'OMITIR'],
    ] as const) {
      const agenda = await app.contenedor.casosDeUso.obtenerAgendaDelDia.ejecutar({
        solicitante: paciente.solicitante,
        pacienteId: paciente.id,
        fecha: HOY,
      });
      for (const elemento of agenda.elementos) {
        await app.contenedor.casosDeUso.registrarToma.ejecutar({
          solicitante: paciente.solicitante,
          tomaId: elemento.tomaId,
          accion,
        });
      }
    }

    const panel = await app.contenedor.casosDeUso.listarPacientesDelCuidador.ejecutar({
      solicitante: cuidador.solicitante,
    });

    expect(panel).toHaveLength(2);
    expect(panel[0]?.pacienteId).toBe(pedro.id);
    expect(panel[0]?.requiereAtencion).toBe(true);
    expect(panel[0]?.adherencia.porcentaje).toBe(0);
    expect(panel[1]?.adherencia.porcentaje).toBe(100);
  });

  it('una solicitud pendiente aparece pero sin datos clinicos', async () => {
    const cuidador = await crearCuidadorDePrueba(app);
    const paciente = await crearPacienteDePrueba(app);
    await registrarLosartan(paciente.solicitante, paciente.id);

    await app.contenedor.casosDeUso.solicitarVinculo.ejecutar({
      solicitante: cuidador.solicitante,
      emailDeLaOtraParte: 'rosa@test.com',
    });

    const panel = await app.contenedor.casosDeUso.listarPacientesDelCuidador.ejecutar({
      solicitante: cuidador.solicitante,
    });

    expect(panel[0]?.estadoDelVinculo).toBe('PENDIENTE');
    expect(panel[0]?.medicamentosActivos).toBe(0);
    expect(panel[0]?.adherencia.nivel).toBe('SIN_DATOS');
  });
});

// =================================================================
describe('Preferencias de accesibilidad', () => {
  it('el paciente nuevo arranca con letra grande', async () => {
    const paciente = await crearPacienteDePrueba(app);
    const perfil = await app.contenedor.casosDeUso.obtenerPerfil.ejecutar({
      usuarioId: paciente.id,
      tipo: 'PACIENTE',
    });
    expect(perfil.preferencias?.tamanoDeLetra).toBe('GRANDE');
    expect(perfil.edad).toBe(74);
  });

  it('cambiar una preferencia no borra las demas', async () => {
    const paciente = await crearPacienteDePrueba(app);

    await app.contenedor.casosDeUso.actualizarPreferencias.ejecutar({
      pacienteId: paciente.id,
      tamanoDeLetra: 'MUY_GRANDE',
    });
    const preferencias = await app.contenedor.casosDeUso.actualizarPreferencias.ejecutar({
      pacienteId: paciente.id,
      altoContraste: true,
    });

    expect(preferencias.tamanoDeLetra).toBe('MUY_GRANDE');
    expect(preferencias.altoContraste).toBe(true);
    expect(preferencias.alertasSonoras).toBe(true);
  });
});

// -----------------------------------------------------------------
// Ayuda local
// -----------------------------------------------------------------
async function registrarLosartan(
  solicitante: ReturnType<typeof comoPaciente> | ReturnType<typeof comoCuidador>,
  pacienteId: string,
  stock?: { unidadesDisponibles: number; umbralDeAlerta: number },
) {
  return app.contenedor.casosDeUso.registrarMedicamento.ejecutar({
    solicitante,
    pacienteId,
    nombre: 'Losartan',
    dosis: { cantidad: 1, unidad: 'tableta' },
    frecuencia: { tipo: 'DIARIA' },
    horarios: ['08:00', '20:00'],
    fechaInicio: HOY,
    stock,
  });
}
