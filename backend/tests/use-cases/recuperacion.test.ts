import { beforeEach, describe, expect, it } from 'vitest';

import {
  crearCuidadorDePrueba,
  crearPacienteDePrueba,
  montarAplicacion,
} from '../ayudas.js';
import type { EntornoDePrueba } from '../ayudas.js';
import { SolicitudDeRecuperacion } from '../../src/domain/recuperacion/SolicitudDeRecuperacion.js';
import { Identificador } from '../../src/domain/shared/Identificador.js';

/**
 * Pruebas de la recuperacion de contrasena.
 *
 * Casi todas son casos de ABUSO, no de uso: el camino feliz es una linea
 * y lo interesante es lo que pasa cuando alguien intenta aprovecharse.
 * Un codigo que no caduca, que se puede reutilizar o que admite intentos
 * infinitos convierte esta funcion en la puerta trasera de todas las
 * cuentas del sistema.
 */

const AHORA = new Date('2026-08-31T12:00:00Z');

let app: EntornoDePrueba;
let codigo: string;

beforeEach(() => {
  app = montarAplicacion(AHORA);
  codigo = app.codigoDeRecuperacion;
});

const CONTRASENA_NUEVA = 'una-clave-nueva-larga';

async function pedirCodigo(email = 'rosa@test.com') {
  return app.contenedor.casosDeUso.solicitarRecuperacion.ejecutar({ email });
}

async function restablecer(datos: {
  email?: string;
  codigo?: string;
  nuevaContrasena?: string;
}) {
  return app.contenedor.casosDeUso.restablecerContrasena.ejecutar({
    email: datos.email ?? 'rosa@test.com',
    codigo: datos.codigo ?? codigo,
    nuevaContrasena: datos.nuevaContrasena ?? CONTRASENA_NUEVA,
  });
}

// =================================================================
describe('Recuperar la contrasena', () => {
  it('el camino completo: pedir el codigo, usarlo y entrar con la clave nueva', async () => {
    await crearPacienteDePrueba(app);

    await pedirCodigo();
    await restablecer({});

    const sesion = await app.contenedor.casosDeUso.iniciarSesion.ejecutar({
      email: 'rosa@test.com',
      contrasena: CONTRASENA_NUEVA,
    });
    expect(sesion.usuario.email).toBe('rosa@test.com');
  });

  it('la contrasena anterior deja de servir', async () => {
    await crearPacienteDePrueba(app);
    await pedirCodigo();
    await restablecer({});

    await expect(
      app.contenedor.casosDeUso.iniciarSesion.ejecutar({
        email: 'rosa@test.com',
        contrasena: 'contrasena-segura',
      }),
    ).rejects.toThrow(/correo o la contrasena/);
  });

  it('el codigo llega por correo, no en la respuesta de la API', async () => {
    await crearPacienteDePrueba(app);
    const resultado = await pedirCodigo();

    // Devolver el codigo en la respuesta seria regalarselo a cualquiera
    // que sepa un correo ajeno.
    expect(JSON.stringify(resultado)).not.toContain(codigo);

    const enviados = app.correo.correosEnviados();
    expect(enviados).toHaveLength(1);
    expect(enviados[0]?.para).toBe('rosa@test.com');
    expect(enviados[0]?.cuerpo).toContain(codigo);
  });

  it('funciona igual para un cuidador', async () => {
    await crearCuidadorDePrueba(app);

    await pedirCodigo('ana@test.com');
    await restablecer({ email: 'ana@test.com' });

    const sesion = await app.contenedor.casosDeUso.iniciarSesion.ejecutar({
      email: 'ana@test.com',
      contrasena: CONTRASENA_NUEVA,
    });
    expect(sesion.usuario.tipo).toBe('CUIDADOR');
  });
});

