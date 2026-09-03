import { beforeEach, describe, expect, it } from 'vitest';

import { crearCuidadorDePrueba, crearPacienteDePrueba, montarAplicacion } from '../ayudas.js';
import type { EntornoDePrueba } from '../ayudas.js';
import { Identificador } from '../../src/domain/shared/Identificador.js';
import { VerificarSesion } from '../../src/application/use-cases/auth/VerificarSesion.js';

/**
 * Pruebas del ciclo de vida de una sesion.
 *
 * Fijan dos defectos que encontro la revision de codigo y que tenian la
 * misma raiz: el servidor daba por buena cualquier sesion cuyo token
 * estuviera bien firmado, sin volver a mirar la cuenta.
 *
 *  M-8 — Cambiar la contrasena no echaba a nadie. Quien hubiera robado
 *        un token seguia dentro hasta siete dias, lo que dejaba sin
 *        efecto la unica reaccion que tiene una persona ante un acceso
 *        ajeno a su cuenta.
 *
 *  M-4 — El token caducaba a los siete dias y no habia forma de
 *        renovarlo. La persona se encontraba fuera sin haber hecho nada,
 *        y en una aplicacion de medicacion eso es el dia que no le
 *        suenan las alarmas.
 *
 * El orden importa: M-4 solo se puede resolver con tranquilidad DESPUES
 * de M-8. Alargar sesiones que no se pueden cortar seria empeorar el
 * problema, no arreglarlo.
 */

/**
 * A diferencia del resto de las pruebas, aqui el reloj congelado arranca
 * en la hora REAL y no en una fecha inventada.
 *
 * El motivo: la caducidad de un JWT la escribe la libreria con el reloj
 * del sistema, no con el puerto Reloj del proyecto. En produccion son el
 * mismo y da igual; en una prueba con el reloj puesto en otra fecha, el
 * token pareceria caducar dias antes o despues de lo que el caso de uso
 * cree, y estas pruebas dirian cosas falsas segun el dia en que se
 * ejecuten.
 */
const AHORA = new Date();

let app: EntornoDePrueba;

beforeEach(() => {
  app = montarAplicacion(AHORA);
});

async function entrar(
  entorno = app,
  email = 'rosa@test.com',
  contrasena = 'contrasena-segura',
): Promise<string> {
  const { token } = await entorno.contenedor.casosDeUso.iniciarSesion.ejecutar({
    email,
    contrasena,
  });
  return token;
}

function verificar(token: string, entorno = app) {
  return entorno.contenedor.casosDeUso.verificarSesion.ejecutar(token);
}

/** Pide el codigo y lo usa. Es el unico camino para cambiar la clave. */
async function cambiarLaContrasena(
  entorno = app,
  email = 'rosa@test.com',
  nueva = 'otra-clave-bien-larga',
): Promise<void> {
  // Se adelanta el reloj porque en la realidad nadie se registra y
  // recupera su contrasena en el mismo milisegundo. Sin esto, la marca
  // de "sesiones validas desde" no cambiaria de valor y la prueba
  // pasaria por una razon equivocada.
  entorno.reloj.avanzarMinutos(5);

  await entorno.contenedor.casosDeUso.solicitarRecuperacion.ejecutar({ email });
  await entorno.contenedor.casosDeUso.restablecerContrasena.ejecutar({
    email,
    codigo: entorno.codigoDeRecuperacion,
    nuevaContrasena: nueva,
  });
}

// =================================================================
describe('Una sesion normal', () => {
  it('el token identifica a su dueno', async () => {
    const paciente = await crearPacienteDePrueba(app);

    const { solicitante } = await verificar(await entrar());

    expect(solicitante.id.valor).toBe(paciente.id);
    expect(solicitante.tipo).toBe('PACIENTE');
  });

  it('un token inventado no abre nada', async () => {
    await crearPacienteDePrueba(app);
    await expect(verificar('esto.no.es-un-token')).rejects.toThrow(/expiro o no es valida/i);
  });

  it('un token firmado con otro secreto no vale', async () => {
    const paciente = await crearPacienteDePrueba(app);

    const { ServicioDeTokensJwt } = await import(
      '../../src/infrastructure/security/ServicioDeTokensJwt.js'
    );
    const falsificador = new ServicioDeTokensJwt('otro-secreto-cualquiera-largo', '7d');
    const falsificado = falsificador.emitir({
      usuarioId: paciente.id,
      tipo: 'PACIENTE',
      validaDesde: AHORA.getTime(),
    });

    await expect(verificar(falsificado)).rejects.toThrow(/expiro o no es valida/i);
  });

  it('un token de un usuario que ya no existe no vale', async () => {
    // Se firma con el secreto BUENO, para que lo unico que falle sea
    // que la cuenta no esta. Antes de este cambio, el middleware ni
    // siquiera lo miraba.
    const token = app.contenedor.tokens.emitir({
      usuarioId: '00000000-0000-4000-8000-000000000999',
      tipo: 'PACIENTE',
      validaDesde: AHORA.getTime(),
    });

    await expect(verificar(token)).rejects.toThrow(/expiro o no es valida/i);
  });
});

