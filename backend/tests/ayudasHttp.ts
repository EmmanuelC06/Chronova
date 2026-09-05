import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { crearServidor } from '../src/infrastructure/http/servidor.js';
import { montarAplicacion } from './ayudas.js';
import type { EntornoDePrueba } from './ayudas.js';

/**
 * Levanta la API HTTP de verdad, sobre la aplicacion en memoria.
 *
 * Hace falta un archivo aparte porque estas pruebas comprueban algo que
 * las otras 146 no pueden ver. Todas ellas llaman a los casos de uso
 * directamente, que es rapido y suficiente para el dominio, pero se
 * saltan entera la capa HTTP: el enrutado, la lectura del token, el
 * parseo del cuerpo, la traduccion de errores a codigos y la lectura de
 * los parametros de la URL.
 *
 * Justamente ahi estaban los tres defectos que aparecieron en la
 * revision. El mas grave —el panel del cuidador devolvia datos clinicos
 * despues de que el paciente le retirara el permiso— solo se ve haciendo
 * la peticion: el caso de uso, llamado a mano, "funcionaba".
 *
 * No se usa ninguna libreria nueva. `app.listen(0)` pide al sistema un
 * puerto libre y `fetch` viene con Node desde la version 18, asi que
 * esto no anade una sola dependencia al proyecto: es una cosa menos que
 * instalar y una cosa menos que explicar.
 */
export interface ApiDePrueba extends EntornoDePrueba {
  /** Hace una peticion y devuelve el codigo y el cuerpo ya interpretado. */
  peticion: (
    metodo: string,
    ruta: string,
    opciones?: { cuerpo?: unknown; token?: string; cuerpoCrudo?: string },
  ) => Promise<{ estado: number; cuerpo: any; cabeceras: Headers }>;
  cerrar: () => Promise<void>;
}

export async function levantarApi(
  opciones: { fechaInicial?: Date; idsReales?: boolean } = {},
): Promise<ApiDePrueba> {
  const entorno = montarAplicacion(opciones.fechaInicial, undefined, {
    idsReales: opciones.idsReales,
  });
  const app = crearServidor(entorno.contenedor);

  const servidor: Server = await new Promise((resolver) => {
    const s = app.listen(0, () => resolver(s));
  });
  const { port } = servidor.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;

  const peticion: ApiDePrueba['peticion'] = async (metodo, ruta, opciones = {}) => {
    const cabeceras: Record<string, string> = { 'Content-Type': 'application/json' };
    if (opciones.token) cabeceras.Authorization = `Bearer ${opciones.token}`;

    const cuerpo =
      opciones.cuerpoCrudo !== undefined
        ? opciones.cuerpoCrudo
        : opciones.cuerpo !== undefined
          ? JSON.stringify(opciones.cuerpo)
          : undefined;

    const respuesta = await fetch(base + ruta, { method: metodo, headers: cabeceras, body: cuerpo });

    // Un 413 puede llegar sin cuerpo JSON: no se asume que lo tenga.
    const texto = await respuesta.text();
    let interpretado: unknown = texto;
    try {
      interpretado = texto === '' ? null : JSON.parse(texto);
    } catch {
      /* se deja el texto tal cual */
    }

    return { estado: respuesta.status, cuerpo: interpretado, cabeceras: respuesta.headers };
  };

  return {
    ...entorno,
    peticion,
    cerrar: () => new Promise((resolver) => servidor.close(() => resolver())),
  };
}

/** Registra una paciente por HTTP y devuelve su token y su id. */
export async function pacienteDePrueba(api: ApiDePrueba, sufijo = 'a') {
  const { cuerpo } = await api.peticion('POST', '/api/auth/registro/paciente', {
    cuerpo: {
      nombre: 'Rosa Valencia',
      email: `rosa.${sufijo}@prueba.test`,
      contrasena: 'ClaveSegura123',
      zonaHoraria: 'America/Bogota',
      aceptaPoliticaDeDatos: true,
    },
  });
  return { token: cuerpo.token as string, id: cuerpo.usuario.id as string };
}

/** Registra un cuidador por HTTP y devuelve su token y su id. */
export async function cuidadorDePrueba(api: ApiDePrueba, sufijo = 'a') {
  const { cuerpo } = await api.peticion('POST', '/api/auth/registro/cuidador', {
    cuerpo: {
      nombre: 'Ana Correa',
      email: `ana.${sufijo}@prueba.test`,
      contrasena: 'ClaveSegura123',
      aceptaPoliticaDeDatos: true,
    },
  });
  return { token: cuerpo.token as string, id: cuerpo.usuario.id as string };
}
