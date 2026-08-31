import { Identificador } from '../../../domain/shared/Identificador.js';
import { ErrorNoEncontrado } from '../../../domain/shared/errores.js';
import type { RepositorioDeCuidadores } from '../../../domain/cuidador/RepositorioDeCuidadores.js';
import type { RepositorioDePacientes } from '../../../domain/paciente/RepositorioDePacientes.js';
import type { Sesion } from '../../ports/ServicioDeTokens.js';
import type { Reloj } from '../../ports/Reloj.js';

export interface PerfilDeUsuario {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  tipo: 'PACIENTE' | 'CUIDADOR';
  creadoEn: string;
  /** Solo para pacientes. */
  edad?: number | null;
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

  async ejecutar(sesion: Sesion): Promise<PerfilDeUsuario> {
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
        edad: paciente.edadEn(this.reloj.ahora()),
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
