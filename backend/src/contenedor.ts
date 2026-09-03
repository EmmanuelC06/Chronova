import type pg from 'pg';

import type { Entorno } from './config/entorno.js';

import { PoliticaDeAcceso } from './application/services/PoliticaDeAcceso.js';
import { ActualizarPreferencias } from './application/use-cases/auth/ActualizarPreferencias.js';
import { IniciarSesion } from './application/use-cases/auth/IniciarSesion.js';
import { ObtenerPerfil } from './application/use-cases/auth/ObtenerPerfil.js';
import { RegistrarCuidador } from './application/use-cases/auth/RegistrarCuidador.js';
import { RegistrarPaciente } from './application/use-cases/auth/RegistrarPaciente.js';
import { CambiarPermisosDelVinculo } from './application/use-cases/cuidadores/CambiarPermisosDelVinculo.js';
import { OlvidarDispositivo } from './application/use-cases/dispositivos/OlvidarDispositivo.js';
import { RegistrarDispositivo } from './application/use-cases/dispositivos/RegistrarDispositivo.js';
import { SolicitarRecuperacion } from './application/use-cases/auth/SolicitarRecuperacion.js';
import { RestablecerContrasena } from './application/use-cases/auth/RestablecerContrasena.js';
import type { RepositorioDeRecuperaciones } from './domain/recuperacion/RepositorioDeRecuperaciones.js';
import type { EnviadorDeCorreo } from './application/ports/EnviadorDeCorreo.js';
import type { GeneradorDeCodigos } from './application/ports/GeneradorDeCodigos.js';
import { CorreoEnConsola } from './infrastructure/correo/CorreoEnConsola.js';
import { CorreoResendHttp } from './infrastructure/correo/CorreoResendHttp.js';
import { ListarCuidadoresDelPaciente } from './application/use-cases/cuidadores/ListarCuidadoresDelPaciente.js';
import { ListarPacientesDelCuidador } from './application/use-cases/cuidadores/ListarPacientesDelCuidador.js';
import { ResponderSolicitudDeVinculo } from './application/use-cases/cuidadores/ResponderSolicitudDeVinculo.js';
import { SolicitarVinculo } from './application/use-cases/cuidadores/SolicitarVinculo.js';
import { ActualizarMedicamento } from './application/use-cases/medicamentos/ActualizarMedicamento.js';
import { ListarMedicamentos } from './application/use-cases/medicamentos/ListarMedicamentos.js';
import { ReabastecerStock } from './application/use-cases/medicamentos/ReabastecerStock.js';
import { RegistrarMedicamento } from './application/use-cases/medicamentos/RegistrarMedicamento.js';
import { SuspenderMedicamento } from './application/use-cases/medicamentos/SuspenderMedicamento.js';
import { CerrarTomasVencidas } from './application/use-cases/tomas/CerrarTomasVencidas.js';
import { ConsultarHistorial } from './application/use-cases/tomas/ConsultarHistorial.js';
import { ObtenerAgendaDelDia } from './application/use-cases/tomas/ObtenerAgendaDelDia.js';
import { RegistrarToma } from './application/use-cases/tomas/RegistrarToma.js';

import type { RepositorioDeCuidadores } from './domain/cuidador/RepositorioDeCuidadores.js';
import type { RepositorioDeDispositivos } from './domain/dispositivo/RepositorioDeDispositivos.js';
import type { RepositorioDeMedicamentos } from './domain/medicamento/RepositorioDeMedicamentos.js';
import type { RepositorioDePacientes } from './domain/paciente/RepositorioDePacientes.js';
import type { RepositorioDeTomas } from './domain/toma/RepositorioDeTomas.js';
import type { RepositorioDeVinculos } from './domain/vinculo/RepositorioDeVinculos.js';

