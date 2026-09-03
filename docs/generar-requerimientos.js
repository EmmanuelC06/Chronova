const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, PageOrientation,
} = require('docx');
const fs = require('fs');

// Letter, margenes del entregable: 1.417" izq, 1" el resto.
const ANCHO_CONTENIDO = 8760; // DXA
const FUENTE = 'Cambria';
const VERDE = '0E6E62';
const GRIS_CABECERA = 'DDEDE9';
const GRIS_ALTERNO = 'F4F7F6';

const t = (text, opts = {}) => new TextRun({ text, font: FUENTE, size: opts.size ?? 24, bold: opts.bold, italics: opts.italics, color: opts.color });
const p = (text, opts = {}) => new Paragraph({
  alignment: opts.align ?? AlignmentType.JUSTIFIED,
  spacing: { after: opts.after ?? 160, line: opts.line ?? 276 },
  children: Array.isArray(text) ? text : [t(text, opts)],
});
const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 200 },
  children: [new TextRun({ text, font: FUENTE, size: 28, bold: true, color: '1A1A1A' })],
});
const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 160 },
  children: [new TextRun({ text, font: FUENTE, size: 26, bold: true, color: '1A1A1A' })],
});

function celda(texto, { anchura, cabecera = false, alterna = false, centrar = false, mono = false, size = 20 }) {
  return new TableCell({
    width: { size: anchura, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: cabecera ? GRIS_CABECERA : alterna ? GRIS_ALTERNO : 'FFFFFF' },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: centrar ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { after: 0, line: 240 },
      children: [new TextRun({
        text: texto, font: mono ? 'Consolas' : FUENTE,
        size: mono ? size - 2 : size, bold: cabecera,
      })],
    })],
  });
}

function tabla(columnas, cabeceras, filas, opciones = {}) {
  const { centrar = [], mono = [] } = opciones;
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
        children: cabeceras.map((c, i) => celda(c, {
          anchura: columnas[i], cabecera: true, centrar: true, size: opciones.size ?? 20,
        })),
      }),
      ...filas.map((fila, n) => new TableRow({
        cantSplit: true, // una fila no se parte entre dos paginas
        children: fila.map((c, i) => celda(c, {
          anchura: columnas[i], alterna: n % 2 === 1,
          centrar: centrar.includes(i), mono: mono.includes(i),
          size: opciones.size ?? 20,
        })),
      })),
    ],
  });
}

// =====================================================================
// Contenido
// =====================================================================

const ACTORES = [
  ['Paciente', 'Adulto mayor o persona con enfermedad crónica que sigue un tratamiento farmacológico. Es el dueño de sus datos de salud.', 'Registra sus medicamentos, consulta la agenda del día, confirma u omite cada toma, revisa su historial de adherencia y decide qué cuidadores acceden a su información y con qué permisos.'],
  ['Cuidador', 'Familiar, acompañante o profesional de la salud que hace seguimiento a uno o varios pacientes.', 'Solicita acceso a un paciente, consulta el panel con la adherencia de quienes acompaña y, si el paciente se lo concede, revisa su historial o registra tomas en su nombre.'],
  ['Sistema', 'Proceso automático del servidor. No es una persona, pero inicia acciones por sí mismo, por lo que se modela como actor.', 'Genera la agenda diaria de tomas, cierra las que nadie respondió una vez vencido el margen de gracia del paciente y avisa a los cuidadores autorizados.'],
];

