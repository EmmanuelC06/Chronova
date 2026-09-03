import Constants from 'expo-constants';

import { ErrorDeApi } from '../../dominio/modelos';
import type {
  AgendaDelDia,
  CuidadorDelPaciente,
  Historial,
  Medicamento,
  PacienteEnPanel,
  Perfil,
  PermisosDelCuidador,
  Preferencias,
  Sesion,
  TipoDeUsuario,
} from '../../dominio/modelos';
import type { ApiDeChronova } from '../../dominio/puertos';

/**
 * ADAPTADOR: cliente HTTP de la API de Chronova.
 *
 * Es el unico archivo de toda la app que sabe que existe fetch y que la
 * comunicacion es por HTTP. Las pantallas solo conocen el puerto
 * ApiDeChronova.
 *
 * Detalle importante para probar en un telefono real: "localhost" desde
 * el celular apunta al propio celular, no a tu computador. Hay que poner
 * la IP de tu computador en la red wifi (algo como 192.168.1.10) en el
 * campo "apiUrl" de app.json.
 */

const URL_POR_DEFECTO = 'http://localhost:4000';
const TIEMPO_MAXIMO_MS = 15_000;

/**
 * Zona horaria del telefono, en nomenclatura IANA.
 *
 * Intl viene con el motor de JavaScript, asi que no hace falta ninguna
 * libreria. Si el dispositivo no la reporta, se deja que el servidor
 * decida (usara la del proyecto, America/Bogota).
 */