import {
  RepositorioDeCuidadoresEnMemoria,
  RepositorioDeDispositivosEnMemoria,
  RepositorioDeMedicamentosEnMemoria,
  RepositorioDePacientesEnMemoria,
  RepositorioDeRecuperacionesEnMemoria,
  RepositorioDeTomasEnMemoria,
  RepositorioDeVinculosEnMemoria,
} from './infrastructure/persistence/in-memory/repositoriosEnMemoria.js';
import {
  RepositorioDeCuidadoresPostgres,
  RepositorioDeDispositivosPostgres,
  RepositorioDeMedicamentosPostgres,
  RepositorioDePacientesPostgres,
  RepositorioDeRecuperacionesPostgres,
  RepositorioDeTomasPostgres,
  RepositorioDeVinculosPostgres,
} from './infrastructure/persistence/postgres/repositoriosPostgres.js';
import { crearPool } from './infrastructure/persistence/postgres/pool.js';
import { CifradorBcrypt } from './infrastructure/security/CifradorBcrypt.js';
import { ServicioDeTokensJwt } from './infrastructure/security/ServicioDeTokensJwt.js';
import { GeneradorDeCodigosSeguro, GeneradorDeIdsUuid } from './infrastructure/system/GeneradorDeIdsUuid.js';
import { ClienteDeExpoHttp } from './infrastructure/notificaciones/ClienteDeExpo.js';
import { NotificadorCompuesto } from './infrastructure/notificaciones/NotificadorCompuesto.js';
import { NotificadorEnConsola } from './infrastructure/notificaciones/NotificadorEnConsola.js';
import { NotificadorExpoPush } from './infrastructure/notificaciones/NotificadorExpoPush.js';
import { RelojDelSistema } from './infrastructure/system/RelojDelSistema.js';

import type { CifradorDeContrasenas } from './application/ports/CifradorDeContrasenas.js';
import type { GeneradorDeIds } from './application/ports/GeneradorDeIds.js';
import type { Notificador } from './application/ports/Notificador.js';
import type { Reloj } from './application/ports/Reloj.js';
import type { ServicioDeTokens } from './application/ports/ServicioDeTokens.js';

/** Todo lo que la capa HTTP necesita para trabajar. */
export interface Contenedor {
  entorno: Entorno;
  tokens: ServicioDeTokens;
  pool: pg.Pool | null;
  casosDeUso: {
    registrarPaciente: RegistrarPaciente;
    registrarCuidador: RegistrarCuidador;
    iniciarSesion: IniciarSesion;
    obtenerPerfil: ObtenerPerfil;
    actualizarPreferencias: ActualizarPreferencias;

    registrarMedicamento: RegistrarMedicamento;
    listarMedicamentos: ListarMedicamentos;
    actualizarMedicamento: ActualizarMedicamento;
    suspenderMedicamento: SuspenderMedicamento;
    reabastecerStock: ReabastecerStock;

    obtenerAgendaDelDia: ObtenerAgendaDelDia;
    registrarToma: RegistrarToma;
    consultarHistorial: ConsultarHistorial;
    cerrarTomasVencidas: CerrarTomasVencidas;

    solicitarVinculo: SolicitarVinculo;
    responderSolicitudDeVinculo: ResponderSolicitudDeVinculo;
    cambiarPermisosDelVinculo: CambiarPermisosDelVinculo;
    listarPacientesDelCuidador: ListarPacientesDelCuidador;
    listarCuidadoresDelPaciente: ListarCuidadoresDelPaciente;

    solicitarRecuperacion: SolicitarRecuperacion;
    restablecerContrasena: RestablecerContrasena;
    registrarDispositivo: RegistrarDispositivo;
    olvidarDispositivo: OlvidarDispositivo;
  };
  cerrar(): Promise<void>;
}

/** Adaptadores que se pueden sustituir desde fuera (util en pruebas). */
export interface DependenciasOpcionales {
  reloj?: Reloj;
  ids?: GeneradorDeIds;
  cifrador?: CifradorDeContrasenas;
  notificador?: Notificador;
  codigos?: GeneradorDeCodigos;
  correo?: EnviadorDeCorreo;
  repositorios?: {
    pacientes: RepositorioDePacientes;
    cuidadores: RepositorioDeCuidadores;
    medicamentos: RepositorioDeMedicamentos;
    tomas: RepositorioDeTomas;
    vinculos: RepositorioDeVinculos;
    dispositivos: RepositorioDeDispositivos;
    recuperaciones: RepositorioDeRecuperaciones;
  };
}

