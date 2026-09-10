/**
 * Genera el Entregable 3 (Capítulo 3: Desarrollo) sobre la plantilla del curso.
 *
 *   node generar-entregable3.js
 *
 * Igual que los dos anteriores, se genera con código: las versiones, el
 * esquema, las rutas, los conteos de pruebas y las cifras de rendimiento
 * salen del proyecto y de mediciones reales. Cuando el proyecto cambia se
 * vuelve a correr esto, en lugar de buscar a mano qué quedó viejo.
 *
 * Las cifras de las secciones 3.9 y 3.12 no están inventadas ni estimadas:
 * son la salida de `npm run test:e2e` y de `npm run rendimiento`,
 * ejecutados contra el servidor y PostgreSQL levantados. Si se vuelven a
 * ejecutar en otra máquina darán otros números, y hay que actualizarlos
 * aquí; por eso la tabla dice en qué máquina se midió.
 */

const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  PageOrientation, PageBreak, ImageRun,
} = require('docx');
const fs = require('fs');

const ANCHO_CONTENIDO = 8760; // DXA
const FUENTE = 'Arial';
const GRIS_CABECERA = '999999';
const GRIS_ALTERNO = 'F2F2F2';
const CAPTURAS = '/home/claude/chronova/docs/capturas';

/**
 * Ningún guion largo en el documento.
 *
 * El resto de los entregables no los usa, y un capítulo que sí los usara
 * se notaría al ponerlos uno detrás de otro. Se comprueba aquí, en el
 * único sitio por donde pasa todo el texto, en vez de confiar en
 * acordarse: la raya (—) y el semirraya (–) se escapan con facilidad
 * porque el corrector no los marca y a simple vista parecen un guion.
 *
 * Corta la generación en vez de avisar. Un aviso en la consola se pierde
 * entre las demás líneas, y el documento saldría igual.
 */
const GUIONES_PROHIBIDOS = /[—–]/;

function revisarGuiones(texto) {
  if (typeof texto === 'string' && GUIONES_PROHIBIDOS.test(texto)) {
    const donde = texto.search(GUIONES_PROHIBIDOS);
    throw new Error(
      'Guion largo en el texto. Reescríbelo con comas, paréntesis o dos puntos.\n' +
      `  ...${texto.slice(Math.max(0, donde - 45), donde + 45)}...`,
    );
  }
  return texto;
}

const t = (text, o = {}) => new TextRun({
  text: revisarGuiones(text),
  font: FUENTE, size: o.size ?? 24, bold: o.bold, italics: o.italics, color: o.color,
});
const p = (text, o = {}) => new Paragraph({
  alignment: o.align ?? AlignmentType.JUSTIFIED,
  spacing: { after: o.after ?? 200, line: o.line ?? 276 },
  indent: o.indent,
  children: Array.isArray(text) ? text : [t(text, o)],
});
const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1, spacing: { before: 480, after: 280 },
  children: [new TextRun({ text, font: FUENTE, size: 40, bold: true, color: '000000' })],
});
const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 },
  children: [new TextRun({ text, font: FUENTE, size: 32, bold: true, color: '000000' })],
});
const h3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3, spacing: { before: 320, after: 160 },
  children: [new TextRun({ text, font: FUENTE, size: 28, bold: true, color: '000000' })],
});
const salto = () => new Paragraph({ children: [new PageBreak()] });
const aire = (after = 200) => new Paragraph({ spacing: { after } });
const pie = (texto) => new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { after: 240 },
  children: [t(texto, { size: 20, italics: true })],
});
const vinetas = (items) => items.map((texto) => new Paragraph({
  bullet: { level: 0 },
  alignment: AlignmentType.JUSTIFIED,
  spacing: { after: 120, line: 276 },
  children: Array.isArray(texto) ? texto : [t(texto)],
}));