// =================================================================
describe('Lo que impide que la recuperacion sea una puerta trasera', () => {
  it('no revela si el correo esta registrado', async () => {
    await crearPacienteDePrueba(app);

    const conCuenta = await pedirCodigo('rosa@test.com');
    const sinCuenta = await pedirCodigo('nadie@test.com');

    // Identicos. Si se distinguieran, cualquiera podria averiguar quien
    // usa una aplicacion de salud probando correos.
    expect(sinCuenta).toEqual(conCuenta);
    expect(app.correo.correosEnviados()).toHaveLength(1);
  });

  it('un correo mal escrito tampoco distingue', async () => {
    const resultado = await pedirCodigo('esto-no-es-un-correo');
    expect(resultado.mensaje).toContain('Si ese correo tiene una cuenta');
  });

  it('el codigo caduca a los treinta minutos', async () => {
    await crearPacienteDePrueba(app);
    await pedirCodigo();

    app.reloj.mover(
      new Date(AHORA.getTime() + (SolicitudDeRecuperacion.MINUTOS_DE_VIGENCIA + 1) * 60_000),
    );

    await expect(restablecer({})).rejects.toThrow(/no es correcto o ya caduco/);
  });

  it('justo antes de caducar todavia sirve', async () => {
    await crearPacienteDePrueba(app);
    await pedirCodigo();

    app.reloj.mover(
      new Date(AHORA.getTime() + (SolicitudDeRecuperacion.MINUTOS_DE_VIGENCIA - 1) * 60_000),
    );

    await expect(restablecer({})).resolves.toEqual({ restablecida: true });
  });

  it('el codigo sirve una sola vez', async () => {
    await crearPacienteDePrueba(app);
    await pedirCodigo();
    await restablecer({});

    // Quien haya visto el codigo no puede volver a entrar con el despues
    // de que el dueno crea haber recuperado su cuenta.
    await expect(restablecer({ nuevaContrasena: 'otra-clave-distinta' })).rejects.toThrow(
      /no es correcto o ya caduco/,
    );
  });

  it('se agota tras cinco intentos fallidos', async () => {
    await crearPacienteDePrueba(app);
    await pedirCodigo();

    for (let i = 0; i < SolicitudDeRecuperacion.MAXIMO_DE_INTENTOS; i += 1) {
      await expect(restablecer({ codigo: '000000' })).rejects.toThrow();
    }

    // Y a partir de ahi ni siquiera el codigo BUENO funciona: hay que
    // pedir uno nuevo. Es lo que hace que seis digitos no se puedan
    // adivinar por fuerza bruta.
    await expect(restablecer({})).rejects.toThrow(/agotaron los intentos/);
  });

  it('pedir un codigo nuevo invalida el anterior', async () => {
    await crearPacienteDePrueba(app);
    await pedirCodigo();
    await pedirCodigo();

    // Con el generador fijo los dos codigos son iguales, asi que lo que
    // se comprueba es que solo queda UNA solicitud viva: si quedaran las
    // dos, cada peticion multiplicaria las ventanas abiertas a la vez.
    const solicitudes = app.correo.correosEnviados();
    expect(solicitudes).toHaveLength(2);

    await expect(restablecer({})).resolves.toEqual({ restablecida: true });
    await expect(restablecer({})).rejects.toThrow();
  });

  it('una contrasena nueva demasiado debil no gasta intentos', async () => {
    await crearPacienteDePrueba(app);
    await pedirCodigo();

    await expect(restablecer({ nuevaContrasena: '123' })).rejects.toThrow(/al menos/);

    // El codigo bueno sigue entero: equivocarse escribiendo la clave no
    // puede costarle a la persona uno de sus cinco intentos.
    await expect(restablecer({})).resolves.toEqual({ restablecida: true });
  });

  it('el codigo de una persona no sirve para la cuenta de otra', async () => {
    await crearPacienteDePrueba(app, 'rosa@test.com');
    await crearPacienteDePrueba(app, 'otra@test.com');

    await pedirCodigo('rosa@test.com');

    // La otra cuenta no pidio nada: no hay solicitud viva para ella.
    await expect(restablecer({ email: 'otra@test.com' })).rejects.toThrow(
      /no es correcto o ya caduco/,
    );
  });

  it('el codigo se guarda cifrado, nunca en claro', async () => {
    const paciente = await crearPacienteDePrueba(app);
    await pedirCodigo();

    const guardada = await app.recuperaciones.buscarVigentePorUsuario(
      Identificador.desde(paciente.id),
      'PACIENTE',
    );

    // Si alguien llegara a leer la base de datos, no debe obtener codigos
    // utilizables. Es la misma regla que ya se aplica a las contrasenas.
    //
    // Lo que se comprueba es que el valor guardado paso por el puerto
    // CifradorDeContrasenas y no se escribio tal cual. En estas pruebas
    // ese puerto lo cumple un doble reversible, para que corran rapido;
    // en produccion lo cumple bcrypt con factor de costo 10. La propiedad
    // que importa —que el dato almacenado no es el codigo— es la misma.
    expect(guardada).not.toBeNull();
    expect(guardada!.codigoCifrado).not.toBe(codigo);
    expect(guardada!.codigoCifrado).toBe(`cifrado:${codigo}`);
  });
});
