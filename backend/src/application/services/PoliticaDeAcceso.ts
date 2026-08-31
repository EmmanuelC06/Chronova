import type { Identificador } from '../../domain/shared/Identificador.js';
import { ErrorDeAutorizacion } from '../../domain/shared/errores.js';
import type { RepositorioDeVinculos } from '../../domain/vinculo/RepositorioDeVinculos.js';
import type { PermisosDelCuidador, Vinculo } from '../../domain/vinculo/Vinculo.js';

/** Quien esta realizando la peticion, ya resuelto desde el token. */
export interface Solicitante {
  id: Identificador;
  tipo: 'PACIENTE' | 'CUIDADOR';
}

/**
 * Servicio de aplicacion que responde una sola pregunta:
 * ¿este cuidador puede hacer esto con los datos de este paciente?
 *
 * Centralizarlo evita que la comprobacion se olvide en algun endpoint,
 * que es exactamente como se filtran los datos de salud en la practica.
 */
export class PoliticaDeAcceso {
  constructor(private readonly vinculos: RepositorioDeVinculos) {}

  /**
   * Verifica que exista un vinculo aceptado con el permiso pedido.
   * Devuelve el vinculo para que quien llama pueda usar sus datos.
   */
  async asegurarAccesoDelCuidador(
    cuidadorId: Identificador,
    pacienteId: Identificador,
    permiso: keyof PermisosDelCuidador,
  ): Promise<Vinculo> {
    const vinculo = await this.vinculos.buscarEntre(cuidadorId, pacienteId);

    if (!vinculo || !vinculo.estaActivo) {
      // Mismo mensaje exista o no el vinculo: no revelamos si esa
      // persona es paciente del sistema.
      throw new ErrorDeAutorizacion('No tienes acceso a la informacion de este paciente.');
    }
    if (!vinculo.autorizar(permiso)) {
      throw new ErrorDeAutorizacion(
        'El paciente no te ha concedido permiso para realizar esta accion.',
      );
    }
    return vinculo;
  }

  /**
   * Punto unico de control para cualquier operacion sobre los datos de
   * un paciente, venga del paciente mismo o de un cuidador.
   *
   * - Si quien pide es el paciente y es el dueno de los datos: adelante.
   * - Si es otro paciente: no.
   * - Si es un cuidador: debe existir vinculo aceptado con ese permiso.
   */
  async asegurarAccesoAPaciente(
    solicitante: Solicitante,
    pacienteId: Identificador,
    permiso: keyof PermisosDelCuidador,
  ): Promise<Vinculo | null> {
    if (solicitante.tipo === 'PACIENTE') {
      this.asegurarQueEsElMismoPaciente(solicitante.id, pacienteId);
      return null;
    }
    return this.asegurarAccesoDelCuidador(solicitante.id, pacienteId, permiso);
  }

  /**
   * Para acciones que solo el propio paciente puede hacer sobre si mismo.
   */
  asegurarQueEsElMismoPaciente(
    solicitanteId: Identificador,
    pacienteId: Identificador,
  ): void {
    if (!solicitanteId.esIgualA(pacienteId)) {
      throw new ErrorDeAutorizacion('Solo el propio paciente puede realizar esta accion.');
    }
  }
}