function celda(texto, { anchura, cabecera = false, alterna = false, centrar = false, mono = false, size = 22 }) {
  return new TableCell({
    width: { size: anchura, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: cabecera ? GRIS_CABECERA : alterna ? GRIS_ALTERNO : 'FFFFFF' },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: centrar ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { after: 0, line: 240 },
      children: [new TextRun({
        text: revisarGuiones(texto), font: mono ? 'Consolas' : FUENTE,
        size: mono ? size - 2 : size, bold: cabecera,
      })],
    })],
  });
}

function tabla(columnas, cabeceras, filas, opciones = {}) {
  const { centrar = [], mono = [], size = 22 } = opciones;
  const bordes = {
    top: { style: BorderStyle.SINGLE, size: 4, color: 'B9C7C4' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'B9C7C4' },
    left: { style: BorderStyle.SINGLE, size: 4, color: 'B9C7C4' },
    right: { style: BorderStyle.SINGLE, size: 4, color: 'B9C7C4' },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'D6DFDD' },
    insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'D6DFDD' },
  };
  return new Table({
    columnWidths: columnas,
    width: { size: ANCHO_CONTENIDO, type: WidthType.DXA },
    borders: bordes,
    rows: [
      new TableRow({
        tableHeader: true,
        children: cabeceras.map((c, i) => celda(c, { anchura: columnas[i], cabecera: true, centrar: true, size })),
      }),
      ...filas.map((fila, n) => new TableRow({
        cantSplit: true,
        children: fila.map((c, i) => celda(c, {
          anchura: columnas[i], alterna: n % 2 === 1,
          centrar: centrar.includes(i), mono: mono.includes(i), size,
        })),
      })),
    ],
  });
}

/**
 * Bloque de código, en monoespaciada sobre fondo claro.
 *
 * El ancho útil de la caja son 84 caracteres a Consolas 8,5 pt. Una línea
 * más larga no se recorta: Word la parte y la segunda mitad empieza en la
 * columna cero, con lo que el fragmento pierde la sangría justo donde más
 * hace falta. Por eso se avisa al generar, en vez de descubrirlo mirando
 * el PDF.
 */
const ANCHO_MAXIMO_DE_CODIGO = 84;

function bloque(lineas, opciones = {}) {
  const { size = 17 } = opciones;
  lineas.forEach((linea) => {
    revisarGuiones(linea);
    if (linea.length > ANCHO_MAXIMO_DE_CODIGO) {
      console.warn(
        `  aviso: línea de ${linea.length} caracteres (máximo ${ANCHO_MAXIMO_DE_CODIGO}): ` +
        `«${linea.trim().slice(0, 60)}…»`,
      );
    }
  });
  return new Table({
    columnWidths: [ANCHO_CONTENIDO],
    width: { size: ANCHO_CONTENIDO, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'D6DFDD' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D6DFDD' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'D6DFDD' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'D6DFDD' },
    },
    rows: [new TableRow({
      cantSplit: lineas.length <= 34,
      children: [new TableCell({
        width: { size: ANCHO_CONTENIDO, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: 'F7F9FA' },
        margins: { top: 120, bottom: 120, left: 160, right: 120 },
        children: lineas.map((l) => new Paragraph({
          spacing: { after: 0, line: 220 },
          children: [new TextRun({ text: l, font: 'Consolas', size })],
        })),
      })],
    })],
  });
}

function capturas(archivos) {
  const ALTO = archivos.length >= 3 ? 330 : 400;
  const imagenes = [];
  archivos.forEach((archivo, i) => {
    const datos = fs.readFileSync(`${CAPTURAS}/${archivo}`);
    const ancho = datos.readUInt32BE(16);
    const alto = datos.readUInt32BE(20);
    if (i > 0) imagenes.push(new TextRun({ text: '   ' }));
    imagenes.push(new ImageRun({
      type: 'png', data: datos,
      transformation: { width: Math.round((ancho / alto) * ALTO), height: ALTO },
    }));
  });
  return new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 120, after: 240 }, children: imagenes,
  });
}

const PAGINA = {
  page: {
    size: { width: 12240, height: 15840, orientation: PageOrientation.PORTRAIT },
    margin: { top: 1440, right: 1440, bottom: 1440, left: 2041 },
  },
};

// =====================================================================
//  Datos, todos tomados del proyecto o de mediciones reales
// =====================================================================