/**
 * COMPOSITION ROOT (raiz de composicion).
 *
 * Este es el unico lugar de todo el backend donde se decide que
 * implementacion concreta se conecta a cada puerto. Aqui, y solo aqui,
 * se sabe que la persistencia es PostgreSQL, que el cifrado es bcrypt y
 * que los tokens son JWT.
 *
 * Cambiar de base de datos es cambiar tres lineas de este archivo. Ese
 * es, en la practica, todo el beneficio de la arquitectura hexagonal.
 */
export function construirContenedor(
  entorno: Entorno,
  opcionales: DependenciasOpcionales = {},
): Contenedor {
  // --- Adaptadores de apoyo ---
  const reloj = opcionales.reloj ?? new RelojDelSistema();
  const ids = opcionales.ids ?? new GeneradorDeIdsUuid();
  const cifrador = opcionales.cifrador ?? new CifradorBcrypt();
  const codigos = opcionales.codigos ?? new GeneradorDeCodigosSeguro();
  const correo = opcionales.correo ?? construirEnviadorDeCorreo(entorno);
  const tokens = new ServicioDeTokensJwt(entorno.jwtSecreto, entorno.jwtDuracion);

  // --- Adaptadores de persistencia ---
  let pool: pg.Pool | null = null;
  let repositorios = opcionales.repositorios;

  if (!repositorios) {
    if (entorno.persistencia === 'postgres') {
      pool = crearPool(entorno);
      repositorios = {
        pacientes: new RepositorioDePacientesPostgres(pool),
        cuidadores: new RepositorioDeCuidadoresPostgres(pool),
        medicamentos: new RepositorioDeMedicamentosPostgres(pool),
        tomas: new RepositorioDeTomasPostgres(pool),
        vinculos: new RepositorioDeVinculosPostgres(pool),
        dispositivos: new RepositorioDeDispositivosPostgres(pool),
        recuperaciones: new RepositorioDeRecuperacionesPostgres(pool),
      };
    } else {
      repositorios = {
        pacientes: new RepositorioDePacientesEnMemoria(),
        cuidadores: new RepositorioDeCuidadoresEnMemoria(),
        medicamentos: new RepositorioDeMedicamentosEnMemoria(),
        tomas: new RepositorioDeTomasEnMemoria(),
        vinculos: new RepositorioDeVinculosEnMemoria(),
        dispositivos: new RepositorioDeDispositivosEnMemoria(),
        recuperaciones: new RepositorioDeRecuperacionesEnMemoria(),
      };
    }
  }

  const { pacientes, cuidadores, medicamentos, tomas, vinculos, dispositivos, recuperaciones } =
    repositorios;
  const politica = new PoliticaDeAcceso(vinculos);
  const tolerancia = entorno.ventanaDeToleranciaEnMinutos;

  // --- Notificaciones ---
  // Se elige aqui, y solo aqui, como salen los avisos al mundo. El
  // dominio y los casos de uso solo conocen el puerto Notificador.
  const notificador = opcionales.notificador ?? construirNotificador(entorno, dispositivos, reloj);

  // --- Casos de uso ---
  const casosDeUso: Contenedor['casosDeUso'] = {
    registrarPaciente: new RegistrarPaciente(pacientes, cifrador, tokens, ids, reloj),
    registrarCuidador: new RegistrarCuidador(cuidadores, cifrador, tokens, ids, reloj),
    iniciarSesion: new IniciarSesion(pacientes, cuidadores, cifrador, tokens),
    obtenerPerfil: new ObtenerPerfil(pacientes, cuidadores, reloj),
    actualizarPreferencias: new ActualizarPreferencias(pacientes),

    registrarMedicamento: new RegistrarMedicamento(medicamentos, pacientes, politica, ids, reloj),
    listarMedicamentos: new ListarMedicamentos(medicamentos, politica),
    actualizarMedicamento: new ActualizarMedicamento(medicamentos, tomas, politica, reloj),
    suspenderMedicamento: new SuspenderMedicamento(medicamentos, tomas, politica, reloj),
    reabastecerStock: new ReabastecerStock(medicamentos, politica),

    obtenerAgendaDelDia: new ObtenerAgendaDelDia(
      medicamentos,
      tomas,
      pacientes,
      politica,
      ids,
      reloj,
      tolerancia,
    ),
    registrarToma: new RegistrarToma(tomas, medicamentos, politica, reloj, notificador),
    consultarHistorial: new ConsultarHistorial(
      tomas,
      medicamentos,
      pacientes,
      politica,
      reloj,
      tolerancia,
    ),
    cerrarTomasVencidas: new CerrarTomasVencidas(
      tomas,
      pacientes,
      vinculos,
      notificador,
      reloj,
    ),

    solicitarVinculo: new SolicitarVinculo(
      vinculos,
      pacientes,
      cuidadores,
      ids,
      reloj,
      notificador,
    ),
    responderSolicitudDeVinculo: new ResponderSolicitudDeVinculo(vinculos, reloj, notificador),
    cambiarPermisosDelVinculo: new CambiarPermisosDelVinculo(vinculos),
    listarPacientesDelCuidador: new ListarPacientesDelCuidador(
      vinculos,
      pacientes,
      medicamentos,
      tomas,
      reloj,
      tolerancia,
    ),
    listarCuidadoresDelPaciente: new ListarCuidadoresDelPaciente(vinculos, cuidadores),

    solicitarRecuperacion: new SolicitarRecuperacion(
      pacientes,
      cuidadores,
      recuperaciones,
      cifrador,
      codigos,
      ids,
      reloj,
      correo,
    ),
    restablecerContrasena: new RestablecerContrasena(
      pacientes,
      cuidadores,
      recuperaciones,
      cifrador,
      reloj,
    ),
    registrarDispositivo: new RegistrarDispositivo(dispositivos, ids, reloj),
    olvidarDispositivo: new OlvidarDispositivo(dispositivos),
  };

  return {
    entorno,
    tokens,
    pool,
    casosDeUso,
    async cerrar() {
      if (pool) await pool.end();
    },
  };
}


