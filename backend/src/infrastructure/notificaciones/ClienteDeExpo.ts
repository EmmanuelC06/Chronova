/**
 * Mensaje tal como lo espera la API de Expo Push.
 * https://docs.expo.dev/push-notifications/sending-notifications/
 */
export interface MensajeExpo {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
}

/**
 * Acuse de recibo que devuelve Expo por cada mensaje.
 *
 * "ok" significa que Expo acepto el mensaje, no que llego al telefono.
 * La entrega real se confirma despues consultando los recibos, que para
 * el alcance de este proyecto no hace falta implementar.
 */
export interface AcuseExpo {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * PUERTO del adaptador hacia el servicio de Expo.
 *
 * Existe para que el notificador se pueda probar por completo sin salir
 * a la red: en las pruebas se le pasa un cliente falso que devuelve los
 * acuses que uno quiera, incluidos los de error.
 */
export interface ClienteDeExpo {
  enviar(mensajes: readonly MensajeExpo[]): Promise<AcuseExpo[]>;
}

/** Expo acepta como maximo 100 mensajes por peticion. */
export const MAXIMO_POR_LOTE = 100;

const URL_DE_ENVIO = 'https://exp.host/--/api/v2/push/send';
const TIEMPO_MAXIMO_MS = 15_000;

/**
 * ADAPTADOR real: habla con Expo por HTTP.
 *
 * El token de acceso es opcional. Sin el, cualquiera que consiga un
 * token de dispositivo de tus usuarios podria enviarles notificaciones
 * haciendose pasar por Chronova. Para un despliegue de verdad conviene
 * activarlo en el panel de Expo y ponerlo en EXPO_ACCESS_TOKEN.
 */
export class ClienteDeExpoHttp implements ClienteDeExpo {
  constructor(private readonly tokenDeAcceso?: string) {}

  async enviar(mensajes: readonly MensajeExpo[]): Promise<AcuseExpo[]> {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), TIEMPO_MAXIMO_MS);

    try {
      const respuesta = await fetch(URL_DE_ENVIO, {
        method: 'POST',
        signal: controlador.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          ...(this.tokenDeAcceso ? { Authorization: `Bearer ${this.tokenDeAcceso}` } : {}),
        },
        body: JSON.stringify(mensajes),
      });

      if (!respuesta.ok) {
        throw new Error(`Expo respondio ${respuesta.status} ${respuesta.statusText}`);
      }

      const cuerpo = (await respuesta.json()) as { data?: AcuseExpo[]; errors?: unknown };

      if (!cuerpo.data) {
        throw new Error(`Expo no devolvio acuses: ${JSON.stringify(cuerpo.errors ?? cuerpo)}`);
      }

      return cuerpo.data;
    } finally {
      clearTimeout(temporizador);
    }
  }
}
