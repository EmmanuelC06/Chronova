import { ErrorDeValidacion } from '../../domain/shared/errores.js';

/**
 * Version de la Politica de Tratamiento de Datos que rige hoy.
 *
 * Vive aqui, en un solo sitio, porque la usan los dos registros y la
 * pantalla de privacidad de la app. Cuando la politica cambie de forma
 * sustancial se sube este numero, y a partir de ese momento
 * `AutorizacionDeDatos.esAnteriorA` permite distinguir a quien acepto el
 * texto viejo — que es a quien hay que volver a preguntarle.
 *
 * El texto de cada version se conserva en docs/legal/, de modo que el
 * numero guardado junto a la cuenta siempre se puede resolver al
 * documento exacto que esa persona leyo.
 */
export const VERSION_VIGENTE_DE_LA_POLITICA = '1.0';

/**
 * Comprueba que el titular autorizo, de verdad, antes de crear la cuenta.
 *
 * Los datos de salud son sensibles (art. 5 de la Ley 1581 de 2012) y el
 * articulo 6 exige autorizacion EXPLICITA para tratarlos. "Explicita"
 * quiere decir un acto deliberado: por eso el cliente tiene que enviar
 * `aceptaPoliticaDeDatos: true` y no vale omitirlo.
 *
 * Se comprueba en la capa de aplicacion y no solo en el formulario
 * porque un formulario es una sugerencia: cualquiera puede llamar a la
 * API directamente. La regla tiene que estar donde no se pueda rodear.
 *
 * Devuelve la version que se registrara junto a la cuenta. Si el cliente
 * declara una version, se guarda ESA y no la vigente: lo que importa
 * probar es el texto que la persona tuvo delante, no el que el servidor
 * considera actual.
 */
export function versionAutorizadaOFallar(datos: {
  aceptaPoliticaDeDatos?: boolean;
  versionDePolitica?: string | null;
}): string {
  if (datos.aceptaPoliticaDeDatos !== true) {
    throw new ErrorDeValidacion(
      'Para crear la cuenta hace falta autorizar el tratamiento de los datos personales, ' +
        'incluidos los de salud. Nadie esta obligado a hacerlo, pero sin esa autorizacion ' +
        'Chronova no puede funcionar.',
      'aceptaPoliticaDeDatos',
    );
  }

  const declarada = (datos.versionDePolitica ?? '').trim();
  return declarada === '' ? VERSION_VIGENTE_DE_LA_POLITICA : declarada;
}
