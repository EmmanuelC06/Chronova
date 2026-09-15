import type { Aviso, Notificador } from '../ports/Notificador.js';

/**
 * Manda un aviso y, si falla, se lo traga.
 *
 * Existe por una razon muy concreta. El RNF-21 dice que "un fallo del
 * servicio de notificaciones no impedira registrar ni cerrar una toma",
 * y hasta ahora eso se cumplia por casualidad: los adaptadores actuales
 * capturan sus propios errores, asi que nunca lanzaban. Pero los casos
 * de uso hacian `await this.notificador.enviar(...)` a pelo. El dia que
 * un adaptador nuevo dejara escapar una excepcion (un cliente HTTP que
 * agota su tiempo, un `JSON.parse` de una respuesta rara), el efecto
 * seria el peor posible:
 *
 *   la toma YA esta guardada, y el paciente ve un error.
 *
 * Es decir, le decimos "no pudimos registrar tu toma" a alguien que si
 * la registro. Para una app de adherencia, hacer que alguien se tome una
 * segunda dosis porque cree que la primera no quedo anotada no es un
 * fallo de interfaz: es un riesgo clinico.
 *
 * Por eso el aviso se manda SIEMPRE despues de persistir, y por eso su
 * fallo no puede propagarse. Un recordatorio que no llega es una
 * molestia; un registro que se pierde, o que parece perderse, es otra
 * cosa.
 *
 * Se devuelve `true` o `false` en lugar de no devolver nada para que las
 * pruebas puedan comprobar que el fallo se detecto y no simplemente que
 * nadie se entero.
 */
export async function avisarSinRomper(
  notificador: Notificador,
  aviso: Aviso,
  registrar: (mensaje: string) => void = (mensaje) => console.warn(mensaje),
): Promise<boolean> {
  try {
    await notificador.enviar(aviso);
    return true;
  } catch (problema) {
    const motivo = problema instanceof Error ? problema.message : String(problema);
    registrar(
      `[aviso] No se pudo enviar el aviso ${aviso.tipo} a ${aviso.tipoDeDestinatario} ` +
        `${aviso.destinatarioId.valor}: ${motivo}`,
    );
    return false;
  }
}
