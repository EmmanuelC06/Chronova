/**
 * La autorización de tratamiento de datos, del lado de la app.
 *
 * Chronova guarda datos de salud, que el artículo 5 de la Ley 1581 de
 * 2012 clasifica como **sensibles**. Para tratarlos hace falta
 * autorización explícita del titular (artículo 6), y el titular tiene
 * derecho a pedir **prueba** de lo que autorizó (artículo 8, literal b).
 *
 * De ahí que este archivo exista: la app no solo pide la autorización,
 * declara QUÉ VERSIÓN del texto le mostró a la persona, y el servidor
 * guarda esa versión junto a la cuenta. Si un día la app va una versión
 * atrasada, se registra la que realmente se leyó y no la que el servidor
 * considera vigente — porque lo que hay que poder probar es lo que la
 * persona tuvo delante.
 *
 * El texto completo vive en `docs/legal/`. Aquí está solo el resumen que
 * se muestra en pantalla, que es lo que el Decreto 1074 de 2015 llama
 * "aviso de privacidad": la versión corta, siempre que remita a la larga.
 */

/**
 * Versión del texto que esta compilación de la app muestra.
 *
 * Tiene que coincidir con la del documento en `docs/legal/`. Al cambiar
 * el texto de forma sustancial se sube este número **y** el del
 * documento, en el mismo commit.
 */
export const VERSION_DE_LA_POLITICA = '1.0';

/** Dónde puede leerse el texto completo. Se completa al publicarlo. */
export const URL_DE_LA_POLITICA = 'https://chronova.app/politica-de-datos';
export const URL_DE_LOS_TERMINOS = 'https://chronova.app/terminos';

/**
 * Lo que dice la casilla de autorización.
 *
 * Va sin marcar por defecto: una casilla premarcada no es autorización
 * expresa, es una suposición.
 */
export const TEXTO_DE_LA_AUTORIZACION =
  'Autorizo el tratamiento de mis datos personales, incluidos mis datos de salud, ' +
  'y que se guarden en servidores fuera de Colombia, según la Política de ' +
  'Tratamiento de Datos y los Términos y Condiciones.';

/**
 * La advertencia que la ley obliga a dar y que casi ninguna app da.
 *
 * El parágrafo del artículo 6 dice que ninguna persona está obligada a
 * autorizar el tratamiento de datos sensibles. Decirlo en voz alta es
 * parte de que la autorización sea informada.
 */
export const TEXTO_DE_LA_ADVERTENCIA =
  'No estás obligado a autorizarlo. Sin esta autorización no podemos crear tu cuenta, ' +
  'porque Chronova no puede recordarte nada sin la información de tu tratamiento.';

/** El aviso de privacidad corto, tal como se muestra en pantalla. */
export const AVISO_DE_PRIVACIDAD: { titulo: string; parrafos: string[] }[] = [
  {
    titulo: 'Qué guardamos',
    parrafos: [
      'Tu nombre, tu correo y la información de tu tratamiento: qué medicamentos tomas, a qué horas y si confirmaste cada toma.',
      'La información sobre tu salud es un dato sensible. La ley dice que nadie está obligado a entregarla, así que necesitamos que nos autorices expresamente.',
    ],
  },
  {
    titulo: 'Para qué la usamos',
    parrafos: [
      'Para recordarte tus tomas, llevar tu historial y avisar a la persona que tú autorices si una toma queda sin confirmar. Nada más.',
      'No la vendemos ni la compartimos con aseguradoras, empleadores ni anunciantes. No hacemos publicidad con ella.',
    ],
  },
  {
    titulo: 'Quién la ve',
    parrafos: [
      'Solo tú, y los cuidadores que tú autorices. Decides qué puede ver cada uno y puedes quitarle el acceso cuando quieras, sin dar explicaciones.',
    ],
  },
  {
    titulo: 'Dónde se guarda',
    parrafos: [
      'En servidores de nuestros proveedores tecnológicos, que están fuera de Colombia. Al autorizar, también autorizas que tus datos salgan del país para poder guardarlos allí.',
    ],
  },
  {
    titulo: 'Tus derechos',
    parrafos: [
      'Puedes conocer tus datos, corregirlos, pedirnos prueba de esta autorización, retirarla y pedir que borremos todo.',
      'Muchos de esos derechos los ejerces desde la propia app: corriges tu perfil, cambias los permisos de cada cuidador y revocas un acceso cuando quieras.',
    ],
  },
];
