import type { Entorno } from '../src/config/entorno.js';
import { construirContenedor } from '../src/contenedor.js';
import type { Contenedor } from '../src/contenedor.js';
import { Identificador } from '../src/domain/shared/Identificador.js';
import type { Solicitante } from '../src/application/services/PoliticaDeAcceso.js';
import {
  RepositorioDeCuidadoresEnMemoria,
  RepositorioDeDispositivosEnMemoria,
  RepositorioDeRecuperacionesEnMemoria,
  RepositorioDeMedicamentosEnMemoria,
  RepositorioDePacientesEnMemoria,
  RepositorioDeTomasEnMemoria,
  RepositorioDeVinculosEnMemoria,
} from '../src/infrastructure/persistence/in-memory/repositoriosEnMemoria.js';
import {
  GeneradorDeCodigosFijo,
  GeneradorDeIdsSecuencial,
} from '../src/infrastructure/system/GeneradorDeIdsUuid.js';
import { CorreoEnConsola } from '../src/infrastructure/correo/CorreoEnConsola.js';
import { NotificadorEnConsola } from '../src/infrastructure/notificaciones/NotificadorEnConsola.js';
import { RelojFijo } from '../src/infrastructure/system/RelojDelSistema.js';
import type { CifradorDeContrasenas } from '../src/application/ports/CifradorDeContrasenas.js';

/**
 * Utilidades compartidas por las pruebas.
 *
 * Aqui se ve el beneficio practico de la arquitectura hexagonal: se
 * monta la aplicacion COMPLETA (todos los casos de uso) sin base de
 * datos, con un reloj congelado y con ids predecibles. Las pruebas
 * corren en milisegundos y sus resultados son siempre los mismos.
 */

/**
 * Codigo de recuperacion fijo para las pruebas.
 *
 * En produccion lo genera el generador criptografico del sistema. Aqui se
 * fija para poder comprobar el flujo completo sin adivinar nada, que es
 * justo para lo que existe ese puerto.
 */
export const CODIGO_DE_PRUEBA = '246813';

/** Cifrador de mentira: rapido y reversible. Solo para pruebas. */
class CifradorDePrueba implements CifradorDeContrasenas {
  async cifrar(contrasena: string): Promise<string> {
    return `cifrado:${contrasena}`;
  }
  async verificar(contrasena: string, cifrada: string): Promise<boolean> {
    return cifrada === `cifrado:${contrasena}`;
  }
}

export const ENTORNO_DE_PRUEBA: Entorno = {
  puerto: 0,
  entornoDeEjecucion: 'test',
  jwtSecreto: 'secreto-de-pruebas-suficientemente-largo',
  jwtDuracion: '1h',
  persistencia: 'memory',
  urlDeBaseDeDatos: '',
  baseDeDatosConSsl: false,
  ventanaDeToleranciaEnMinutos: 60,
  notificaciones: 'consola',
  expoTokenDeAcceso: undefined,
  correo: 'consola',
  correoClaveApi: undefined,
  correoRemitente: 'Chronova <pruebas@chronova.test>',
};

export interface EntornoDePrueba {
  contenedor: Contenedor;
  reloj: RelojFijo;
  notificador: NotificadorEnConsola;
  correo: CorreoEnConsola;
  recuperaciones: RepositorioDeRecuperacionesEnMemoria;
  /** El codigo que devuelve el generador fijo de recuperacion. */
  codigoDeRecuperacion: string;
}

export function montarAplicacion(
  fechaInicial = new Date('2026-08-31T12:00:00Z'),
): EntornoDePrueba {
  const reloj = new RelojFijo(fechaInicial);
  const notificador = new NotificadorEnConsola();
  const correo = new CorreoEnConsola();
  const recuperaciones = new RepositorioDeRecuperacionesEnMemoria();

  const contenedor = construirContenedor(ENTORNO_DE_PRUEBA, {
    reloj,
    ids: new GeneradorDeIdsSecuencial(),
    codigos: new GeneradorDeCodigosFijo(CODIGO_DE_PRUEBA),
    correo,
    cifrador: new CifradorDePrueba(),
    notificador,
    repositorios: {
      pacientes: new RepositorioDePacientesEnMemoria(),
      cuidadores: new RepositorioDeCuidadoresEnMemoria(),
      medicamentos: new RepositorioDeMedicamentosEnMemoria(),
      tomas: new RepositorioDeTomasEnMemoria(),
      vinculos: new RepositorioDeVinculosEnMemoria(),
      dispositivos: new RepositorioDeDispositivosEnMemoria(),
      recuperaciones,
    },
  });

  return {
    contenedor,
    reloj,
    notificador,
    correo,
    recuperaciones,
    codigoDeRecuperacion: CODIGO_DE_PRUEBA,
  };
}

export function comoPaciente(id: string): Solicitante {
  return { id: Identificador.desde(id), tipo: 'PACIENTE' };
}

export function comoCuidador(id: string): Solicitante {
  return { id: Identificador.desde(id), tipo: 'CUIDADOR' };
}

/** Registra una paciente lista para usar en las pruebas. */
export async function crearPacienteDePrueba(
  entorno: EntornoDePrueba,
  email = 'rosa@test.com',
  zonaHoraria = 'America/Bogota',
): Promise<{ id: string; solicitante: Solicitante }> {
  const resultado = await entorno.contenedor.casosDeUso.registrarPaciente.ejecutar({
    nombre: 'Rosa Valencia',
    email,
    contrasena: 'contrasena-segura',
    fechaDeNacimiento: '1952-04-18',
    zonaHoraria,
  });
  return { id: resultado.usuario.id, solicitante: comoPaciente(resultado.usuario.id) };
}

/** Registra un cuidador listo para usar en las pruebas. */
export async function crearCuidadorDePrueba(
  entorno: EntornoDePrueba,
  email = 'ana@test.com',
): Promise<{ id: string; solicitante: Solicitante }> {
  const resultado = await entorno.contenedor.casosDeUso.registrarCuidador.ejecutar({
    nombre: 'Ana Correa',
    email,
    contrasena: 'contrasena-segura',
    rol: 'Hija',
  });
  return { id: resultado.usuario.id, solicitante: comoCuidador(resultado.usuario.id) };
}
