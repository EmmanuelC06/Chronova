import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { cuidadorDePrueba, levantarApi, pacienteDePrueba } from '../ayudasHttp.js';
import type { ApiDePrueba } from '../ayudasHttp.js';

/**
 * El cuidador tambien puede ajustar la accesibilidad.
 *
 * Antes el endpoint exigia una sesion de paciente, asi que el unico
 * ajuste de accesibilidad de la aplicacion quedaba fuera del alcance de
 * la mitad de sus usuarios —y a menudo la de mas edad: una hija de
 * sesenta y cinco anos cuidando a su madre de noventa.
 */
describe('Preferencias de accesibilidad', () => {
  let api: ApiDePrueba;

  beforeEach(async () => {
    api = await levantarApi();
  });

  afterEach(async () => {
    await api.cerrar();
  });

  it('el cuidador puede cambiar su tamano de letra', async () => {
    const { token } = await cuidadorDePrueba(api);

    const respuesta = await api.peticion('PATCH', '/api/auth/preferencias', {
      token,
      cuerpo: { tamanoDeLetra: 'MUY_GRANDE' },
    });

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo.tamanoDeLetra).toBe('MUY_GRANDE');
  });

  it('el cambio del cuidador sobrevive a volver a pedir el perfil', async () => {
    const { token } = await cuidadorDePrueba(api);

    await api.peticion('PATCH', '/api/auth/preferencias', {
      token,
      cuerpo: { tamanoDeLetra: 'MUY_GRANDE' },
    });
    const perfil = await api.peticion('GET', '/api/auth/perfil', { token });

    expect(perfil.cuerpo.preferencias?.tamanoDeLetra).toBe('MUY_GRANDE');
  });

  it('cambiar un ajuste no pisa los demas, tambien para el cuidador', async () => {
    const { token } = await cuidadorDePrueba(api);

    await api.peticion('PATCH', '/api/auth/preferencias', {
      token,
      cuerpo: { tamanoDeLetra: 'MUY_GRANDE' },
    });
    const segunda = await api.peticion('PATCH', '/api/auth/preferencias', {
      token,
      cuerpo: { alertasSonoras: false },
    });

    expect(segunda.cuerpo.tamanoDeLetra).toBe('MUY_GRANDE');
    expect(segunda.cuerpo.alertasSonoras).toBe(false);
  });

  it('las preferencias de cada persona son suyas y no se mezclan', async () => {
    const paciente = await pacienteDePrueba(api);
    const cuidador = await cuidadorDePrueba(api);

    await api.peticion('PATCH', '/api/auth/preferencias', {
      token: cuidador.token,
      cuerpo: { tamanoDeLetra: 'MUY_GRANDE' },
    });

    const perfilDelPaciente = await api.peticion('GET', '/api/auth/perfil', {
      token: paciente.token,
    });

    expect(perfilDelPaciente.cuerpo.preferencias.tamanoDeLetra).toBe('GRANDE');
  });

  it('el paciente sigue pudiendo cambiar las suyas', async () => {
    const { token } = await pacienteDePrueba(api);

    const respuesta = await api.peticion('PATCH', '/api/auth/preferencias', {
      token,
      cuerpo: { tamanoDeLetra: 'NORMAL', minutosDeGracia: 60 },
    });

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo.tamanoDeLetra).toBe('NORMAL');
    expect(respuesta.cuerpo.minutosDeGracia).toBe(60);
  });
});
