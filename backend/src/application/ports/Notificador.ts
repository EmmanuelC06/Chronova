import type { Identificador } from '../../domain/shared/Identificador.js';

export type TipoDeAviso =
  | 'TOMA_PERDIDA'
  | 'STOCK_BAJO'
  | 'ADHERENCIA_BAJA'
  | 'SOLICITUD_DE_VINCULO'
  | 'VINCULO_ACEPTADO';

export interface Aviso {
  tipo: TipoDeAviso;
  destinatarioId: Identificador;
  tipoDeDestinatario: 'PACIENTE' | 'CUIDADOR';
  titulo: string;
  cuerpo: string;
  datos?: Record<string, unknown>;
}

/**
 * PUERTO de notificaciones.
 *
 * Los casos de uso solo dicen "avisa esto a esta persona". Que eso
 * termine en una notificacion push de Expo, un correo o un SMS es una
 * decision de infraestructura. Hoy hay un adaptador que solo lo registra
 * en consola, suficiente para el entorno academico.
 */
export interface Notificador {
  enviar(aviso: Aviso): Promise<void>;
}
