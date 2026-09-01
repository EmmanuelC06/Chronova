import type { Aviso, Notificador } from '../../application/ports/Notificador.js';
import type { Reloj } from '../../application/ports/Reloj.js';
import type { Dispositivo } from '../../domain/dispositivo/Dispositivo.js';
import type { RepositorioDeDispositivos } from '../../domain/dispositivo/RepositorioDeDispositivos.js';
import { TokenDeDispositivo } from '../../domain/dispositivo/TokenDeDispositivo.js';
import type { AcuseExpo, ClienteDeExpo, MensajeExpo } from './ClienteDeExpo.js';
import { MAXIMO_POR_LOTE } from './ClienteDeExpo.js';

/**
 * ADAPTADOR del puerto Notificador que entrega avisos como
 * notificaciones push a los telefonos de la persona.
 *
 * Cumple exactamente el mismo contrato que NotificadorEnConsola, asi que
 * cambiar de uno a otro es una linea en el contenedor. Ni el dominio ni
 * los casos de uso saben que existe Expo.
 *
 * Tres decisiones que conviene entender:
 *
 * 1. NUNCA LANZA. Si Expo esta caido, la toma del paciente se registra
 *    igual. Un aviso perdido es molesto; perder el registro clinico
 *    porque un servicio externo fallo seria mucho peor.
 *
 * 2. DA DE BAJA LOS TOKENS MUERTOS. Cuando alguien desinstala la app,
 *    Expo responde DeviceNotRegistered. Si no se borra ese token, el
 *    sistema seguira intentando enviarle avisos para siempre.
 *
 * 3. ENVIA POR LOTES. Expo acepta como maximo 100 mensajes por peticion.
 */
export class NotificadorExpoPush implements Notificador {
  constructor(
    private readonly dispositivos: RepositorioDeDispositivos,
    private readonly cliente: ClienteDeExpo,
    private readonly reloj: Reloj,
    /** Canal de Android. Debe coincidir con el que crea la app movil. */
    private readonly canal = 'chronova-tomas',
  ) {}

  async enviar(aviso: Aviso): Promise<void> {
    try {
      const registrados = await this.dispositivos.listarPorPropietario(aviso.destinatarioId);

      if (registrados.length === 0) {
        // No es un error: la persona simplemente no ha abierto la app en
        // ningun telefono, o no concedio permiso de notificaciones.
        return;
      }

      const mensajes = registrados.map((dispositivo) => this.construirMensaje(aviso, dispositivo));

      for (const lote of repartirEnLotes(mensajes, MAXIMO_POR_LOTE)) {
        const acuses = await this.cliente.enviar(lote);
        await this.procesarAcuses(lote, acuses);
      }
    } catch (error) {
      // Se registra y se sigue. Ver decision 1 en el comentario de arriba.
      console.error(
        `[aviso ${aviso.tipo}] No se pudo enviar la notificacion:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  private construirMensaje(aviso: Aviso, dispositivo: Dispositivo): MensajeExpo {
    return {
      to: dispositivo.token.valor,
      title: aviso.titulo,
      body: aviso.cuerpo,
      sound: 'default',
      // Las tomas perdidas y el stock agotado son urgentes: deben
      // despertar la pantalla. Una solicitud de vinculo puede esperar.
      priority: esUrgente(aviso) ? 'high' : 'default',
      channelId: this.canal,
      data: {
        tipo: aviso.tipo,
        ...(aviso.datos ?? {}),
      },
    };
  }

  /**
   * Revisa cada acuse y limpia los tokens que ya no sirven.
   *
   * Los acuses vienen en el mismo orden que los mensajes enviados, que
   * es como la API de Expo permite emparejarlos.
   */
  private async procesarAcuses(
    mensajes: readonly MensajeExpo[],
    acuses: readonly AcuseExpo[],
  ): Promise<void> {
    const ahora = this.reloj.ahora();

    for (let i = 0; i < mensajes.length; i += 1) {
      const acuse = acuses[i];
      const mensaje = mensajes[i];
      if (!acuse || !mensaje) continue;

      if (acuse.status === 'ok') {
        await this.marcarComoUsado(mensaje.to, ahora);
        continue;
      }

      const motivo = acuse.details?.error;

      if (motivo === 'DeviceNotRegistered') {
        // La app se desinstalo o el token caduco. Se da de baja.
        await this.olvidar(mensaje.to);
      } else {
        console.warn(
          `[expo] Envio rechazado (${motivo ?? 'sin detalle'}): ${acuse.message ?? ''}`,
        );
      }
    }
  }

  private async marcarComoUsado(token: string, ahora: Date): Promise<void> {
    try {
      const dispositivo = await this.dispositivos.buscarPorToken(TokenDeDispositivo.desde(token));
      if (!dispositivo) return;
      dispositivo.marcarComoUsado(ahora);
      await this.dispositivos.guardar(dispositivo);
    } catch {
      // Actualizar la fecha de ultimo uso es informativo: si falla, no
      // debe impedir que el resto del lote se procese.
    }
  }

  private async olvidar(token: string): Promise<void> {
    try {
      await this.dispositivos.eliminarPorToken(TokenDeDispositivo.desde(token));
      console.log(`[expo] Token dado de baja porque el dispositivo ya no existe.`);
    } catch {
      // Ignorado a proposito.
    }
  }
}

function esUrgente(aviso: Aviso): boolean {
  return aviso.tipo === 'TOMA_PERDIDA' || aviso.tipo === 'STOCK_BAJO';
}

export function repartirEnLotes<T>(elementos: readonly T[], tamano: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < elementos.length; i += tamano) {
    lotes.push(elementos.slice(i, i + tamano));
  }
  return lotes;
}
