/**
 * La Política de Tratamiento y los Términos, completos, dentro de la app.
 *
 * Antes estos dos documentos eran dos enlaces a `chronova.app`, un sitio
 * que todavía no existe. Los botones abrían una página en blanco, que es
 * la peor forma posible de fallar: parece que cumples y no cumples.
 *
 * El numeral 4 del artículo 2.2.2.25.3.2 del Decreto 1074 de 2015 exige
 * que el aviso de privacidad indique los mecanismos para conocer la
 * política de tratamiento. Un enlace roto no es un mecanismo. Y el
 * artículo 2.2.2.25.3.1 pide que la política conste en medio físico o
 * electrónico: la pantalla del teléfono lo es, un dominio sin contenido
 * no.
 *
 * Tenerlos aquí tiene además dos ventajas que el sitio web no daría:
 * funcionan sin conexión, y quedan congelados dentro de la versión de la
 * app que la persona aceptó. Eso es justo lo que hay que poder probar
 * cuando alguien ejerce el derecho del artículo 8, literal b).
 *
 * El texto es el mismo de `docs/legal/`, adaptado a una pantalla de
 * teléfono leída por un adulto mayor: sin tablas, con frases más cortas
 * y sin marcas de formato. Cuando cambie el documento de `docs/legal/`,
 * cambia este archivo en el mismo commit, y los dos suben de versión.
 */

export type BloqueLegal =
  | { tipo: 'parrafo'; texto: string }
  | { tipo: 'lista'; puntos: string[] }
  | { tipo: 'dato'; etiqueta: string; valor: string }
  | { tipo: 'aviso'; texto: string };

export interface SeccionLegal {
  titulo: string;
  bloques: BloqueLegal[];
}

export interface DocumentoLegal {
  /** Lo que va en la barra de navegación. Corto, cabe en un teléfono. */
  tituloCorto: string;
  /** El nombre completo, el que la ley usa. */
  titulo: string;
  version: string;
  secciones: SeccionLegal[];
}

/**
 * Si la universidad ya revisó y aprobó los documentos.
 *
 * Mientras valga `false`, las dos pantallas muestran arriba un aviso
 * diciéndolo. No es un detalle de cortesía: publicar un documento legal
 * sin la revisión de la institución que figura entre los Responsables, y
 * no decirlo, sería afirmar algo que todavía no es cierto.
 *
 * Cuando llegue la aprobación se cambia a `true` y se rellena la fecha.
 */
export const POLITICA_APROBADA = false;
export const FECHA_DE_VIGENCIA = 'pendiente de publicación';

const AVISO_DE_BORRADOR =
  'Este documento está pendiente de la revisión de la oficina de protección de datos ' +
  'de la universidad. Mientras tanto, Chronova se usa solo con fines académicos y no ' +
  'debe usarse con información de salud de personas reales.';

// -----------------------------------------------------------------
// Política de Tratamiento de Datos Personales
// -----------------------------------------------------------------