const RF = [
  ['RF-01', 'El sistema debe permitir el registro de un paciente con nombre, correo, contraseña y, opcionalmente, teléfono y fecha de nacimiento.', 'Paciente', 'Alta', 'RegistrarPaciente'],
  ['RF-02', 'El sistema debe permitir el registro de un cuidador, indicando su rol o parentesco.', 'Cuidador', 'Alta', 'RegistrarCuidador'],
  ['RF-03', 'El sistema debe autenticar a pacientes y cuidadores y emitir una sesión válida.', 'Ambos', 'Alta', 'IniciarSesion'],
  ['RF-04', 'El sistema debe permitir consultar el perfil del usuario autenticado.', 'Ambos', 'Media', 'ObtenerPerfil'],
  ['RF-05', 'El sistema debe permitir al paciente ajustar sus preferencias de accesibilidad y conservarlas en el servidor.', 'Paciente', 'Alta', 'ActualizarPreferencias'],
  ['RF-06', 'El sistema debe permitir registrar un medicamento indicando dosis, unidad, frecuencia, uno o varios horarios y fecha de inicio.', 'Paciente / Cuidador', 'Alta', 'RegistrarMedicamento'],
  ['RF-07', 'El sistema debe listar los medicamentos vigentes de un paciente.', 'Paciente / Cuidador', 'Alta', 'ListarMedicamentos'],
  ['RF-08', 'El sistema debe permitir modificar los datos de un medicamento existente, conservando su historial de tomas.', 'Paciente / Cuidador', 'Media', 'ActualizarMedicamento'],
  ['RF-09', 'El sistema debe permitir suspender un medicamento conservando su historial de tomas.', 'Paciente / Cuidador', 'Alta', 'SuspenderMedicamento'],
  ['RF-10', 'El sistema debe permitir registrar el reabastecimiento del inventario de un medicamento.', 'Paciente / Cuidador', 'Media', 'ReabastecerStock'],
  ['RF-11', 'El sistema debe avisar cuando el inventario de un medicamento alcanza el umbral configurado.', 'Sistema', 'Media', 'Stock'],
  ['RF-12', 'El sistema debe generar la agenda de tomas del día a partir de los horarios y la frecuencia de cada medicamento.', 'Sistema', 'Alta', 'ObtenerAgendaDelDia'],
  ['RF-13', 'El sistema debe permitir confirmar que una toma fue realizada.', 'Paciente / Cuidador', 'Alta', 'RegistrarToma'],
  ['RF-14', 'El sistema debe permitir registrar que una toma no fue realizada, con un motivo opcional.', 'Paciente / Cuidador', 'Alta', 'RegistrarToma'],
  ['RF-15', 'El sistema debe permitir posponer una toma un máximo de tres veces.', 'Paciente', 'Media', 'Toma'],
  ['RF-16', 'El sistema debe descontar el inventario correspondiente al confirmar una toma.', 'Sistema', 'Media', 'Medicamento'],
  ['RF-17', 'El sistema debe cerrar automáticamente las tomas sin respuesta una vez vencido el margen de gracia del paciente.', 'Sistema', 'Alta', 'CerrarTomasVencidas'],
  ['RF-18', 'La aplicación debe emitir una alarma local en el dispositivo a la hora programada de cada toma.', 'Sistema', 'Alta', 'AlarmasExpo'],
  ['RF-19', 'El sistema debe permitir consultar el historial de tomas en un período determinado.', 'Paciente / Cuidador', 'Alta', 'ConsultarHistorial'],
  ['RF-20', 'El sistema debe calcular el porcentaje de adherencia sobre las tomas resueltas del período.', 'Sistema', 'Alta', 'ResumenDeAdherencia'],
  ['RF-21', 'El sistema debe clasificar la adherencia en niveles (buena, regular, baja) según el umbral clínico del 80 %.', 'Sistema', 'Media', 'ResumenDeAdherencia'],
  ['RF-22', 'El sistema debe registrar la puntualidad de cada toma respecto a su hora original programada.', 'Sistema', 'Media', 'Toma'],
  ['RF-23', 'El sistema debe permitir solicitar un vínculo entre un cuidador y un paciente, iniciado por cualquiera de las dos partes.', 'Ambos', 'Alta', 'SolicitarVinculo'],
  ['RF-24', 'El sistema debe permitir al paciente aceptar, rechazar o revocar el vínculo con un cuidador en cualquier momento.', 'Paciente', 'Alta', 'ResponderSolicitudDeVinculo'],
  ['RF-25', 'El sistema debe permitir al paciente definir, cuidador por cuidador y permiso por permiso, qué puede hacer cada uno con su información.', 'Paciente', 'Alta', 'CambiarPermisosDelVinculo'],
  ['RF-26', 'El sistema debe presentar al cuidador un panel con la adherencia de sus pacientes, ordenado por prioridad de atención.', 'Cuidador', 'Alta', 'ListarPacientesDelCuidador'],
  ['RF-27', 'El sistema debe permitir al paciente consultar quiénes lo acompañan y con qué permisos.', 'Paciente', 'Media', 'ListarCuidadoresDelPaciente'],
  ['RF-28', 'El sistema debe notificar al cuidador autorizado cuando su paciente pierde una o más tomas.', 'Sistema', 'Alta', 'NotificadorExpoPush'],
  ['RF-29', 'El sistema debe permitir registrar el teléfono de una persona para recibir notificaciones remotas.', 'Ambos', 'Media', 'RegistrarDispositivo'],
  ['RF-30', 'El sistema debe dar de baja el teléfono al cerrar sesión, y también cuando el servicio informe que la aplicación fue desinstalada.', 'Ambos', 'Media', 'OlvidarDispositivo'],
  ['RF-31', 'El sistema debe permitir al cuidador autorizado consultar el detalle de un paciente: su agenda del día, su tratamiento vigente y las tomas que no realizó.', 'Cuidador', 'Alta', 'ObtenerAgendaDelDia'],
  ['RF-32', 'La aplicación debe abrir directamente la información del paciente al que se refiere una notificación cuando el cuidador la toca.', 'Sistema', 'Media', 'NavegacionPorNotificaciones'],
  ['RF-33', 'El sistema debe permitir recuperar el acceso a una cuenta cuyo titular olvidó la contraseña, mediante un código enviado a su correo.', 'Ambos', 'Alta', 'SolicitarRecuperacion'],
  ['RF-34', 'El sistema debe permitir establecer una contraseña nueva presentando ese código, que caducará, servirá una sola vez y admitirá un número limitado de intentos.', 'Ambos', 'Alta', 'RestablecerContrasena'],
];

