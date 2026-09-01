import type { Aviso, Notificador } from '../../application/ports/Notificador.js';

/**
 * ADAPTADOR que reparte cada aviso entre varios notificadores.
 *
 * Permite, por ejemplo, enviar la notificacion push y a la vez dejar
 * constancia en la consola del servidor, que durante el desarrollo es
 * la unica forma de ver que el sistema si esta avisando.
 *
 * Cada destino se aisla: si el envio push falla, el registro en consola
 * ocurre igual. Es el patron Composite aplicado a un puerto, y funciona
 * porque el compuesto cumple la misma interfaz que sus partes.
 */
export class NotificadorCompuesto implements Notificador {
  private readonly destinos: readonly Notificador[];

  constructor(...destinos: Notificador[]) {
    this.destinos = destinos;
  }

  async enviar(aviso: Aviso): Promise<void> {
    await Promise.all(
      this.destinos.map(async (destino) => {
        try {
          await destino.enviar(aviso);
        } catch (error) {
          console.error(
            '[aviso] Un destino de notificacion fallo:',
            error instanceof Error ? error.message : error,
          );
        }
      }),
    );
  }
}