const HERRAMIENTAS = [
  ['Node.js', '22.22.2', 'Entorno de ejecución del servidor y de las herramientas de la app.'],
  ['TypeScript', '5.9.3', 'Lenguaje del backend y de la app. Tipado estático en las dos mitades.'],
  ['Express', '4.22.2', 'Adaptador HTTP: enrutado y middleware del servidor.'],
  ['Zod', '3.25.76', 'Validación de la forma de los datos que entran por la API.'],
  ['PostgreSQL', '16.13', 'Base de datos relacional.'],
  ['node-postgres (pg)', '8.23.0', 'Cliente de PostgreSQL con pool de conexiones.'],
  ['bcryptjs', '2.4.3', 'Cifrado de contraseñas y de los códigos de recuperación.'],
  ['jsonwebtoken', '9.0.3', 'Emisión y verificación de los tokens de sesión (JWT).'],
  ['Vitest', '2.1.9', 'Ejecutor de las pruebas automatizadas del backend.'],
  ['tsx', '4.23.13', 'Ejecuta TypeScript sin compilar, en desarrollo.'],
  ['React Native', '0.79.2', 'Framework de la aplicación móvil.'],
  ['React', '19.0.0', 'Librería de interfaz sobre la que se apoya React Native.'],
  ['Expo (SDK)', '53.0.27', 'Plataforma de construcción y ejecución de la app.'],
  ['Expo Router', '5.0.7', 'Navegación por archivos de la app.'],
  ['expo-notifications', '0.31.5', 'Alarmas locales del teléfono y avisos push.'],
  ['AsyncStorage', '2.1.2', 'Guarda la sesión en el teléfono entre aperturas.'],
  ['npm', '10.9.7', 'Gestor de paquetes de los dos proyectos.'],
  ['Git', '2.43', 'Control de versiones. Repositorio en GitHub.'],
];

const PROBLEMAS = [
  [
    'El servidor arrancaba contra una base de datos desactualizada y respondía «ok».',
    'Se añadieron columnas al esquema y aplicarlas dependía de acordarse de ejecutar '
    + '«npm run db:migrate». Como no se ejecutó, el servidor levantó, /api/salud respondió '
    + '«ok» y todo lo que solo lee siguió funcionando. El fallo salió por el punto más '
    + 'alejado de la causa: cambiar el tamaño de la letra no hacía nada.',
    'El esquema se aplica al arrancar, antes de aceptar la primera petición, y si no puede, '
    + 'el servidor no arranca. Un servidor que no puede guardar no está «ok». El archivo '
    + 'esquema.sql está escrito entero con CREATE TABLE IF NOT EXISTS y ADD COLUMN IF NOT '
    + 'EXISTS, así que aplicarlo dos veces no rompe nada.',
  ],
  [
    'La aplicación dejaba de encontrar el servidor cada pocos días.',
    'La dirección del servidor estaba escrita a mano en la configuración. Es una IP de red '
    + 'local que reparte el router y que cambia sola: al cambiar de red, al reiniciar el '
    + 'router o cuando caduca la asignación.',
    'En desarrollo la app le pregunta a Expo desde qué máquina se descargó el código, que es '
    + 'la misma donde corre el servidor. La dirección deja de poder quedar desactualizada.',
  ],
  [
    'Expo Go dejó de recibir notificaciones push en Android.',
    'A partir del SDK 53, Expo Go ya no admite notificaciones push remotas en Android. La '
    + 'app las pedía y no llegaba ninguna.',
    'Se pasó a una compilación de desarrollo propia (expo-dev-client) construida con EAS '
    + 'Build, y se configuraron credenciales FCM V1 en Firebase. Las alarmas locales, que '
    + 'son el mecanismo principal de recordatorio, nunca dependieron de esto.',
  ],
  [
    'La construcción en EAS fallaba por un archivo que faltaba.',
    'google-services.json se había añadido a .gitignore por precaución, y EAS Build solo '
    + 'sube al servidor de compilación los archivos que git tiene registrados.',
    'Se sacó del .gitignore. Ese archivo identifica el proyecto de Firebase pero no contiene '
    + 'ninguna clave privada; la que sí es secreta es la del service account, que sigue '
    + 'fuera del repositorio.',
  ],
  [
    'Google Cloud impedía crear la clave del service account.',
    'Las organizaciones creadas después de mayo de 2024 llevan activada por defecto la '
    + 'política iam.disableServiceAccountKeyCreation.',
    'Se desactivó esa restricción para el proyecto concreto desde la consola de políticas '
    + 'de la organización. Solo hace falta una vez.',
  ],
  [
    'Las alarmas llegaban con quince minutos o más de retraso.',
    'Desde Android 14 el permiso SCHEDULE_EXACT_ALARM viene denegado de fábrica. Sin él, el '
    + 'sistema puede retrasar la alarma para ahorrar batería. El ahorro de energía por '
    + 'aplicación hace lo mismo.',
    'No se puede conceder desde el código, así que se añadió la tarjeta «Mis alarmas» en Mi '
    + 'cuenta: dice cuántas alarmas tiene puestas el teléfono, cuándo suena la próxima y '
    + 'lleva directo a los ajustes del sistema. El diseño además lo absorbe: la ventana de '
    + 'confirmación es de ±60 minutos y los minutos de gracia son configurables.',
  ],
  [
    'La base de datos en la nube tarda en la primera petición.',
    'El plan gratuito de Neon suspende la base de datos tras un rato sin uso, y la primera '
    + 'consulta después tarda varios segundos o falla.',
    'Al arrancar, la aplicación del esquema reintenta tres veces con dos segundos de espera '
    + 'entre intentos, y avisa por consola de que está esperando a que la base despierte.',
  ],
  [
    'Windows y las rutas con paréntesis.',
    'Las carpetas de Expo Router llevan paréntesis, como app/(paciente), que PowerShell '
    + 'interpreta como agrupación al escribirlas sin comillas.',
    'Se escriben entre comillas. No es un problema del proyecto, pero cuesta un rato la '
    + 'primera vez que aparece.',
  ],
];