// =================================================================
describe('M-8 · Cambiar la contrasena cierra las sesiones abiertas', () => {
  it('el token de antes deja de servir', async () => {
    await crearPacienteDePrueba(app);
    const tokenViejo = await entrar();

    // Se comprueba que valia ANTES. Sin esto, la prueba pasaria igual
    // aunque el token no hubiera funcionado nunca.
    await expect(verificar(tokenViejo)).resolves.toBeTruthy();

    await cambiarLaContrasena();

    await expect(verificar(tokenViejo)).rejects.toThrow(/contrasena cambio/i);
  });

  it('el token emitido justo despues del cambio si sirve', async () => {
    await crearPacienteDePrueba(app);
    await cambiarLaContrasena();

    // Este es el camino que recorre la app de verdad: restablecer y
    // entrar acto seguido. Con el reloj congelado las dos cosas ocurren
    // en el MISMO instante, que es justo donde una comparacion por
    // fecha —en vez de por marca exacta— invalidaria el token al nacer.
    const tokenNuevo = await entrar(app, 'rosa@test.com', 'otra-clave-bien-larga');

    await expect(verificar(tokenNuevo)).resolves.toBeTruthy();
  });

  it('cerrar las sesiones de una persona no toca las de otra', async () => {
    await crearPacienteDePrueba(app);
    await crearCuidadorDePrueba(app);
    const tokenDelCuidador = await entrar(app, 'ana@test.com');

    await cambiarLaContrasena();

    await expect(verificar(tokenDelCuidador)).resolves.toBeTruthy();
  });

  it('una cuenta desactivada no entra aunque su token este bien firmado', async () => {
    const paciente = await crearPacienteDePrueba(app);
    const token = await entrar();

    const enBase = await app.pacientes.buscarPorId(Identificador.desde(paciente.id));
    enBase!.desactivar(AHORA);
    await app.pacientes.guardar(enBase!);

    await expect(verificar(token)).rejects.toThrow(/ya no esta activa/i);
  });

  it('desactivar tambien mueve la marca, para que reactivar no resucite sesiones', async () => {
    const paciente = await crearPacienteDePrueba(app);
    const antes = (await app.pacientes.buscarPorId(Identificador.desde(paciente.id)))!;
    const marcaInicial = antes.sesionesValidasDesde.getTime();

    app.reloj.avanzarMinutos(60);
    antes.desactivar(app.reloj.ahora());

    expect(antes.sesionesValidasDesde.getTime()).toBeGreaterThan(marcaInicial);
  });
});

// =================================================================
describe('M-4 · La sesion se renueva sola antes de caducar', () => {
  it('no renueva mientras al token le sobre cuerda', async () => {
    const largo = montarAplicacion(AHORA, '7d');
    await crearPacienteDePrueba(largo);

    const { tokenRenovado } = await verificar(await entrar(largo), largo);

    expect(tokenRenovado).toBeNull();
  });

  it('renueva cuando le quedan menos de tres dias', async () => {
    const corto = montarAplicacion(AHORA, '2d');
    await crearPacienteDePrueba(corto);

    const { tokenRenovado } = await verificar(await entrar(corto), corto);

    expect(tokenRenovado).not.toBeNull();
  });

  it('el token renovado dura mas que el que reemplaza', async () => {
    // Este es el caso de M-4 tal y como ocurre: una sesion de hace seis
    // dias, a la que le queda uno. Se fabrica a mano porque el token
    // recien emitido tendria la misma hora de emision que el renovado
    // —el `iat` de un JWT va en segundos— y no se veria la diferencia.
    const jwt = (await import('jsonwebtoken')).default;
    // Duracion normal de produccion: el recambio debe darle siete dias
    // nuevos al que solo tenia uno.
    const real = montarAplicacion(AHORA, '7d');
    const paciente = await crearPacienteDePrueba(real);
    const enBase = (await real.pacientes.buscarPorId(Identificador.desde(paciente.id)))!;
    const segundos = Math.floor(AHORA.getTime() / 1000);

    const casiCaducado = jwt.sign(
      {
        tipo: 'PACIENTE',
        vd: enBase.sesionesValidasDesde.getTime(),
        iat: segundos - 6 * 24 * 60 * 60,
        exp: segundos + 24 * 60 * 60,
      },
      real.contenedor.entorno.jwtSecreto,
      { subject: paciente.id, issuer: 'chronova' },
    );

    const { tokenRenovado } = await verificar(casiCaducado, real);
    expect(tokenRenovado).not.toBeNull();

    const antes = real.contenedor.tokens.verificar(casiCaducado)!;
    const despues = real.contenedor.tokens.verificar(tokenRenovado!)!;
    expect(despues.expiraEn.getTime()).toBeGreaterThan(antes.expiraEn.getTime());
  });

  it('el token renovado abre igual que el original', async () => {
    const corto = montarAplicacion(AHORA, '2d');
    const paciente = await crearPacienteDePrueba(corto);

    const { tokenRenovado } = await verificar(await entrar(corto), corto);
    const { solicitante } = await verificar(tokenRenovado!, corto);

    expect(solicitante.id.valor).toBe(paciente.id);
  });

  it('renovar no es una puerta trasera: cambiar la contrasena tambien lo cierra', async () => {
    const corto = montarAplicacion(AHORA, '2d');
    await crearPacienteDePrueba(corto);
    const { tokenRenovado } = await verificar(await entrar(corto), corto);

    await cambiarLaContrasena(corto);

    await expect(verificar(tokenRenovado!, corto)).rejects.toThrow(/contrasena cambio/i);
  });

  it('el margen de renovacion cabe dentro de la vida del token', async () => {
    // Si algun dia alguien pone JWT_DURACION por debajo del margen, TODAS
    // las peticiones renovarian y el token cambiaria sin parar. No es un
    // agujero de seguridad, pero si un desperdicio silencioso.
    expect(VerificarSesion.DIAS_PARA_RENOVAR).toBeLessThan(7);
  });
});