function zonaHorariaDelDispositivo(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

function resolverUrlBase(): string {
  const configurada = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  return (configurada ?? URL_POR_DEFECTO).replace(/\/$/, '');
}

export class ClienteChronova implements ApiDeChronova {
  private token: string | null = null;

  constructor(private readonly urlBase: string = resolverUrlBase()) {}

  usarToken(token: string | null): void {
    this.token = token;
  }

  // ---------------------------------------------------------------
  // Autenticacion
  // ---------------------------------------------------------------

  registrarPaciente(datos: {
    nombre: string;
    email: string;
    contrasena: string;
    telefono?: string | null;
    fechaDeNacimiento?: string | null;
    zonaHoraria?: string | null;
  }): Promise<Sesion> {
    return this.pedir<Sesion>('POST', '/api/auth/registro/paciente', {
      ...datos,
      // Si la pantalla no la indica, se toma la del telefono. Es lo que
      // hace que "las 8 de la manana" signifique las 8 donde vive.
      zonaHoraria: datos.zonaHoraria ?? zonaHorariaDelDispositivo(),
    });
  }

  registrarCuidador(datos: {
    nombre: string;
    email: string;
    contrasena: string;
    telefono?: string | null;
    rol?: string | null;
  }): Promise<Sesion> {
    return this.pedir<Sesion>('POST', '/api/auth/registro/cuidador', datos);
  }

  iniciarSesion(datos: {
    email: string;
    contrasena: string;
    tipo?: TipoDeUsuario;
  }): Promise<Sesion> {
    return this.pedir<Sesion>('POST', '/api/auth/sesion', datos);
  }

  obtenerPerfil(): Promise<Perfil> {
    return this.pedir<Perfil>('GET', '/api/auth/perfil');
  }

  actualizarPreferencias(cambios: Partial<Preferencias>): Promise<Preferencias> {
    return this.pedir<Preferencias>('PATCH', '/api/auth/preferencias', cambios);
  }

  // ---------------------------------------------------------------
  // Dispositivo (notificaciones push)
  // ---------------------------------------------------------------

  registrarDispositivo(token: string, plataforma: string): Promise<unknown> {
    return this.pedir('POST', '/api/auth/dispositivos', { token, plataforma });
  }

  olvidarDispositivo(token: string): Promise<unknown> {
    return this.pedir('DELETE', '/api/auth/dispositivos', { token });
  }

  // ---------------------------------------------------------------
  // Medicamentos
  // ---------------------------------------------------------------

  async listarMedicamentos(pacienteId?: string): Promise<Medicamento[]> {
    const respuesta = await this.pedir<{ medicamentos: Medicamento[] }>(
      'GET',
      `/api/medicamentos${pacienteId ? `?pacienteId=${pacienteId}` : ''}`,
    );
    return respuesta.medicamentos;
  }

  registrarMedicamento(datos: Record<string, unknown>): Promise<Medicamento> {
    return this.pedir<Medicamento>('POST', '/api/medicamentos', datos);
  }

  actualizarMedicamento(
    medicamentoId: string,
    cambios: Record<string, unknown>,
  ): Promise<Medicamento> {
    return this.pedir<Medicamento>('PATCH', `/api/medicamentos/${medicamentoId}`, cambios);
  }

  async suspenderMedicamento(medicamentoId: string): Promise<void> {
    await this.pedir('DELETE', `/api/medicamentos/${medicamentoId}`);
  }

  reabastecerStock(medicamentoId: string, unidades: number): Promise<Medicamento> {
    return this.pedir<Medicamento>('POST', `/api/medicamentos/${medicamentoId}/stock`, {
      unidades,
    });
  }

  // ---------------------------------------------------------------
  // Tomas
  // ---------------------------------------------------------------

  obtenerAgenda(opciones: { fecha?: string; pacienteId?: string } = {}): Promise<AgendaDelDia> {
    const parametros = new URLSearchParams();
    if (opciones.fecha) parametros.set('fecha', opciones.fecha);
    if (opciones.pacienteId) parametros.set('pacienteId', opciones.pacienteId);
    const cadena = parametros.toString();
    return this.pedir<AgendaDelDia>('GET', `/api/tomas/agenda${cadena ? `?${cadena}` : ''}`);
  }

  registrarToma(
    tomaId: string,
    accion: 'CONFIRMAR' | 'OMITIR' | 'POSPONER',
    extras: { observaciones?: string; minutos?: number } = {},
  ): Promise<{ avisoDeStock: string | null }> {
    return this.pedir<{ avisoDeStock: string | null }>(
      'POST',
      `/api/tomas/${tomaId}/registro`,
      { accion, ...extras },
    );
  }

  consultarHistorial(
    opciones: { pacienteId?: string; desde?: string; hasta?: string } = {},
  ): Promise<Historial> {
    const parametros = new URLSearchParams();
    for (const [clave, valor] of Object.entries(opciones)) {
      if (valor) parametros.set(clave, valor);
    }
    const cadena = parametros.toString();
    return this.pedir<Historial>('GET', `/api/tomas/historial${cadena ? `?${cadena}` : ''}`);
  }

  // ---------------------------------------------------------------
  // Cuidadores y vinculos
  // ---------------------------------------------------------------

  async listarPacientesDelCuidador(dias?: number): Promise<PacienteEnPanel[]> {
    const respuesta = await this.pedir<{ pacientes: PacienteEnPanel[] }>(
      'GET',
      `/api/cuidadores/pacientes${dias ? `?dias=${dias}` : ''}`,
    );
    return respuesta.pacientes;
  }

  async listarCuidadoresDelPaciente(): Promise<CuidadorDelPaciente[]> {
    const respuesta = await this.pedir<{ cuidadores: CuidadorDelPaciente[] }>(
      'GET',
      '/api/pacientes/cuidadores',
    );
    return respuesta.cuidadores;
  }

  solicitarVinculo(datos: {
    emailDeLaOtraParte: string;
    parentesco?: string | null;
  }): Promise<unknown> {
    return this.pedir('POST', '/api/vinculos', datos);
  }

  responderVinculo(
    vinculoId: string,
    respuesta: 'ACEPTAR' | 'RECHAZAR' | 'REVOCAR',
  ): Promise<unknown> {
    return this.pedir('POST', `/api/vinculos/${vinculoId}/respuesta`, { respuesta });
  }

  cambiarPermisosDelVinculo(
    vinculoId: string,
    permisos: Partial<PermisosDelCuidador>,
  ): Promise<unknown> {
    return this.pedir('PATCH', `/api/vinculos/${vinculoId}/permisos`, permisos);
  }

  // ---------------------------------------------------------------
  // Motor de peticiones
  // ---------------------------------------------------------------

  private async pedir<T>(
    metodo: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    ruta: string,
    cuerpo?: unknown,
  ): Promise<T> {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), TIEMPO_MAXIMO_MS);

    let respuesta: Response;
    try {
      respuesta = await fetch(`${this.urlBase}${ruta}`, {
        method: metodo,
        signal: controlador.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      });
    } catch (error) {
      // Sin internet, servidor apagado o IP equivocada: un mensaje que
      // la persona pueda entender y accionar.
      const esTiempoAgotado = error instanceof Error && error.name === 'AbortError';
      throw new ErrorDeApi(
        esTiempoAgotado
          ? 'El servidor esta tardando demasiado en responder. Intentalo de nuevo.'
          : 'No pudimos conectarnos con el servidor. Revisa tu conexion a internet.',
        'SIN_CONEXION',
      );
    } finally {
      clearTimeout(temporizador);
    }

    const texto = await respuesta.text();
    const datos = texto ? (JSON.parse(texto) as Record<string, any>) : {};

    if (!respuesta.ok) {
      const error = datos.error ?? {};
      throw new ErrorDeApi(
        error.mensaje ?? 'Ocurrio un error inesperado.',
        error.codigo ?? 'ERROR_INTERNO',
        error.campo,
        respuesta.status,
      );
    }

    return datos as T;
  }
}