const PRUEBAS_POR_ARCHIVO = [
  ['tests/domain/dominio.test.ts', 'Unitaria', '40', 'Entidades y objetos de valor: Toma, Medicamento, Dosis, Stock, Frecuencia, Vinculo.'],
  ['tests/domain/zonaHoraria.test.ts', 'Unitaria', '14', 'Conversión entre hora de pared y instante, incluido el cambio de día.'],
  ['tests/use-cases/casosDeUso.test.ts', 'Integración', '52', 'Los casos de uso completos contra repositorios en memoria.'],
  ['tests/use-cases/sesiones.test.ts', 'Integración', '15', 'Emisión, verificación, renovación y caída de tokens.'],
  ['tests/use-cases/recuperacion.test.ts', 'Integración', '14', 'Código de seis dígitos: caducidad, un solo uso, cinco intentos.'],
  ['tests/use-cases/notificaciones.test.ts', 'Integración', '12', 'Avisos de stock bajo y de tomas cerradas por el sistema.'],
  ['tests/use-cases/autorizacionDeDatos.test.ts', 'Integración', '12', 'Autorización de tratamiento de datos y su constancia.'],
  ['tests/use-cases/claveDeFirma.test.ts', 'Integración', '4', 'El servidor rechaza arrancar con la clave de ejemplo.'],
  ['tests/http/api.test.ts', 'Integración', '26', 'La API por HTTP: enrutado, token, validación y códigos de error.'],
  ['tests/http/preferenciasDelCuidador.test.ts', 'Integración', '5', 'Preferencias de accesibilidad del cuidador por HTTP.'],
  ['tests/e2e/recorridos.test.ts', 'E2E', '4', 'Recorridos completos contra el servidor y PostgreSQL reales.'],
];

