import type { Aviso, Notificador } from '../../application/ports/Notificador.js';

/**
 * ADAPTADOR del puerto Notificador que solo escribe en consola.
 *
 * Es suficiente para el entorno academico y para desarrollo. Cuando se
 * quiera enviar notificaciones push de verdad, se crea otro adaptador
 * (por ejemplo NotificadorExpoPush) que implemente esta misma interfaz y
 * se cambia una linea en el contenedor de dependencias. Ni el dominio ni
 * los casos de uso cambian.
 */
export class NotificadorEnConsola implements Notificador {
  private readonly historial: Aviso[] = [];

  async enviar(aviso: Aviso): Promise<void> {
    this.historial.push(aviso);
    console.log(
      `[AVISO ${aviso.tipo}] -> ${aviso.tipoDeDestinatario} ${aviso.destinatarioId.valor}: ${aviso.titulo} | ${aviso.cuerpo}`,
    );
  }

  /** Solo para pruebas: que avisos se enviaron. */
  avisosEnviados(): readonly Aviso[] {
    return this.historial;
  }
}