/**
 * Decide como se entregan los avisos segun la configuracion.
 *
 * En desarrollo basta la consola. En produccion interesa el envio real
 * y, normalmente, tambien el registro en consola para poder auditar que
 * se envio. El modo "ambos" usa el patron Composite: un notificador que
 * contiene otros y cumple la misma interfaz.
 */
function construirNotificador(
  entorno: Entorno,
  dispositivos: RepositorioDeDispositivos,
  reloj: Reloj,
): Notificador {
  const consola = new NotificadorEnConsola();

  if (entorno.notificaciones === 'consola') return consola;

  const push = new NotificadorExpoPush(
    dispositivos,
    new ClienteDeExpoHttp(entorno.expoTokenDeAcceso),
    reloj,
  );

  return entorno.notificaciones === 'push' ? push : new NotificadorCompuesto(push, consola);
}

/**
 * Elige el adaptador de correo.
 *
 * Por defecto escribe en la consola, que permite ejercitar la
 * recuperacion de contrasena entera sin contratar nada: el codigo aparece
 * en la terminal del servidor. Con CORREO=resend y una clave se envia de
 * verdad, sin tocar el dominio ni los casos de uso.
 */
function construirEnviadorDeCorreo(entorno: Entorno): EnviadorDeCorreo {
  if (entorno.correo === 'resend' && entorno.correoClaveApi) {
    return new CorreoResendHttp(entorno.correoClaveApi, entorno.correoRemitente);
  }
  return new CorreoEnConsola();
}
