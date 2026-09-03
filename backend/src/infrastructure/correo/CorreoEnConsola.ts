import type { Correo, EnviadorDeCorreo } from '../../application/ports/EnviadorDeCorreo.js';

/**
 * ADAPTADOR de correo que escribe en la consola del servidor.
 *
 * Es el equivalente de NotificadorEnConsola, y cumple el mismo papel:
 * permite ejercitar el flujo COMPLETO de recuperacion de contrasena sin
 * contratar ningun servicio ni configurar ninguna clave. El codigo
 * aparece en la terminal y se escribe en la aplicacion.
 *
 * Para el proyecto academico esto es suficiente y demostrable. Para
 * usuarios reales hay que cambiar una variable de entorno.
 */
export class CorreoEnConsola implements EnviadorDeCorreo {
  private readonly enviados: Correo[] = [];

  async enviar(correo: Correo): Promise<void> {
    // Se acota para no acumular datos personales en memoria sin limite.
    this.enviados.push(correo);
    if (this.enviados.length > 50) this.enviados.shift();

    console.log('');
    console.log('  ┌─ CORREO (no se envio de verdad) ───────────────');
    console.log(`  │ Para:   ${correo.para}`);
    console.log(`  │ Asunto: ${correo.asunto}`);
    console.log('  ├────────────────────────────────────────────────');
    for (const linea of correo.cuerpo.split('\n')) console.log(`  │ ${linea}`);
    console.log('  └────────────────────────────────────────────────');
    console.log('');
  }

  /** Solo para pruebas. */
  correosEnviados(): readonly Correo[] {
    return this.enviados;
  }
}
