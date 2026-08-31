import type { RepositorioDeCuidadores } from '../../../domain/cuidador/RepositorioDeCuidadores.js';
import type { RepositorioDeVinculos } from '../../../domain/vinculo/RepositorioDeVinculos.js';
import type { PermisosDelCuidador } from '../../../domain/vinculo/Vinculo.js';
import type { Solicitante } from '../../services/PoliticaDeAcceso.js';

export interface CuidadorDelPaciente {
  vinculoId: string;
  cuidadorId: string;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: string | null;
  parentesco: string | null;
  estado: string;
  permisos: PermisosDelCuidador;
  solicitadoPor: string;
  creadoEn: string;
}

/**
 * CASO DE USO: el paciente ve quien lo esta acompanando.
 *
 * Es la pantalla que hace visible y reversible el consentimiento: desde
 * aqui el paciente aprueba solicitudes pendientes o retira accesos.
 */
export class ListarCuidadoresDelPaciente {
  constructor(
    private readonly vinculos: RepositorioDeVinculos,
    private readonly cuidadores: RepositorioDeCuidadores,
  ) {}

  async ejecutar(consulta: { solicitante: Solicitante }): Promise<CuidadorDelPaciente[]> {
    const vinculos = await this.vinculos.listarPorPaciente(consulta.solicitante.id);
    const visibles = vinculos.filter((v) => v.estado !== 'RECHAZADO');

    const filas: CuidadorDelPaciente[] = [];

    for (const vinculo of visibles) {
      const cuidador = await this.cuidadores.buscarPorId(vinculo.cuidadorId);
      if (!cuidador) continue;

      filas.push({
        vinculoId: vinculo.id.valor,
        cuidadorId: cuidador.id.valor,
        nombre: cuidador.nombre,
        email: cuidador.email.valor,
        telefono: cuidador.telefono?.valor ?? null,
        rol: cuidador.rol,
        parentesco: vinculo.parentesco,
        estado: vinculo.estado,
        permisos: vinculo.permisos,
        solicitadoPor: vinculo.solicitadoPor,
        creadoEn: vinculo.creadoEn.toISOString(),
      });
    }

    // Las solicitudes pendientes primero: piden una decision del paciente.
    return filas.sort((a, b) => {
      if (a.estado === 'PENDIENTE' && b.estado !== 'PENDIENTE') return -1;
      if (b.estado === 'PENDIENTE' && a.estado !== 'PENDIENTE') return 1;
      return a.nombre.localeCompare(b.nombre);
    });
  }
}