const RENDIMIENTO = [
  ['GET /api/salud', '400', '20', '9,6', '23,5', '36,7', '1.717', '0'],
  ['POST /api/auth/sesion', '60', '6', '471,8', '536,6', '632,3', '13', '0'],
  ['GET /api/tomas/agenda', '300', '20', '72,9', '89,8', '126,6', '270', '0'],
  ['GET /api/cuidadores/pacientes', '200', '20', '167,5', '210,4', '217,6', '115', '0'],
  ['GET /api/medicamentos', '300', '20', '21,0', '35,3', '50,6', '868', '0'],
  ['GET /api/tomas/historial', '200', '20', '48,1', '68,7', '70,6', '395', '0'],
  ['POST /api/tomas/{id}/registro', '64', '10', '14,0', '19,9', '20,4', '682', '0'],
];

const ERRORES = [
  [
    'Se podía confirmar una toma cuya hora no había llegado.',
    'A las nueve de la mañana la agenda ofrecía «Ya la tomé» también para la dosis de las '
    + 'ocho de la noche. Contaba como cumplida y, lo que más pesa, esa noche ya no sonaba el '
    + 'recordatorio porque la dosis constaba resuelta. Una dosis perdida en silencio.',
    'La ventana se abre 60 minutos antes de la hora y la tarjeta dice desde cuándo estará '
    + 'disponible. La comprobación vive en la entidad Toma, no en la pantalla: un botón se '
    + 'puede desactivar, pero la petición se puede mandar igual.',
  ],
  [
    'El panel del cuidador ignoraba el permiso puedeVerHistorial.',
    'Al retirarle el permiso, tres endpoints respondían 403 pero el panel seguía mostrando '
    + 'adherencia, medicamentos y última actividad. Era el único caso de uso que leía datos '
    + 'clínicos sin pasar por PoliticaDeAcceso.',
    'El panel pasa por PoliticaDeAcceso como todos los demás. Solo se vio haciendo la '
    + 'petición HTTP: llamado directamente, el caso de uso «funcionaba».',
  ],
  [
    'Consultar un día pasado fabricaba incumplimientos.',
    'Pedir la agenda de una fecha anterior creaba sus tomas, que la tarea periódica luego '
    + 'cerraba como omitidas. Mirar el calendario hacia atrás hundía la adherencia con '
    + 'faltas que nunca ocurrieron.',
    'La agenda solo genera tomas para el día en curso y los futuros.',
  ],
  [
    'Llegaban cinco o seis avisos por la misma toma.',
    'Reprogramar las alarmas es borrarlas todas y volver a crearlas una por una. Si entraba '
    + 'una segunda sincronización en medio, las dos se entrelazaban y la misma pastilla '
    + 'quedaba con varias alarmas. Bastaban tres disparadores normales: abrir la app, '
    + 'cambiar una preferencia y confirmar una toma.',
    'Las sincronizaciones se encolan y nunca corren dos a la vez; si llegan varias mientras '
    + 'una está en marcha se hace una sola, con los datos más frescos. Medido con un doble '
    + 'de expo-notifications: antes, 4 sincronizaciones simultáneas dejaban 4 alarmas por '
    + 'toma; después, 10 simultáneas dejan 1.',
  ],
  [
    'Un fallo puntual dejaba la app sin programar ninguna alarma más.',
    'La cola encadena promesas, y una promesa rechazada contamina todo lo que se encadene '
    + 'después: si una sincronización fallaba, las siguientes se saltaban en silencio '
    + 'durante el resto de la ejecución.',
    'La cola captura el fallo de cada sincronización para que no se propague. Medido: tras '
    + 'un fallo puntual se completaba 1 de 3; ahora se completan 3 de 3.',
  ],
  [
    'Cerrar sesión podía dejar alarmas puestas.',
    'El borrado ocurría y la sincronización que venía en camino las volvía a crear justo '
    + 'después: avisos sobre la medicación de otra persona en un teléfono que ya cambió de '
    + 'manos.',
    'El borrado pasa por la misma cola y descarta lo que hubiera pendiente. Medido: antes '
    + 'sobrevivían 9 de 12 alarmas; ahora, 0.',
  ],
  [
    'La clave con la que se firman las sesiones podía ser la de ejemplo.',
    'La comprobación que lo impedía solo se activaba si NODE_ENV valía exactamente '
    + '«production», que es justo la variable que se olvida al desplegar. Con la clave de '
    + 'ejemplo, que está publicada en .env.example, cualquiera puede fabricar un token '
    + 'válido a '
    + 'nombre de cualquier paciente sin adivinar ninguna contraseña.',
    'Se rechaza siempre, sin depender de NODE_ENV, y con base de datos real se exigen 32 '
    + 'caracteres como mínimo. Cuatro pruebas lo comprueban.',
  ],
  [
    'Dos peticiones simultáneas a la agenda devolvían un error 500.',
    'Las dos generaban las mismas tomas del día y la que perdía la carrera chocaba contra '
    + 'la restricción de unicidad.',
    'La inserción usa ON CONFLICT DO NOTHING sobre (medicamento_id, '
    + 'programada_originalmente_para) y después relee el día. Verificado con 25 peticiones '
    + 'simultáneas contra PostgreSQL 16, y de nuevo en la prueba E2E-04.',
  ],
  [
    'Todos los 500 de la API eran en realidad errores del cliente.',
    'JSON mal formado, cuerpo demasiado grande o parámetros de URL repetidos producían un '
    + 'error de servidor.',
    'El manejador de errores los traduce a 400 y 413, con un mensaje que dice qué pasó.',
  ],
  [
    'Los mensajes de error de las preferencias decían siempre «Revisa tu conexión».',
    'Con la base de datos desactualizada, lo que veía quien probaba la app era que mirara '
    + 'el wifi. El problema estaba en otro sitio.',
    'Se muestra el motivo que da el servidor cuando lo hay.',
  ],
  [
    'La app quedaba con texto sin tildes ni eñes.',
    'Los mensajes visibles se habían escrito sin acentos durante el desarrollo.',
    'Se corrigieron 291 textos en 73 archivos, comprobando cada cadena con un diccionario '
    + 'de español, y se repararon las pruebas que verificaban esos mensajes.',
  ],
];

