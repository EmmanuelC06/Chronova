import type { Correo, EnviadorDeCorreo } from '../../application/ports/EnviadorDeCorreo.js';

const URL_DE_ENVIO = 'https://api.resend.com/emails';
const TIEMPO_MAXIMO_MS = 10_000;

/**
 * ADAPTADOR de correo real, sobre la API de Resend.
 *
 * Se eligio por ser de las pocas que se usan con una clave y una peticion
 * HTTP, sin instalar librerias ni configurar un servidor SMTP. Cambiar a
 * otro proveedor es reescribir este archivo y nada mas: ni el dominio ni
 * los casos de uso saben que existe.
 *
 * NO LANZA, por la misma razon que el notificador: si el proveedor esta
 * caido, la solicitud de recuperacion ya quedo guardada y el usuario
 * puede pedir otro codigo. Y sobre todo, un error aqui no debe cambiar la
 * respuesta de la API, porque esa diferencia revelaria si el correo
 * existe.
 */
export class CorreoResendHttp implements EnviadorDeCorreo {
  constructor(
    private readonly claveApi: string,
    private readonly remitente: string,
  ) {}

  async enviar(correo: Correo): Promise<void> {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), TIEMPO_MAXIMO_MS);

    try {
      const respuesta = await fetch(URL_DE_ENVIO, {
        method: 'POST',
        signal: controlador.signal,
        headers: {
          Authorization: `Bearer ${this.claveApi}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.remitente,
          to: [correo.para],
          subject: correo.asunto,
          text: correo.cuerpo,
        }),
      });

      if (!respuesta.ok) {
        const detalle = await respuesta.text().catch(() => '');
        console.error(
          `[correo] El proveedor respondio ${respuesta.status}: ${detalle.slice(0, 300)}`,
        );
      }
    } catch (error) {
      console.error(
        '[correo] No se pudo enviar:',
        error instanceof Error ? error.message : error,
      );
    } finally {
      clearTimeout(temporizador);
    }
  }
}