export const POLITICA_DE_TRATAMIENTO: DocumentoLegal = {
  tituloCorto: 'Política de datos',
  titulo: 'Política de Tratamiento de Datos Personales de Chronova',
  version: '2.0',
  secciones: [
    {
      titulo: 'Quiénes responden por tus datos',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Tus datos tienen tres responsables, que responden de forma conjunta ante ti y ante las autoridades:',
        },
        {
          tipo: 'lista',
          puntos: [
            'La Universidad Católica Luis Amigó, NIT 890.985.189-9, que aprueba el proyecto, fija sus lineamientos y supervisa que se cumpla la ley.',
            'Emmanuel Correa Valencia, desarrollador del proyecto.',
            'Julián Andrés Herrera Roncancio, desarrollador del proyecto.',
          ],
        },
        {
          tipo: 'parrafo',
          texto:
            'Los tres atienden por la misma dirección, así que no tienes que averiguar a cuál escribirle. Escribes una vez y quedan enterados los tres.',
        },
        {
          tipo: 'dato',
          etiqueta: 'Dirección',
          valor: 'Transversal 51A #67B 90, Medellín, Colombia',
        },
        { tipo: 'dato', etiqueta: 'Correo', valor: 'protecciondedatos@amigo.edu.co' },
        { tipo: 'dato', etiqueta: 'Teléfono', valor: '+57 (604) 448 7666' },
        {
          tipo: 'parrafo',
          texto:
            'Son tres porque la ley considera responsable a quien decide sobre la base de datos y sobre para qué se usa, y esas decisiones aquí se toman entre la universidad y los dos desarrolladores. Cuando deciden varios, responden varios.',
        },
        {
          tipo: 'parrafo',
          texto:
            'Ninguno de los tres puede, por su cuenta, cambiar para qué se usan tus datos, entregárselos a un tercero ni darles un uso nuevo. Eso se decide entre los tres, obliga a actualizar esta política y obliga a pedirte otra vez tu autorización.',
        },
      ],
    },
    {
      titulo: 'Qué es Chronova',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Una aplicación que te ayuda a recordar y registrar la toma de tus medicamentos, y que permite que un cuidador que tú autorices acompañe ese seguimiento.',
        },
      ],
    },
    {
      titulo: 'Para qué usamos tus datos',
      bloques: [
        { tipo: 'parrafo', texto: 'Para estas siete cosas, y para ninguna otra:' },
        {
          tipo: 'lista',
          puntos: [
            'Crear tu cuenta y saber que eres tú quien entra.',
            'Armar tu agenda diaria de tomas, en tu zona horaria, a partir del tratamiento que tú registras.',
            'Guardar si tomaste o no cada medicamento, y calcular tu porcentaje de cumplimiento.',
            'Sonar la alarma en tu teléfono a la hora de cada toma.',
            'Avisarle al cuidador que tú autorices cuando una toma queda sin confirmar.',
            'Dejarte recuperar la contraseña con un código que llega a tu correo.',
            'Recordar cómo prefieres ver la aplicación: el tamaño de la letra y las alertas.',
          ],
        },
        { tipo: 'parrafo', texto: 'Y esto es lo que no hacemos, dicho con todas las letras:' },
        {
          tipo: 'lista',
          puntos: [
            'No vendemos, alquilamos ni cedemos tus datos a nadie con fines comerciales.',
            'No los usamos para publicidad ni para clasificarte como cliente.',
            'No los compartimos con aseguradoras, EPS, empleadores ni bancos.',
            'No tomamos decisiones automáticas sobre ti. Tu porcentaje de cumplimiento es información, no un diagnóstico ni una recomendación médica.',
          ],
        },
      ],
    },
    {
      titulo: 'Qué datos guardamos',
      bloques: [
        { tipo: 'parrafo', texto: 'Para identificarte y poder comunicarnos contigo:' },
        {
          tipo: 'lista',
          puntos: [
            'Tu nombre y tu correo electrónico. Los dos son obligatorios.',
            'Tu contraseña, que se guarda cifrada. No queda escrita en ninguna parte y nadie puede recuperarla, ni siquiera quien administra el sistema.',
            'Tu zona horaria, que la toma el teléfono, para que las 8 de la mañana sean las 8 donde tú vives.',
            'Tu teléfono y tu fecha de nacimiento, solo si quieres darlos. Ninguna función depende de ellos.',
          ],
        },
        { tipo: 'parrafo', texto: 'Sobre tu salud, que es la parte delicada:' },
        {
          tipo: 'lista',
          puntos: [
            'Tus medicamentos: nombre, dosis, frecuencia, horarios, fechas de inicio y fin, instrucciones y cuántos te quedan.',
            'Tus tomas: la hora programada, si la tomaste o no, cuándo la resolviste, quién la registró y las observaciones que añadas.',
            'Tus indicadores de cumplimiento y puntualidad, que se calculan a partir de lo anterior.',
          ],
        },
        {
          tipo: 'aviso',
          texto:
            'La información sobre tu salud es un dato sensible según la ley colombiana. Eso significa tres cosas: necesitamos tu autorización explícita para tratarla, no estás obligado a darla, y tienes derecho a no responder las preguntas que traten sobre ella.',
        },
        { tipo: 'parrafo', texto: 'Y unos datos técnicos que hacen falta para que funcione:' },
        {
          tipo: 'lista',
          puntos: [
            'Un identificador de tu teléfono, para mandarle los avisos al aparato correcto.',
            'Si usas Android o iPhone, para dar el aviso en el formato que ese sistema entiende.',
            'Las fechas en que se creó tu cuenta, se actualizó y se usó por última vez.',
          ],
        },
        {
          tipo: 'parrafo',
          texto:
            'Chronova no accede a tu ubicación, a tus contactos, a la cámara, al micrófono ni a datos biométricos como la huella o la cara, y no guarda identificadores de publicidad.',
        },
      ],
    },
    {
      titulo: 'Quién puede ver tu tratamiento',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Tú eres el dueño de tus datos y controlas cada acceso, uno por uno. Un cuidador no ve absolutamente nada hasta que tú aceptas el vínculo.',
        },
        {
          tipo: 'parrafo',
          texto:
            'Cuando lo aceptas, lo que ese cuidador puede hacer depende de cuatro permisos separados que enciendes y apagas desde tu perfil cuando quieras:',
        },
        {
          tipo: 'lista',
          puntos: [
            'Ver tu tratamiento: tus medicamentos, tu agenda y tu historial. Nace concedido.',
            'Registrar tomas por ti: confirmar u omitir una toma en tu nombre. Nace denegado.',
            'Gestionar tus medicamentos: registrar, modificar, suspender y reabastecer. Nace denegado.',
            'Recibir alertas cuando una toma tuya queda sin confirmar. Nace concedido.',
          ],
        },
        {
          tipo: 'parrafo',
          texto:
            'Los dos permisos que le dejan actuar sobre tu tratamiento nacen apagados a propósito. Cambiar la medicación de otra persona es lo más delicado que el sistema permite, y eso se concede deliberadamente o no se concede.',
        },
        {
          tipo: 'parrafo',
          texto:
            'Puedes retirarle el acceso a cualquier cuidador en cualquier momento, sin dar explicaciones y sin que esa persona pueda impedirlo.',
        },
      ],
    },
    {
      titulo: 'Dónde se guardan y quién más los toca',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Chronova se apoya en proveedores tecnológicos que tratan los datos por cuenta de los responsables. Algunos tienen sus servidores fuera de Colombia:',
        },
        { tipo: 'dato', etiqueta: 'Base de datos', valor: 'Neon, en Virginia, Estados Unidos' },
        {
          tipo: 'dato',
          etiqueta: 'Envío de avisos al teléfono',
          valor: 'Expo, en Estados Unidos',
        },
        {
          tipo: 'aviso',
          texto:
            'Que tus datos salgan de Colombia es una transferencia internacional. La ley la permite solo si tú la autorizas de forma expresa, y por eso la casilla que aceptaste al registrarte la menciona.',
        },
        {
          tipo: 'parrafo',
          texto:
            'Una decisión que vale la pena que conozcas: los avisos que salen hacia el proveedor no llevan el nombre de tu medicamento. Solo dicen que una toma quedó sin confirmar y cuántas. El nombre aparece únicamente en la alarma de tu propio teléfono, que no sale del aparato.',
        },
      ],
    },
    {
      titulo: 'Tus derechos',
      bloques: [
        { tipo: 'parrafo', texto: 'La Ley 1581 de 2012 te da estos derechos:' },
        {
          tipo: 'lista',
          puntos: [
            'Conocer tus datos y acceder a ellos gratis.',
            'Corregir los que estén mal, incompletos o desactualizados.',
            'Pedirnos prueba de la autorización que diste. Guardamos la versión del documento y la fecha exacta, y puedes verlas en Mis datos y privacidad.',
            'Que te informemos del uso que le hemos dado a tus datos.',
            'Retirar tu autorización y pedir que borremos todo, salvo que una ley nos obligue a conservarlo.',
            'Quejarte ante la Superintendencia de Industria y Comercio si crees que no cumplimos.',
          ],
        },
        {
          tipo: 'parrafo',
          texto:
            'Tratándose de datos de salud tienes además dos derechos más: el de no autorizar su tratamiento, y el de no responder las preguntas que traten sobre ellos.',
        },
      ],
    },
    {
      titulo: 'Cómo ejercerlos',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Buena parte no requiere escribirle a nadie. Desde Mi cuenta puedes corregir tu perfil, cambiar los permisos de cada cuidador, retirarle el acceso a alguien y suspender un tratamiento. Un derecho que solo se pueda ejercer esperando diez días hábiles es un derecho a medias.',
        },
        {
          tipo: 'parrafo',
          texto:
            'Para lo demás, escribe a la oficina de protección de datos de la universidad, que es la que atiende las peticiones, consultas y reclamos. Dinos tu nombre, el correo con el que te registraste y qué necesitas.',
        },
        { tipo: 'dato', etiqueta: 'Escribe a', valor: 'protecciondedatos@amigo.edu.co' },
        { tipo: 'parrafo', texto: 'Estos son los plazos que fija la ley y que nos obligan:' },
        {
          tipo: 'lista',
          puntos: [
            'Una consulta se responde en máximo 10 días hábiles. Si no fuera posible, te decimos por qué y cuándo, y ese plazo extra no puede pasar de 5 días hábiles.',
            'Un reclamo se responde en máximo 15 días hábiles. Si no fuera posible, te decimos por qué y cuándo, y ese plazo extra no puede pasar de 8 días hábiles.',
            'Si tu reclamo llega incompleto, te pedimos que lo completes dentro de los 5 días siguientes. Si pasan dos meses sin respuesta tuya, se entiende que desististe.',
          ],
        },
        {
          tipo: 'parrafo',
          texto:
            'Mientras un reclamo tuyo está en trámite, el dato queda marcado como reclamo en trámite.',
        },
        {
          tipo: 'parrafo',
          texto:
            'La ley pide que primero agotes este trámite con nosotros. Solo después puedes presentar la queja ante la Superintendencia de Industria y Comercio.',
        },
      ],
    },
    {
      titulo: 'Cómo protegemos tus datos',
      bloques: [
        { tipo: 'parrafo', texto: 'Esto no son intenciones: está en el código y se puede revisar.' },
        {
          tipo: 'lista',
          puntos: [
            'Tu contraseña se guarda cifrada. No se almacena tal cual y no se puede recuperar, ni siquiera desde dentro.',
            'El código para recuperar la contraseña también se guarda cifrado, caduca a los 30 minutos, sirve una sola vez y admite cinco intentos.',
            'Cada petición va firmada. Si cambias tu contraseña, todas las sesiones abiertas se cierran de inmediato.',
            'Cada consulta a la base de datos usa parámetros, lo que cierra la vía de ataque más común contra este tipo de sistemas.',
            'Cada acceso a los datos de un paciente pasa por un único punto de control que comprueba el vínculo y el permiso concreto.',
          ],
        },
      ],
    },
    {
      titulo: 'Cuánto tiempo los guardamos',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Mientras tu cuenta esté activa y mientras sigan existiendo las finalidades de más arriba. Si pides que los borremos, los borramos, salvo que una ley nos obligue a conservarlos.',
        },
        {
          tipo: 'parrafo',
          texto:
            'Si el proyecto Chronova termina, avisaremos con antelación razonable para que puedas obtener una copia de tu información, y después las bases de datos se suprimen.',
        },
      ],
    },
    {
      titulo: 'Cambios en esta política',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Los cambios importantes se avisan dentro de la aplicación antes de que entren en vigor. Cada versión lleva su número y su fecha, y las anteriores se conservan, de modo que siempre se pueda saber qué texto aceptaste tú y cuándo.',
        },
        {
          tipo: 'parrafo',
          texto:
            'Esta política no reemplaza la de la Universidad Católica Luis Amigó, adoptada por Resolución No. 18 de 2023. La desarrolla para una base de datos concreta, la de Chronova. Si las dos se contradijeran, prevalece la de la universidad.',
        },
      ],
    },
  ],
};