const MATRIZ = [
  ['TC-001', 'Una toma no se puede confirmar antes de su ventana de 60 minutos.', 'Unitaria', 'Pasa', 'tests/domain/dominio.test.ts'],
  ['TC-002', 'Posponer más de tres veces lanza ErrorDeReglaDeNegocio.', 'Unitaria', 'Pasa', 'El límite evita que aplazar sea nunca tomar.'],
  ['TC-003', 'Una toma resuelta no se puede volver a cambiar.', 'Unitaria', 'Pasa', 'Un registro clínico no se reescribe.'],
  ['TC-004', 'La adherencia no cuenta las tomas pendientes.', 'Unitaria', 'Pasa', 'Todavía se pueden confirmar.'],
  ['TC-005', '«Las 8:00» son las 8:00 donde vive el paciente, no donde está el servidor.', 'Unitaria', 'Pasa', 'tests/domain/zonaHoraria.test.ts'],
  ['TC-006', 'El stock descuenta las unidades exactas de una dosis.', 'Unitaria', 'Pasa', 'Dosis decide cuánto consume cada toma.'],
  ['TC-007', 'Sin autorización de tratamiento de datos no se crea la cuenta.', 'Integración', 'Pasa', 'La regla está en el caso de uso, no en el formulario.'],
  ['TC-008', 'El cuidador no registra tomas sin puedeRegistrarTomas.', 'Integración', 'Pasa', 'El permiso nace desactivado.'],
  ['TC-009', 'Revocar el vínculo cierra el acceso a los datos clínicos.', 'Integración', 'Pasa', 'Era el defecto del panel del cuidador.'],
  ['TC-010', 'Cambiar la contraseña invalida los tokens anteriores.', 'Integración', 'Pasa', 'Sin guardar ni una sola sesión en el servidor.'],
  ['TC-011', 'El código de recuperación caduca a los 30 minutos.', 'Integración', 'Pasa', 'tests/use-cases/recuperacion.test.ts'],
  ['TC-012', 'El código de recuperación admite cinco intentos y un solo uso.', 'Integración', 'Pasa', 'El contador sube antes de comprobar el código.'],
  ['TC-013', 'El servidor no arranca con la clave de firma de ejemplo.', 'Integración', 'Pasa', 'Sin depender de NODE_ENV.'],
  ['TC-014', 'La API traduce JSON mal formado a 400, no a 500.', 'Integración', 'Pasa', 'tests/http/api.test.ts'],
  ['TC-015', 'Un token caducado o de otro usuario devuelve 401.', 'Integración', 'Pasa', 'tests/http/api.test.ts'],
  ['TC-016', 'Registro, medicamento, agenda, confirmación, inventario e historial.', 'E2E', 'Pasa', 'E2E-01, con PostgreSQL real.'],
  ['TC-017', 'Vínculo, permiso denegado, permiso concedido y revocación.', 'E2E', 'Pasa', 'E2E-02, comprobando la fila en la base.'],
  ['TC-018', 'Recuperación de contraseña y caída de los tokens anteriores.', 'E2E', 'Pasa', 'E2E-03.'],
  ['TC-019', 'Veinte consultas simultáneas a la agenda no la duplican.', 'E2E', 'Pasa', 'E2E-04: 3 filas en la base, no 60.'],
  ['TC-020', 'Alarmas locales: no se duplican al sincronizar varias veces.', 'Unitaria', 'Pasa', 'Con un doble de expo-notifications.'],
];

