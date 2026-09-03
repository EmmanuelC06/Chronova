import { Identificador } from '../../../domain/shared/Identificador.js';
import { ErrorNoEncontrado } from '../../../domain/shared/errores.js';
import type { RepositorioDeCuidadores } from '../../../domain/cuidador/RepositorioDeCuidadores.js';
import type { RepositorioDePacientes } from '../../../domain/paciente/RepositorioDePacientes.js';
import type { TipoDeUsuario } from '../../ports/ServicioDeTokens.js';
import type { Reloj } from '../../ports/Reloj.js';

/**
 * Quien pide su perfil.
 *
 * Es su propio tipo y no el `Sesion` del puerto de tokens: a este caso
 * de uso le da igual como se autentico la persona, y atarlo al formato
 * del token obliga a inventar datos de token en cada prueba.
 */
export interface ComandoObtenerPerfil {
  usuarioId: string;
  tipo: TipoDeUsuario;
}

export interface PerfilDeUsuario {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  tipo: 'PACIENTE' | 'CUIDADOR';
  creadoEn: string;
  /** Solo para pacientes. */
  edad?: number | null;
  zonaHoraria?: string;
  preferencias?: Record<string, unknown>;
  /** Solo para cuidadores. */
  rol?: string | null;
}

/** CASO DE USO: devolver el perfil de quien tiene la sesion abierta. */
export class ObtenerPerfil {
  constructor(
    private readonly pacientes: RepositorioDePacientes,
    private readonly cuidadores: RepositorioDeCuidadores,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(sesion: ComandoObtenerPerfil): Promise<PerfilDeUsuario> {
    const id = Identificador.desde(sesion.usuarioId);

    if (sesion.tipo === 'PACIENTE') {
      const paciente = await this.pacientes.buscarPorId(id);
      if (!paciente) throw new ErrorNoEncontrado('el paciente', sesion.usuarioId);
      return {
        id: paciente.id.valor,
        nombre: paciente.nombre,
        email: paciente.email.valor,
        telefono: paciente.telefono?.valor ?? null,
        tipo: 'PACIENTE',
        creadoEn: paciente.creadoEn.toISOString(),
        // La edad se calcula sobre el dia del calendario del paciente,
        // no sobre el del servidor.
        edad: paciente.edadEn(paciente.zonaHoraria.fechaLocalDe(this.reloj.ahora())),
        zonaHoraria: paciente.zonaHoraria.valor,
        preferencias: paciente.preferencias.toJSON(),
      };
    }

    const cuidador = await this.cuidadores.buscarPorId(id);
    if (!cuidador) throw new ErrorNoEncontrado('el cuidador', sesion.usuarioId);
    return {
      id: cuidador.id.valor,
      nombre: cuidador.nombre,
      email: cuidador.email.valor,
      telefono: cuidador.telefono?.valor ?? null,
      tipo: 'CUIDADOR',
      creadoEn: cuidador.creadoEn.toISOString(),
      rol: cuidador.rol,
    };
  }
}