const RNF = [
  ['RNF-01', 'Usabilidad', 'El texto de cuerpo no será inferior a 18 puntos y el paciente podrá ampliar toda la interfaz hasta un 145 %.', 'Inspección del sistema de diseño y prueba de las tres opciones de tamaño. Verificado.'],
  ['RNF-02', 'Accesibilidad', 'Todo par de texto y fondo usado en la interfaz cumplirá la relación de contraste 4.5:1 que exige la norma WCAG 2.1 nivel AA.', 'Cálculo de contraste sobre la paleta definida. Verificado.'],
  ['RNF-03', 'Accesibilidad', 'Ningún elemento táctil medirá menos de 64 píxeles de alto, por encima de los 44 recomendados.', 'Inspección de los componentes base. Verificado.'],
  ['RNF-04', 'Accesibilidad', 'Ningún estado se comunicará únicamente mediante color: llevará además icono y palabra.', 'Revisión de las tarjetas de toma y de las insignias de estado. Verificado.'],
  ['RNF-05', 'Accesibilidad', 'Todos los controles expondrán etiquetas para lectores de pantalla (TalkBack, VoiceOver).', 'Inspección de las propiedades de accesibilidad de cada componente. Verificado.'],
  ['RNF-06', 'Usabilidad', 'Las acciones sobre una toma se realizarán mediante botones visibles, sin gestos ocultos ni deslizamientos.', 'Revisión de la pantalla principal. Verificado.'],
  ['RNF-07', 'Seguridad', 'Las contraseñas se almacenarán cifradas con bcrypt —implementación bcryptjs, factor de costo 10— y nunca en texto plano.', 'Inspección del adaptador de cifrado y de la base de datos. Verificado.'],
  ['RNF-08', 'Seguridad', 'El inicio de sesión no revelará si un correo está registrado, ni por el mensaje ni por el tiempo de respuesta.', 'Prueba automatizada que compara ambos mensajes de error. Verificado.'],
  ['RNF-09', 'Seguridad', 'Las sesiones se gestionarán con tokens firmados y expiración de siete días por defecto, configurable.', 'Inspección del servicio de tokens y de la configuración. Verificado.'],
  ['RNF-10', 'Seguridad', 'Todas las consultas a la base de datos usarán parámetros, nunca concatenación de texto.', 'Revisión del único archivo que contiene SQL. Verificado.'],
  ['RNF-11', 'Privacidad', 'Un cuidador solo accederá a los datos de un paciente que haya aceptado el vínculo, y únicamente a lo que este le autorice.', 'Veinte pruebas automatizadas de control de acceso y consentimiento, repartidas entre casosDeUso.test.ts y dominio.test.ts. Verificado.'],
  ['RNF-12', 'Rendimiento', 'La agenda del día responderá en menos de 200 ms bajo carga normal.', 'La agenda se resuelve con consultas indexadas por paciente y fecha. Medida en desarrollo por debajo de 100 ms; falta una prueba de carga reproducible incluida en el repositorio. Parcial.'],
  ['RNF-13', 'Fiabilidad', 'La generación de la agenda será idempotente: consultarla varias veces no duplicará tomas.', 'Prueba automatizada de consultas simultáneas a la agenda, más la restricción UNIQUE y el ON CONFLICT DO NOTHING que la respaldan en la base de datos. Verificado.'],
  ['RNF-14', 'Disponibilidad', 'Las alarmas de toma sonarán aunque el dispositivo no tenga conexión a internet.', 'Las alarmas se programan localmente en el teléfono, con siete días de antelación, de modo que suenan sin conexión y sin necesidad de abrir la aplicación. Verificado por diseño y en dispositivo.'],
  ['RNF-15', 'Portabilidad', 'El comportamiento del sistema no dependerá de la zona horaria en que corra el servidor.', 'La suite completa se ejecuta con idéntico resultado bajo seis husos, de UTC+14 a UTC−9. Verificado.'],
  ['RNF-16', 'Mantenibilidad', 'El núcleo de reglas de negocio no dependerá de ninguna librería externa.', 'Cero importaciones externas en el directorio del dominio. Verificado.'],
  ['RNF-17', 'Mantenibilidad', 'El dominio y los casos de uso contarán con pruebas automatizadas que corran sin base de datos.', '128 pruebas en menos de dos segundos. Verificado.'],
  ['RNF-18', 'Mantenibilidad', 'Toda consulta SQL residirá en un único archivo del proyecto.', 'Inspección del directorio de persistencia. Verificado.'],
  ['RNF-19', 'Portabilidad', 'El mecanismo de persistencia será intercambiable sin modificar el dominio ni los casos de uso.', 'La aplicación funciona completa en memoria o con PostgreSQL cambiando una variable. Verificado.'],
  ['RNF-20', 'Compatibilidad', 'La aplicación móvil funcionará sobre Android mediante Expo y el servidor sobre Node.js 20 o superior.', 'Ejecución sobre un dispositivo Android real mediante una compilación de desarrollo, más verificación de tipos y compilación del backend. Verificado.'],
  ['RNF-21', 'Resiliencia', 'Un fallo del servicio de notificaciones no impedirá registrar ni cerrar una toma.', 'Prueba automatizada con el cliente de Expo sustituido por uno que falla: el aviso se pierde, el registro de la toma no. Verificado.'],
  ['RNF-22', 'Mantenibilidad', 'Los tokens de dispositivos que dejen de existir se darán de baja automáticamente, sin intervención manual.', 'Prueba automatizada del acuse DeviceNotRegistered. Verificado.'],
  ['RNF-23', 'Seguridad', 'El código de recuperación caducará a los 30 minutos, servirá una sola vez y admitirá como máximo cinco intentos.', 'Diez pruebas automatizadas de los casos de abuso: caducidad, reutilización, agotamiento de intentos y códigos de otra cuenta. Verificado.'],
  ['RNF-24', 'Privacidad', 'La recuperación de contraseña no revelará si un correo está registrado.', 'Prueba automatizada que compara ambas respuestas, y verificación contra el servidor real. Verificado.'],
  ['RNF-25', 'Seguridad', 'El código de recuperación se almacenará cifrado, nunca en texto plano.', 'Prueba automatizada sobre el valor guardado en el repositorio. Verificado.'],
];

