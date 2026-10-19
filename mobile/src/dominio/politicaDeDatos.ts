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
export const VERSION_DE_LA_POLITICA = '2.2';

/**
 * Dónde se lee el texto completo.
 *
 * Antes esto eran dos direcciones a `chronova.app`, un dominio que no
 * existe: los botones abrían el navegador en una página en blanco. Los
 * documentos viven ahora dentro de la app, en `textosLegales.ts`, y se
 * abren con estas rutas. Funcionan sin conexión, que para este caso no
 * es un lujo: el titular tiene derecho a conocer la política, y ese
 * derecho no debería depender de que haya señal.
 */
export const RUTA_DE_LA_POLITICA = '/legal?doc=politica';
export const RUTA_DE_LOS_TERMINOS = '/legal?doc=terminos';

/**
 * Quiénes responden por estos datos, y cómo se les contacta.
 *
 * El numeral 1 del artículo 2.2.2.25.3.2 del Decreto 1074 de 2015 exige
 * que el aviso de privacidad diga el nombre y los datos de contacto del
 * Responsable. No basta con que aparezca en el documento largo: tiene
 * que estar donde la persona autoriza.
 *
 * Son TRES, no uno. La Ley 1581 define al Responsable por lo que hace,
 * quien decide sobre la base de datos y sus finalidades, y aquí eso se
 * decide entre la universidad, que aprueba el proyecto y lo supervisa, y
 * los dos desarrolladores, que deciden qué recoge el sistema y cómo se
 * guarda. Así se lo confirmó la institución al equipo.
 *
 * Los tres comparten un solo canal de contacto a propósito: un titular
 * no tiene por qué averiguar a cuál de los tres escribirle. El buzón es
 * el de la oficina de protección de datos de la universidad, y usarlo
 * así está pendiente de que la propia universidad lo acepte.
 */
export const RESPONSABLES = {
  universidad: {
    razonSocial: 'Universidad Católica Luis Amigó',
    nit: '890.985.189-9',
  },
  desarrolladores: ['Emmanuel Correa Valencia', 'Julián Andrés Herrera Roncancio'],
  /** El canal común de los tres. */
  contacto: {
    direccion: 'Transversal 51A #67B 90, Medellín, Colombia',
    correo: 'protecciondedatos@amigo.edu.co',
    telefono: '+57 (604) 448 7666',
  },
} as const;

/**
 * Lo que dice la casilla de autorización.
 *
 * Va sin marcar por defecto: una casilla premarcada no es autorización
 * expresa, es una suposición.
 *
 * Nombra a los responsables porque una autorización se le otorga a
 * alguien. Sin destinatario, no queda claro a quién autorizó la persona,
 * y eso es justamente lo que el artículo 8 le da derecho a probar.
 */
export const TEXTO_DE_LA_AUTORIZACION =
  'Autorizo a los responsables de Chronova, la ' +
  `${RESPONSABLES.universidad.razonSocial} y su equipo de desarrollo, el tratamiento ` +
  'de mis datos personales, incluidos mis datos de salud, y que se guarden en servidores ' +
  'fuera de Colombia, según la Política de Tratamiento de Datos y los Términos y ' +
  'Condiciones.';

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
      'Si crees que no cumplimos, puedes presentar una queja ante la Superintendencia de Industria y Comercio.',
    ],
  },
  {
    titulo: 'Quién responde',
    parrafos: [
      `Tus datos tienen tres responsables, que responden juntos: la ${RESPONSABLES.universidad.razonSocial} (NIT ${RESPONSABLES.universidad.nit}, ${RESPONSABLES.contacto.direccion}) y los dos desarrolladores del proyecto, ${RESPONSABLES.desarrolladores.join(' y ')}.`,
      'Los tres atienden por la misma dirección, así que no tienes que averiguar a cuál escribirle.',
      // El correo no va dentro de la frase a proposito: son treinta
      // caracteres sin espacios y, con la letra en "muy grande", no cabe
      // en el ancho de la tarjeta. Va en el boton de abajo, que ademas
      // abre el correo con la direccion ya puesta.
      `Para ejercer tus derechos escríbeles con el botón que hay al final de esta pantalla, o llama al ${RESPONSABLES.contacto.telefono}.`,
    ],
  },
];