const REFERENCIAS = [
  '[1] A. Cockburn, "Hexagonal Architecture," 2005. [En línea]. Disponible: https://alistair.cockburn.us/hexagonal-architecture/',
  '[2] E. Evans, Domain-Driven Design: Tackling Complexity in the Heart of Software. Boston, MA, EE. UU.: Addison-Wesley, 2003.',
  '[3] R. C. Martin, Clean Architecture: A Craftsman’s Guide to Software Structure and Design. Boston, MA, EE. UU.: Prentice Hall, 2017.',
  '[4] Congreso de Colombia, "Ley Estatutaria 1581 de 2012 por la cual se dictan disposiciones generales para la protección de datos personales," Diario Oficial, Bogotá, Colombia, 17 oct. 2012.',
  '[5] Presidencia de la República de Colombia, "Decreto 1074 de 2015, Decreto Único Reglamentario del Sector Comercio, Industria y Turismo," Bogotá, Colombia, 26 may. 2015.',
  '[6] Organización Mundial de la Salud, Adherence to Long-Term Therapies: Evidence for Action. Ginebra, Suiza: OMS, 2003.',
  '[7] M. Jones, J. Bradley y N. Sakimura, "JSON Web Token (JWT)," RFC 7519, Internet Engineering Task Force, may. 2015.',
  '[8] PostgreSQL Global Development Group, "PostgreSQL 16 Documentation," 2024. [En línea]. Disponible: https://www.postgresql.org/docs/16/',
  '[9] Expo, "Expo SDK 53 Documentation," 2025. [En línea]. Disponible: https://docs.expo.dev/',
  '[10] Google, "Schedule alarms," Android Developers, 2025. [En línea]. Disponible: https://developer.android.com/develop/background-work/services/alarms/schedule',
  '[11] N. Provos y D. Mazières, "A Future-Adaptable Password Scheme," en Proc. USENIX Annual Technical Conf., Monterey, CA, EE. UU., 1999.',
  '[12] Braille Institute of America, "Atkinson Hyperlegible Font," 2024. [En línea]. Disponible: https://brailleinstitute.org/freefont',
];

module.exports = {
  Document, Packer, Paragraph, TextRun, AlignmentType, PageOrientation,
  t, p, h1, h2, h3, salto, aire, pie, vinetas, tabla, bloque, capturas, PAGINA,
  HERRAMIENTAS, PROBLEMAS, PRUEBAS_POR_ARCHIVO, RENDIMIENTO, ERRORES, MATRIZ, REFERENCIAS,
  ANCHO_CONTENIDO, FUENTE, fs,
};

// El cuerpo del documento vive en un archivo aparte para que ninguno de
// los dos pase de mil líneas.
require('./entregable3-cuerpo.js');