const FASES = [
  ['Planificación', '2', 'Identificación del problema, revisión de literatura, definición del alcance y de los módulos, selección de metodología y de herramientas.'],
  ['Análisis', '2', 'Levantamiento de requerimientos funcionales y no funcionales, definición de actores, modelado del dominio y diagramas de casos de uso.'],
  ['Diseño', '2', 'Diseño de la arquitectura hexagonal, modelo entidad-relación, diagramas de clases y de secuencia, y sistema de diseño accesible de la interfaz.'],
  ['Desarrollo Backend', '5', 'Dominio, casos de uso, adaptadores de persistencia y seguridad, API HTTP y tarea automática de cierre de tomas.'],
  ['Desarrollo Frontend', '4', 'Aplicación móvil: pantallas de acceso, agenda diaria, medicamentos, historial, preferencias y panel del cuidador.'],
  ['Pruebas', '3', 'Pruebas unitarias y de integración, verificación contra base de datos real, pruebas de concurrencia y de usabilidad con adultos mayores.'],
];

// =====================================================================
// Documento
// =====================================================================

const doc = new Document({
  creator: 'Julián Andrés Herrera Roncancio y Emmanuel Correa Valencia',
  title: 'Chronova — Actores, cronograma y requerimientos',
  styles: { default: { document: { run: { font: FUENTE, size: 24 } } } },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840, orientation: PageOrientation.PORTRAIT },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 2041 },
      },
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 80 },
        children: [new TextRun({ text: 'CHRONOVA', font: FUENTE, size: 32, bold: true, color: VERDE })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 320 },
        children: [new TextRun({ text: 'Actores, cronograma y requerimientos del sistema', font: FUENTE, size: 26 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 480 },
        children: [
          new TextRun({ text: 'Julián Andrés Herrera Roncancio  |  Emmanuel Correa Valencia', font: FUENTE, size: 22, break: 0 }),
          new TextRun({ text: 'Universidad Católica Luis Amigó  |  Facultad de Ingenierías y Arquitectura', font: FUENTE, size: 22, break: 1 }),
          new TextRun({ text: 'Medellín, Colombia  |  2026', font: FUENTE, size: 22, break: 1 }),
        ],
      }),

      p([t('Nota sobre este documento. ', { bold: true }), t('Completa las dos tablas que quedaron vacías en el Entregable 1 (apartados 2.5 y 3.3) y añade el levantamiento de requerimientos, que corresponde a la fase de Análisis. Los requerimientos funcionales no se redactaron de forma especulativa: se derivaron del sistema ya construido, y la última columna indica el archivo donde vive cada uno, de modo que cualquiera pueda verificarlos en el código. Los criterios de los requerimientos no funcionales incluyen la evidencia obtenida al medirlos.')]),

      h1('2.5  Usuarios o actores involucrados'),
      p('El sistema distingue tres actores. Dos son personas con aplicaciones distintas dentro del mismo producto, y el tercero es un proceso automático del servidor que inicia acciones por su cuenta.'),
      tabla([1700, 3400, 3660], ['Actor', 'Descripción', 'Interacción principal con el sistema'], ACTORES),
      new Paragraph({ spacing: { after: 200 } }),
      p([t('Observación. ', { bold: true }), t('El módulo 3 del apartado 2.4 menciona un «panel de super usuario». En la solución construida esa función la cumple el panel del cuidador, que supervisa a los pacientes que tiene a cargo. No existe todavía un rol de administrador con visión global de la plataforma; queda registrado como trabajo futuro, junto con la gestión institucional mencionada en el planteamiento.')]),

      h1('3.3  Estimación de tiempos por fases'),
      p('La estimación corresponde a un equipo de dos desarrolladores trabajando en paralelo con sus responsabilidades académicas, sobre un período aproximado de un semestre. Las fases se solapan parcialmente por tratarse de una metodología incremental.'),
      tabla([2000, 1400, 5360], ['Fase', 'Duración estimada (semanas)', 'Actividades principales'], FASES, { centrar: [1] }),
      new Paragraph({ spacing: { after: 200 } }),
      p('El total asciende a dieciocho semanas. Al momento de redactar este documento están completadas las fases de planificación, análisis y diseño, el desarrollo del backend y una primera versión funcional del frontend. Restan las pruebas de usabilidad con adultos mayores, que son las que aportarán la evidencia más relevante para los objetivos de la investigación.'),

      h1('5.  Requerimientos funcionales'),
      p('Describen lo que el sistema debe hacer. Se agrupan según los módulos definidos en el apartado 2.4 y se priorizan como alta o media según su relación con el objetivo del proyecto: mejorar la adherencia al tratamiento y permitir el seguimiento por parte de cuidadores.'),
      tabla([700, 3000, 1150, 1000, 2910],
        ['ID', 'Requerimiento', 'Actor', 'Prioridad', 'Implementado en'],
        RF, { centrar: [0, 3], mono: [4], size: 18 }),
      new Paragraph({ spacing: { after: 200 } }),
      p('Los treinta y cuatro requerimientos están implementados en el servidor, son alcanzables desde la aplicación móvil y se verificaron en ejecución. El RF-28 se comprobó de extremo a extremo sobre un dispositivo Android real, con una compilación de desarrollo del proyecto: el servidor detectó una toma vencida, envió el aviso y este llegó al teléfono de la cuidadora, que al tocarlo abrió directamente la información de esa paciente. Conviene dejar constancia de que esa comprobación exige dicha compilación, porque desde la versión 53 del SDK la aplicación Expo Go no admite notificaciones remotas.'),

      h1('6.  Requerimientos no funcionales'),
      p('Describen cómo debe comportarse el sistema. Se presta especial atención a la accesibilidad, porque la revisión de literatura del proyecto identifica la experiencia de usuario como el principal factor de abandono de las aplicaciones de salud entre adultos mayores; y a la portabilidad y la mantenibilidad, que son las que justifican la arquitectura elegida.'),
      tabla([900, 1350, 3200, 3310],
        ['ID', 'Categoría', 'Requerimiento', 'Criterio de verificación y evidencia'],
        RNF, { centrar: [0], size: 18 }),
      new Paragraph({ spacing: { after: 200 } }),
      p('Los criterios están redactados de forma medible a propósito. Un requerimiento como «la aplicación debe ser fácil de usar» no se puede verificar ni discutir; «el texto base no será inferior a 18 puntos y será ampliable hasta un 145 %» se comprueba abriendo la aplicación.'),

      h1('Trazabilidad'),
      p('Cada requerimiento funcional puede rastrearse hasta el archivo que lo implementa y hasta la prueba automatizada que lo verifica. Los nombres de la última columna corresponden a archivos TypeScript de los directorios de casos de uso y de dominio del backend, salvo AlarmasExpo, que pertenece a la aplicación móvil.'),
      p('Las pruebas correspondientes se encuentran en los archivos dominio.test.ts, zonaHoraria.test.ts, casosDeUso.test.ts y notificaciones.test.ts del directorio de pruebas del backend, y se ejecutan con el comando npm test.'),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync('/home/claude/chronova/docs/Chronova-Requerimientos.docx', buffer);
  console.log('documento generado');
});
