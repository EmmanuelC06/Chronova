/** Un correo listo para enviar. Texto plano: llega a todos los clientes. */
export interface Correo {
  para: string;
  asunto: string;
  cuerpo: string;
}

/**
 * PUERTO de envio de correo.
 *
 * Existe por el mismo motivo que el puerto Notificador: el dominio y los
 * casos de uso no deben saber si detras hay un servicio de pago, un
 * servidor SMTP propio o una linea escrita en la consola durante el
 * desarrollo.
 *
 * Igual que aquel, NUNCA LANZA. Si el correo no sale, la solicitud de
 * recuperacion ya quedo guardada y el usuario puede volver a pedirla; que
 * el proveedor este caido no debe convertirse en un error de la
 * aplicacion ni, sobre todo, en una pista de si ese correo existe.
 */
export interface EnviadorDeCorreo {
  enviar(correo: Correo): Promise<void>;
}