// -----------------------------------------------------------------
// Términos y Condiciones de Uso
// -----------------------------------------------------------------

export const TERMINOS_Y_CONDICIONES: DocumentoLegal = {
  tituloCorto: 'Términos de uso',
  titulo: 'Términos y Condiciones de Uso de Chronova',
  version: '2.0',
  secciones: [
    {
      titulo: 'Qué es esto',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Chronova es una aplicación móvil desarrollada como proyecto académico por Emmanuel Correa Valencia y Julián Andrés Herrera Roncancio en la Universidad Católica Luis Amigó, en Medellín, Colombia.',
        },
        {
          tipo: 'parrafo',
          texto:
            'Los datos que recoge la aplicación tienen tres responsables: la universidad y los dos desarrolladores. Quién hace qué está explicado en la Política de Tratamiento de Datos. Al crear una cuenta aceptas estos términos. Si no los aceptas, no uses la aplicación.',
        },
      ],
    },
    {
      titulo: 'Chronova no es un dispositivo médico',
      bloques: [
        {
          tipo: 'aviso',
          texto:
            'Nunca dejes de tomar un medicamento, ni cambies una dosis, ni suspendas un tratamiento por lo que diga esta aplicación. Consulta siempre a tu médico.',
        },
        {
          tipo: 'parrafo',
          texto:
            'Esto va primero porque es lo que más importa y lo que más fácil se malinterpreta. Chronova es una herramienta de recordatorio y registro. No practica medicina y no sustituye a ningún profesional de la salud.',
        },
        {
          tipo: 'lista',
          puntos: [
            'No diagnostica, no receta y no recomienda tratamientos. Los medicamentos, dosis y horarios que ves son los que tú mismo escribiste. La aplicación no los revisa ni sabe si son correctos.',
            'No detecta interacciones entre medicamentos, alergias, contraindicaciones ni errores de dosis.',
            'Tu porcentaje de cumplimiento es informativo. Que diga que es bueno no significa que el tratamiento esté funcionando, ni que sea bajo que algo esté mal médicamente.',
            'Ninguna decisión sobre tu tratamiento debería tomarse con base en la aplicación. Esa conversación es con tu médico.',
          ],
        },
      ],
    },
    {
      titulo: 'Las alarmas pueden fallar',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Chronova envía alarmas a tu teléfono a la hora de cada toma. Esas alarmas no son infalibles, y es mejor que sepas por qué antes de confiar en ellas:',
        },
        {
          tipo: 'lista',
          puntos: [
            'El teléfono puede estar apagado, sin batería, en silencio o en modo no molestar.',
            'Android y iPhone a veces retrasan o suprimen avisos para ahorrar batería. Es una decisión del sistema del teléfono, no de la aplicación.',
            'Puede no haber internet en el momento en que hace falta.',
            'Puedes haber quitado el permiso de notificaciones sin darte cuenta.',
          ],
        },
        {
          tipo: 'aviso',
          texto:
            'Chronova es una ayuda, no una garantía. Si tu salud depende de un tratamiento, no dejes que esta sea tu única forma de acordarte.',
        },
      ],
    },
    {
      titulo: 'Quién puede usarla',
      bloques: [
        {
          tipo: 'lista',
          puntos: [
            'Personas mayores de 18 años con capacidad legal para aceptar estos términos.',
            'Un cuidador solo accede a la información de un paciente si ese paciente lo autoriza desde su propia cuenta, y únicamente con los permisos que le conceda.',
          ],
        },
        {
          tipo: 'parrafo',
          texto:
            'Si la persona que va a usar la aplicación no puede dar su autorización por sí misma, no debe crearse una cuenta a su nombre sin su representante legal. Chronova no está preparada hoy para ese caso.',
        },
      ],
    },
    {
      titulo: 'Lo que te pedimos a ti',
      bloques: [
        {
          tipo: 'lista',
          puntos: [
            'Que la información que registres sea verdadera. Un tratamiento mal registrado produce recordatorios equivocados.',
            'Que cuides tu contraseña y no la compartas. Si sospechas que alguien la conoce, cámbiala: al hacerlo se cierran todas las sesiones abiertas.',
            'Que no uses la aplicación para entrar a la información de otra persona sin su autorización.',
            'Que no intentes vulnerar la seguridad del sistema ni acceder a datos ajenos.',
            'Que tengas presente que lo que registras es información de salud, y la trates con el cuidado que eso merece.',
          ],
        },
      ],
    },
    {
      titulo: 'Tu cuenta',
      bloques: [
        {
          tipo: 'lista',
          puntos: [
            'Puedes modificar tus datos y retirarle el acceso a cualquier cuidador cuando quieras, sin justificarte.',
            'Puedes pedir que borremos tu cuenta escribiendo a la oficina de protección de datos de la universidad, cuya dirección está al final de este documento.',
            'Suspender un medicamento conserva su historial de tomas, porque ese historial es la evidencia del tratamiento que seguiste y borrarlo distorsionaría el registro.',
            'Los responsables pueden suspender una cuenta que incumpla gravemente estos términos, avisando a la persona.',
          ],
        },
      ],
    },
    {
      titulo: 'Disponibilidad',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Chronova es un proyecto académico en desarrollo. No garantizamos que esté siempre disponible, que no tenga errores ni que la información se conserve indefinidamente. Puede haber interrupciones por mantenimiento, por fallos técnicos o porque el proyecto termine.',
        },
        {
          tipo: 'parrafo',
          texto:
            'Si el proyecto termina, avisaremos con antelación razonable para que puedas obtener tus datos.',
        },
      ],
    },
    {
      titulo: 'Propiedad',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'El código, el diseño, el nombre y el logotipo de Chronova pertenecen a sus autores. La información que tú registras es tuya, y puedes pedir una copia cuando quieras.',
        },
      ],
    },
    {
      titulo: 'Responsabilidad',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Chronova se ofrece tal cual, dentro de un proyecto académico y sin ánimo de lucro. Dentro de lo que permite la ley colombiana, ni la universidad ni los autores responden por daños derivados de no poder usar la aplicación, de perder información por fallos técnicos, de alarmas que no lleguen o lleguen tarde, ni de decisiones sobre un tratamiento tomadas por lo que diga la aplicación en lugar de por lo que diga un profesional de la salud.',
        },
        {
          tipo: 'parrafo',
          texto:
            'Esto limita la responsabilidad por cómo funciona la aplicación. No limita, ni podría limitar, las obligaciones que la Ley 1581 de 2012 les impone a los responsables del tratamiento frente a ti: esas se cumplen tal como dice la Política de Tratamiento, y aceptar estos términos no las cancela.',
        },
      ],
    },
    {
      titulo: 'Ley aplicable',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Estos términos se rigen por la ley colombiana. El tratamiento de tus datos personales se rige por la Ley 1581 de 2012 y sus decretos, y se detalla en la Política de Tratamiento de Datos Personales.',
        },
        {
          tipo: 'parrafo',
          texto: 'Cualquier controversia se somete a los jueces competentes de Medellín, Colombia.',
        },
        { tipo: 'dato', etiqueta: 'Contacto', valor: 'protecciondedatos@amigo.edu.co' },
        { tipo: 'dato', etiqueta: 'Teléfono', valor: '+57 (604) 448 7666' },
      ],
    },
  ],
};

/** Los dos documentos, por la clave que viaja en la ruta. */
export const DOCUMENTOS_LEGALES = {
  politica: POLITICA_DE_TRATAMIENTO,
  terminos: TERMINOS_Y_CONDICIONES,
} as const;

export type ClaveDeDocumento = keyof typeof DOCUMENTOS_LEGALES;

export function esClaveDeDocumento(valor: unknown): valor is ClaveDeDocumento {
  return valor === 'politica' || valor === 'terminos';
}

export { AVISO_DE_BORRADOR };
