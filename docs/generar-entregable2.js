/**
 * Genera el Entregable 2 (Capítulo 2: Diseño) sobre la plantilla del curso.
 *
 * Se genera con código y no se escribe a mano por la misma razón que el
 * documento de requerimientos: los datos salen del proyecto real —el
 * esquema de la base de datos, las rutas, los esquemas de validación, la
 * paleta— y cuando el proyecto cambia se vuelve a correr esto en lugar de
 * buscar a mano qué quedó desactualizado.
 *
 *   node generar-entregable2.js
 *
 * La maquetación reproduce la de la plantilla: Letter, Arial, márgenes de
 * 1" salvo el izquierdo de 1.417", títulos de nivel 1 y 2.
 */

const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  PageOrientation, PageBreak, ImageRun,
} = require('docx');
const fs = require('fs');

const ANCHO_CONTENIDO = 8760; // DXA
const FUENTE = 'Arial';
const VERDE = '185A66';
const GRIS_CABECERA = '999999';
const GRIS_ALTERNO = 'F2F2F2';
const DIAGRAMAS = '/home/claude/chronova/docs/diagramas';
const CAPTURAS = '/home/claude/chronova/docs/capturas';

const t = (text, o = {}) => new TextRun({
  text, font: FUENTE, size: o.size ?? 24, bold: o.bold, italics: o.italics, color: o.color,
});
const p = (text, o = {}) => new Paragraph({
  alignment: o.align ?? AlignmentType.JUSTIFIED,
  spacing: { after: o.after ?? 200, line: o.line ?? 276 },
  indent: o.indent,
  children: Array.isArray(text) ? text : [t(text, o)],
});
// Un párrafo a todo el ancho de una página horizontal son 9,5 pulgadas de
// renglón: el ojo pierde la línea al volver. En las páginas de figura el
// texto se sangra para que el renglón siga midiendo lo de siempre.
const SANGRIA_APAISADA = { left: 1750, right: 1750 };
const pFigura = (text, o = {}) => p(text, { ...o, indent: SANGRIA_APAISADA });
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

/**
 * Inserta un diagrama.
 *
 * Escala al ancho Y al alto disponibles: limitar solo el ancho hacía que el
 * diagrama de clases —que es alto y estrecho— se saliera de la página.
 *
 * Los diagramas anchos se emiten en una página apaisada propia. En vertical
 * el ancho útil son 6,08 pulgadas; en horizontal, 9,5. Un 55% más de ancho
 * es la diferencia entre poder leer los nombres de las clases y no poder.
 */
function diagrama(archivo, anchoPx, altoPx, pie, opciones = {}) {
  const { apaisado = false, antes = [], despues = [] } = opciones;
  // Espacio útil en píxeles a 96 ppp, dejando aire para el pie de figura.
  const ANCHO_MAXIMO = apaisado ? 900 : 580;
  const ALTO_MAXIMO = apaisado ? 560 : 800;
  const escala = Math.min(1, ANCHO_MAXIMO / anchoPx, ALTO_MAXIMO / altoPx);
  const contenido = [
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 120, after: 80 },
      children: [new ImageRun({
        type: 'png',
        data: fs.readFileSync(`${DIAGRAMAS}/${archivo}`),
        transformation: { width: Math.round(anchoPx * escala), height: Math.round(altoPx * escala) },
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 240 },
      children: [t(pie, { size: 20, italics: true })],
    }),
  ];
  // El encabezado del apartado viaja con la figura: si se queda en la página
  // vertical anterior, aparece solo al pie de una página en blanco.
  return apaisado
    ? [{ __apaisado: [...antes, ...contenido, ...despues] }]
    : [...antes, ...contenido, ...despues];
}

// ---- Páginas apaisadas -------------------------------------------------
// docx-js no permite cambiar la orientación a mitad de una sección, así que
// cada diagrama apaisado tiene que ser su propia sección. Se marcan con el
// centinela __apaisado y aquí se parte la lista plana en secciones.

const PAGINA_VERTICAL = {
  page: {
    size: { width: 12240, height: 15840, orientation: PageOrientation.PORTRAIT },
    margin: { top: 1440, right: 1440, bottom: 1440, left: 2041 },
  },
};
const PAGINA_APAISADA = {
  page: {
    size: { width: 12240, height: 15840, orientation: PageOrientation.LANDSCAPE },
    margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
  },
};

function repartirEnSecciones(hijos) {
  const secciones = [];
  let acumulado = [];
  const cerrar = () => {
    if (acumulado.length) secciones.push({ properties: PAGINA_VERTICAL, children: acumulado });
    acumulado = [];
  };
  for (const hijo of hijos) {
    if (hijo && hijo.__apaisado) {
      cerrar();
      secciones.push({ properties: PAGINA_APAISADA, children: hijo.__apaisado });
    } else {
      acumulado.push(hijo);
    }
  }
  cerrar();
  return secciones;
}

function celda(texto, { anchura, cabecera = false, alterna = false, centrar = false, mono = false, size = 22 }) {
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

/** Bloque de código o árbol de carpetas, en monoespaciada. */
function bloque(lineas) {
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
      // Un árbol de carpetas partido en dos páginas no se entiende: la
      // indentación de la segunda mitad pierde su raíz.
      cantSplit: true,
      children: [new TableCell({
        width: { size: ANCHO_CONTENIDO, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: 'F7F9FA' },
        margins: { top: 120, bottom: 120, left: 160, right: 120 },
        children: lineas.map((l) => new Paragraph({
          spacing: { after: 0, line: 220 },
          children: [new TextRun({ text: l, font: 'Consolas', size: 17 })],
        })),
      })],
    })],
  });
}

/**
 * Inserta las capturas de una pantalla, una al lado de otra.
 *
 * Son fotos de un telefono, asi que son altas y estrechas. Se escalan por
 * ALTURA y no por anchura: puestas a lo ancho de la pagina medirian medio
 * metro de alto. Cuando una pantalla necesita varias capturas se ponen en
 * la misma fila, que es como se comparan.
 */
function capturas(archivos) {
  const ALTO = archivos.length >= 3 ? 330 : 400;
  const imagenes = [];

  archivos.forEach((archivo, i) => {
    const datos = fs.readFileSync(`${CAPTURAS}/${archivo}`);
    const { ancho, alto } = medirPng(datos);
    if (i > 0) imagenes.push(new TextRun({ text: '   ' }));
    imagenes.push(new ImageRun({
      type: 'png',
      data: datos,
      transformation: { width: Math.round((ancho / alto) * ALTO), height: ALTO },
    }));
  });

  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 240 },
    children: imagenes,
  });
}

/** Lee ancho y alto de la cabecera IHDR de un PNG, sin librerias. */
function medirPng(datos) {
  return { ancho: datos.readUInt32BE(16), alto: datos.readUInt32BE(20) };
}

// =====================================================================
// Datos, todos extraídos del proyecto real
// =====================================================================

const STACK = [
  ['Backend', 'Node.js 20 con TypeScript y Express 4',
   'TypeScript aporta tipos estáticos, que en este proyecto no son un adorno: impiden compilar si falta un dato obligatorio, como la autorización de tratamiento de datos al registrar una cuenta. Express se eligió por ser minimalista, lo que permite mantenerlo confinado a la capa de infraestructura sin que condicione el diseño.'],
  ['Frontend', 'React Native 0.79 con Expo SDK 53 y expo-router',
   'Una sola base de código para Android e iOS. Expo resuelve además las notificaciones, las alarmas locales y la compilación en la nube sin configurar herramientas nativas. Al ser también TypeScript, el vocabulario del dominio se comparte con el servidor sin traducciones.'],
  ['Base de datos', 'PostgreSQL 16, alojada en Neon',
   'Los datos son fuertemente relacionales (un paciente tiene medicamentos, que a su vez generan tomas) y las reglas de integridad importan: una toma sin medicamento no debe existir. PostgreSQL ofrece además tipos que el modelo aprovecha: arreglos para los horarios y JSONB para permisos y preferencias, que pueden crecer sin migrar la tabla.'],
  ['APIs', 'REST sobre HTTP, con JSON',
   'REST se ajusta a un modelo de recursos claros y es lo que la aplicación móvil consume con menos ceremonia. GraphQL habría añadido complejidad sin resolver ningún problema del proyecto: no hay clientes con necesidades de datos divergentes.'],
  ['Autenticación', 'JWT firmado (HS256) y bcrypt para las contraseñas',
   'El token firmado evita guardar sesiones en el servidor. Su limitación conocida, que no se puede revocar, se resolvió con una fecha de validez por cuenta que el propio token transporta, de modo que cambiar la contraseña invalida todas las sesiones abiertas sin almacenar ninguna.'],
  ['Notificaciones', 'Expo Push para los avisos remotos; expo-notifications para las alarmas locales',
   'Se distinguen dos cosas: la alarma de la toma vive en el teléfono del paciente y funciona sin conexión; el aviso al cuidador viaja por la red. Por privacidad, los avisos remotos no incluyen el nombre del medicamento.'],
  ['Correo', 'Resend, sobre una API HTTP',
   'Solo se usa para el código de recuperación de contraseña. Se eligió por integrarse con una clave y una petición HTTP, sin instalar librerías ni configurar un servidor SMTP; cambiarlo por otro proveedor es reescribir un archivo.'],
  ['Validación', 'Zod',
   'Comprueba la forma de los datos en el borde de la aplicación y devuelve mensajes en español listos para mostrar. Las reglas de negocio no viven aquí, sino en el dominio, donde no se pueden rodear.'],
  ['Pruebas', 'Vitest',
   'Rápido y con la misma configuración de TypeScript del proyecto. Las 194 pruebas corren en menos de seis segundos porque la arquitectura permite ejecutarlas sin base de datos ni servidor.'],
  ['Infraestructura', 'Desarrollo en local; despliegue previsto en una plataforma como servicio (Render), con la base de datos ya en la nube (Neon)',
   'Una plataforma como servicio evita administrar un servidor y provee el certificado HTTPS, que no es opcional: Android bloquea las conexiones sin cifrar en las compilaciones de producción. Se descartó el modelo serverless porque el sistema mantiene una tarea periódica que exige un proceso vivo.'],
  ['Sistema operativo', 'Desarrollo en Windows 11; ejecución en Linux',
   'Node.js es multiplataforma y el proyecto no depende del sistema. Las pruebas se ejecutan bajo seis zonas horarias distintas para garantizar que tampoco dependen del reloj de la máquina.'],
  ['Herramientas', 'Visual Studio Code, Prettier, PlantUML',
   'Prettier unifica el formato del código y elimina las discusiones de estilo entre los dos autores. PlantUML permite mantener los diagramas como texto plano, versionables y comparables en un control de cambios.'],
  ['Control de versiones', 'Git con GitHub',
   'Repositorio único con el backend, la aplicación móvil y la documentación, de modo que un cambio y su documentación viajen en el mismo commit.'],
];

const DIC_PACIENTES = [
  ['id', 'UUID', 'Identificador único del paciente', 'PK', 'No aplica'],
  ['nombre', 'TEXT', 'Nombre completo', 'NOT NULL', 'No aplica'],
  ['email', 'TEXT', 'Correo con el que inicia sesión', 'NOT NULL, UNIQUE', 'No aplica'],
  ['telefono', 'TEXT', 'Teléfono de contacto', 'Opcional', 'No aplica'],
  ['fecha_de_nacimiento', 'DATE', 'Fecha de nacimiento; permite calcular la edad', 'Opcional', 'No aplica'],
  ['contrasena_cifrada', 'TEXT', 'Contraseña cifrada con bcrypt. Nunca se guarda en texto claro', 'NOT NULL', 'No aplica'],
  ['zona_horaria', 'TEXT', 'Identificador IANA, por ejemplo America/Bogota', "NOT NULL, DEFAULT 'America/Bogota'", 'No aplica'],
  ['preferencias', 'JSONB', 'Tamaño de letra, contraste, alertas y minutos de gracia', "NOT NULL, DEFAULT '{}'", 'No aplica'],
  ['activo', 'BOOLEAN', 'Si la cuenta sigue vigente', 'NOT NULL, DEFAULT TRUE', 'No aplica'],
  ['creado_en', 'TIMESTAMPTZ', 'Fecha de creación de la cuenta', 'NOT NULL, DEFAULT NOW()', 'No aplica'],
  ['sesiones_validas_desde', 'TIMESTAMPTZ', 'Desde cuándo se aceptan sus tokens; cambiar la contraseña la mueve', 'NOT NULL, DEFAULT NOW()', 'No aplica'],
  ['politica_version', 'TEXT', 'Versión de la política de datos que aceptó', 'Nulo si no consta', 'No aplica'],
  ['politica_aceptada_en', 'TIMESTAMPTZ', 'Cuándo la aceptó; es la prueba de la autorización', 'Nulo si no consta', 'No aplica'],
];

const DIC_CUIDADORES = [
  ['id', 'UUID', 'Identificador único del cuidador', 'PK', 'No aplica'],
  ['nombre', 'TEXT', 'Nombre completo', 'NOT NULL', 'No aplica'],
  ['email', 'TEXT', 'Correo con el que inicia sesión', 'NOT NULL, UNIQUE', 'No aplica'],
  ['telefono', 'TEXT', 'Teléfono de contacto', 'Opcional', 'No aplica'],
  ['contrasena_cifrada', 'TEXT', 'Contraseña cifrada con bcrypt', 'NOT NULL', 'No aplica'],
  ['rol', 'TEXT', 'Rol o parentesco declarado (hija, enfermera…)', 'Opcional', 'No aplica'],
  ['preferencias', 'JSONB', 'Tamaño de letra, contraste y alertas', "NOT NULL, DEFAULT '{}'", 'No aplica'],
  ['activo', 'BOOLEAN', 'Si la cuenta sigue vigente', 'NOT NULL, DEFAULT TRUE', 'No aplica'],
  ['creado_en', 'TIMESTAMPTZ', 'Fecha de creación', 'NOT NULL, DEFAULT NOW()', 'No aplica'],
  ['sesiones_validas_desde', 'TIMESTAMPTZ', 'Desde cuándo se aceptan sus tokens', 'NOT NULL, DEFAULT NOW()', 'No aplica'],
  ['politica_version', 'TEXT', 'Versión de la política de datos aceptada', 'Nulo si no consta', 'No aplica'],
  ['politica_aceptada_en', 'TIMESTAMPTZ', 'Cuándo la aceptó', 'Nulo si no consta', 'No aplica'],
];

const DIC_MEDICAMENTOS = [
  ['id', 'UUID', 'Identificador único del medicamento', 'PK', 'No aplica'],
  ['paciente_id', 'UUID', 'Paciente al que pertenece', 'FK, NOT NULL, ON DELETE CASCADE', 'pacientes(id)'],
  ['nombre', 'TEXT', 'Nombre del medicamento', 'NOT NULL', 'No aplica'],
  ['dosis_cantidad', 'NUMERIC(10,2)', 'Cantidad por toma', 'NOT NULL, CHECK > 0', 'No aplica'],
  ['dosis_unidad', 'TEXT', 'Unidad de la dosis (tableta, ml, gota…)', 'NOT NULL', 'No aplica'],
  ['frecuencia_tipo', 'TEXT', 'DIARIA, DIAS_DE_LA_SEMANA o CADA_N_DIAS', 'NOT NULL, CHECK', 'No aplica'],
  ['frecuencia_dias', 'SMALLINT[]', 'Días de la semana cuando aplica (0 = domingo)', "NOT NULL, DEFAULT '{}'", 'No aplica'],
  ['frecuencia_intervalo', 'INTEGER', 'Cada cuántos días, cuando aplica', 'NOT NULL, DEFAULT 1', 'No aplica'],
  ['horarios', 'TEXT[]', 'Horas de toma del día, en formato de 24 horas', 'NOT NULL', 'No aplica'],
  ['fecha_inicio', 'DATE', 'Primer día del tratamiento', 'NOT NULL', 'No aplica'],
  ['fecha_fin', 'DATE', 'Último día, si el tratamiento tiene término', 'Opcional', 'No aplica'],
  ['instrucciones', 'TEXT', 'Indicaciones adicionales (con alimentos, etc.)', 'Opcional', 'No aplica'],
  ['stock_unidades', 'INTEGER', 'Unidades disponibles en inventario', 'NOT NULL, CHECK >= 0', 'No aplica'],
  ['stock_umbral', 'INTEGER', 'Umbral que dispara el aviso de reabastecimiento', 'NOT NULL, CHECK >= 0', 'No aplica'],
  ['activo', 'BOOLEAN', 'Falso cuando el tratamiento se suspende', 'NOT NULL, DEFAULT TRUE', 'No aplica'],
  ['creado_en', 'TIMESTAMPTZ', 'Fecha de registro', 'NOT NULL, DEFAULT NOW()', 'No aplica'],
  ['actualizado_en', 'TIMESTAMPTZ', 'Última modificación', 'NOT NULL, DEFAULT NOW()', 'No aplica'],
];

const DIC_TOMAS = [
  ['id', 'UUID', 'Identificador único de la toma', 'PK', 'No aplica'],
  ['medicamento_id', 'UUID', 'Medicamento que la genera', 'FK, NOT NULL, ON DELETE CASCADE', 'medicamentos(id)'],
  ['paciente_id', 'UUID', 'Paciente al que corresponde', 'FK, NOT NULL, ON DELETE CASCADE', 'pacientes(id)'],
  ['programada_para', 'TIMESTAMPTZ', 'Hora vigente, que se corre al posponer', 'NOT NULL', 'No aplica'],
  ['programada_originalmente_para', 'TIMESTAMPTZ', 'Hora original; es contra esta que se mide la puntualidad', 'NOT NULL, UNIQUE con medicamento_id', 'No aplica'],
  ['estado', 'TEXT', 'PENDIENTE, POSPUESTA, TOMADA u OMITIDA', 'NOT NULL, CHECK', 'No aplica'],
  ['resuelta_en', 'TIMESTAMPTZ', 'Instante en que se confirmó u omitió', 'Nulo mientras esté pendiente', 'No aplica'],
  ['origen_del_registro', 'TEXT', 'Quién la registró: PACIENTE, CUIDADOR o SISTEMA', 'CHECK', 'No aplica'],
  ['registrada_por_id', 'UUID', 'Identificador de quien la registró', 'Sin FK (puede ser de dos tablas)', 'No aplica'],
  ['observaciones', 'TEXT', 'Nota libre asociada al registro', 'Opcional', 'No aplica'],
  ['veces_pospuesta', 'INTEGER', 'Cuántas veces se aplazó; el máximo es tres', 'NOT NULL, DEFAULT 0', 'No aplica'],
];

const DIC_VINCULOS = [
  ['id', 'UUID', 'Identificador único del vínculo', 'PK', 'No aplica'],
  ['cuidador_id', 'UUID', 'Cuidador que acompaña', 'FK, NOT NULL, ON DELETE CASCADE', 'cuidadores(id)'],
  ['paciente_id', 'UUID', 'Paciente acompañado', 'FK, NOT NULL, ON DELETE CASCADE', 'pacientes(id)'],
  ['estado', 'TEXT', 'PENDIENTE, ACEPTADO, RECHAZADO o REVOCADO', 'NOT NULL, CHECK', 'No aplica'],
  ['parentesco', 'TEXT', 'Relación declarada entre las dos personas', 'Opcional', 'No aplica'],
  ['permisos', 'JSONB', 'Los cuatro permisos que el paciente concede o niega', "NOT NULL, DEFAULT '{}'", 'No aplica'],
  ['solicitado_por', 'TEXT', 'Quién inició la solicitud: PACIENTE o CUIDADOR', 'NOT NULL, CHECK', 'No aplica'],
  ['creado_en', 'TIMESTAMPTZ', 'Fecha de la solicitud', 'NOT NULL, DEFAULT NOW()', 'No aplica'],
  ['resuelto_en', 'TIMESTAMPTZ', 'Fecha en que se aceptó, rechazó o revocó', 'Opcional', 'No aplica'],
];

const DIC_DISPOSITIVOS = [
  ['id', 'UUID', 'Identificador único del registro', 'PK', 'No aplica'],
  ['propietario_id', 'UUID', 'Persona dueña del aparato', 'NOT NULL, sin FK', 'pacientes o cuidadores'],
  ['tipo_de_propietario', 'TEXT', 'PACIENTE o CUIDADOR; resuelve a qué tabla apunta', 'NOT NULL, CHECK', 'No aplica'],
  ['token', 'TEXT', 'Identificador de notificaciones del aparato', 'NOT NULL, UNIQUE', 'No aplica'],
  ['plataforma', 'TEXT', 'android, ios o web', 'NOT NULL, CHECK', 'No aplica'],
  ['registrado_en', 'TIMESTAMPTZ', 'Cuándo se registró el aparato', 'NOT NULL, DEFAULT NOW()', 'No aplica'],
  ['ultimo_uso_en', 'TIMESTAMPTZ', 'Último aviso entregado con éxito', 'NOT NULL, DEFAULT NOW()', 'No aplica'],
];

const DIC_RECUPERACIONES = [
  ['id', 'UUID', 'Identificador único de la solicitud', 'PK', 'No aplica'],
  ['usuario_id', 'UUID', 'Persona que solicita recuperar el acceso', 'NOT NULL, sin FK', 'pacientes o cuidadores'],
  ['tipo_de_cuenta', 'TEXT', 'PACIENTE o CUIDADOR', 'NOT NULL, CHECK', 'No aplica'],
  ['codigo_cifrado', 'TEXT', 'Código de seis dígitos, cifrado como una contraseña', 'NOT NULL', 'No aplica'],
  ['creada_en', 'TIMESTAMPTZ', 'Instante de la solicitud', 'NOT NULL', 'No aplica'],
  ['expira_en', 'TIMESTAMPTZ', 'Caducidad, treinta minutos después', 'NOT NULL', 'No aplica'],
  ['intentos', 'INTEGER', 'Intentos fallidos; el máximo es cinco', 'NOT NULL, DEFAULT 0', 'No aplica'],
  ['usada_en', 'TIMESTAMPTZ', 'Instante en que se usó; sirve una sola vez', 'Nulo mientras esté vigente', 'No aplica'],
];

const RELACIONES = [
  ['sigue', 'pacientes', 'medicamentos', '1:N'],
  ['genera', 'medicamentos', 'tomas', '1:N'],
  ['registra', 'pacientes', 'tomas', '1:N'],
  ['autoriza', 'pacientes', 'vinculos', '1:N'],
  ['acompaña', 'cuidadores', 'vinculos', '1:N'],
  ['acompañamiento', 'pacientes', 'cuidadores', 'N:M, resuelta con la tabla vinculos'],
  ['recibe avisos en', 'pacientes / cuidadores', 'dispositivos', '1:N, sin clave foránea'],
  ['solicita', 'pacientes / cuidadores', 'recuperaciones', '1:N, sin clave foránea'],
];

// Anchos comunes del diccionario de datos. Campo y Tipo van holgados a
// propósito: «sesiones_validas_desde» y «TIMESTAMPTZ» se partían en dos
// líneas y el corte hacía ilegible el nombre de la columna.
const DIC_COLUMNAS = [2100, 1400, 2100, 1760, 1400]; // suman ANCHO_CONTENIDO

// Los endpoints traían dos columnas, «Parámetros» y «Body», y ninguna ruta
// usa las dos: las de consulta llevan parámetros y las de escritura llevan
// cuerpo. Separarlas dejaba media tabla en guiones y estrechaba tanto el
// resto que «aceptaPoliticaDeDatos» se partía por la mitad. Se unen en una
// sola columna de entrada.
const ENDPOINT_CABECERAS = ['Método', 'Endpoint', 'Descripción', 'Entrada', 'Respuesta'];
const ENDPOINT_COLUMNAS = [800, 2050, 1850, 2100, 1960]; // suman ANCHO_CONTENIDO

function entradaUnica(filas) {
  return filas.map(([metodo, ruta, descripcion, parametros, cuerpo, respuesta]) => {
    const partes = [parametros, cuerpo].filter((v) => v && v !== 'Ninguna');
    if (partes.length === 2) {
      throw new Error(`La ruta ${ruta} declara parámetros y body a la vez; hay que revisar la fusión de columnas.`);
    }
    return [metodo, ruta, descripcion, partes[0] ?? 'Ninguna', respuesta];
  });
}

const ENDPOINTS_AUTH = [
  ['POST', '/api/auth/registro/paciente', 'Crear cuenta de paciente', 'Ninguna', 'nombre, email, contrasena, zonaHoraria, aceptaPoliticaDeDatos', '201: token y usuario · 409: correo ya registrado'],
  ['POST', '/api/auth/registro/cuidador', 'Crear cuenta de cuidador', 'Ninguna', 'nombre, email, contrasena, rol, aceptaPoliticaDeDatos', '201: token y usuario · 409: correo ya registrado'],
  ['POST', '/api/auth/sesion', 'Iniciar sesión', 'Ninguna', 'email, contrasena, tipo', '200: token · 401: credenciales inválidas'],
  ['GET', '/api/auth/perfil', 'Perfil de quien tiene la sesión abierta', 'Ninguna', 'Ninguna', '200: perfil · 401: sin token'],
  ['PATCH', '/api/auth/preferencias', 'Ajustar accesibilidad', 'Ninguna', 'tamanoDeLetra, alertas, minutosDeGracia', '200: preferencias actualizadas'],
  ['POST', '/api/auth/recuperacion', 'Pedir un código de recuperación', 'Ninguna', 'email, tipo', '202: siempre, exista o no la cuenta'],
  ['POST', '/api/auth/recuperacion/confirmar', 'Cambiar la contraseña con el código', 'Ninguna', 'email, codigo, nuevaContrasena', '200: contraseña cambiada · 422: código inválido'],
  ['POST', '/api/auth/dispositivos', 'Registrar el teléfono para avisos', 'Ninguna', 'token, plataforma', '200: dispositivo registrado'],
  ['DELETE', '/api/auth/dispositivos', 'Dar de baja el teléfono', 'Ninguna', 'token', '204: dado de baja'],
];

const ENDPOINTS_MED = [
  ['GET', '/api/medicamentos', 'Listar los medicamentos de un paciente', 'pacienteId, incluirSuspendidos', 'Ninguna', '200: lista · 403: sin permiso'],
  ['POST', '/api/medicamentos', 'Registrar un medicamento', 'Ninguna', 'nombre, dosis, frecuencia, horarios, fechaInicio, stock', '201: medicamento creado · 422: regla incumplida'],
  ['PATCH', '/api/medicamentos/:id', 'Modificar un medicamento', 'Ninguna', 'campos a cambiar', '200: actualizado · 404: no existe'],
  ['DELETE', '/api/medicamentos/:id', 'Suspender un medicamento (no lo borra)', 'Ninguna', 'Ninguna', '200: suspendido, historial conservado'],
  ['POST', '/api/medicamentos/:id/stock', 'Reabastecer el inventario', 'Ninguna', 'unidades', '200: inventario actualizado'],
];

const ENDPOINTS_TOMAS = [
  ['GET', '/api/tomas/agenda', 'Agenda de tomas de un día', 'fecha, pacienteId', 'Ninguna', '200: agenda y resumen · 403: sin permiso'],
  ['POST', '/api/tomas/:id/registro', 'Confirmar, omitir o posponer una toma', 'Ninguna', 'accion, observaciones, minutos', '200: toma registrada · 422: aún no es su hora'],
  ['GET', '/api/tomas/historial', 'Historial y adherencia de un período', 'desde, hasta, medicamentoId, pacienteId', 'Ninguna', '200: registros, resumen y serie por día'],
];

const ENDPOINTS_VINC = [
  ['POST', '/api/vinculos', 'Solicitar un vínculo; lo inicia cualquiera de las dos partes', 'Ninguna', 'emailDeLaOtraParte, parentesco', '201: solicitud creada · 404: correo no registrado'],
  ['POST', '/api/vinculos/:id/respuesta', 'Aceptar, rechazar o revocar; solo el paciente decide', 'Ninguna', 'respuesta', '200: vínculo actualizado · 403: no es su vínculo'],
  ['PATCH', '/api/vinculos/:id/permisos', 'Cambiar los permisos de un cuidador', 'Ninguna', 'los cuatro permisos', '200: permisos actualizados'],
  ['GET', '/api/cuidadores/pacientes', 'Panel del cuidador', 'dias', 'Ninguna', '200: pacientes ordenados por urgencia · 403: token de paciente'],
  ['GET', '/api/pacientes/cuidadores', 'Quiénes acompañan al paciente', 'Ninguna', 'Ninguna', '200: cuidadores y sus permisos'],
];

const VALIDACIONES = [
  ['nombre', 'Requerido. Entre 2 y 120 caracteres'],
  ['email', 'Requerido. Formato de correo válido; se normaliza a minúsculas y debe ser único por tipo de cuenta'],
  ['contrasena', 'Requerida. Mínimo 8 caracteres; se rechazan las contraseñas de uso frecuente'],
  ['aceptaPoliticaDeDatos', 'Debe llegar exactamente en verdadero. Un campo ausente no es autorización expresa'],
  ['zonaHoraria', 'Identificador IANA válido. Máximo 64 caracteres; por defecto America/Bogota'],
  ['minutosDeGracia', 'Entero entre 15 y 720'],
  ['tamanoDeLetra', 'Uno de: NORMAL, GRANDE, MUY_GRANDE'],
  ['dosis.cantidad', 'Número mayor que cero'],
  ['frecuencia.tipo', 'Uno de: DIARIA, DIAS_DE_LA_SEMANA, CADA_N_DIAS'],
  ['frecuencia.diasDeLaSemana', 'Enteros entre 0 y 6. Obligatorio si el tipo es DIAS_DE_LA_SEMANA'],
  ['frecuencia.intervaloEnDias', 'Entero entre 1 y 90'],
  ['horarios', 'Entre 1 y 12 horas, en formato HH:MM de 24 horas, sin repetir'],
  ['fechaInicio / fechaFin', 'Formato AAAA-MM-DD. La fecha final no puede ser anterior a la inicial'],
  ['instrucciones', 'Máximo 500 caracteres'],
  ['stock.unidadesDisponibles', 'Entero mayor o igual a cero'],
  ['accion (registro de toma)', 'Una de: CONFIRMAR, OMITIR, POSPONER'],
  ['minutos (posponer)', 'Entero entre 5 y 180. Máximo tres aplazamientos por toma'],
  ['codigo (recuperación)', 'Seis dígitos. Caduca a los 30 minutos, sirve una vez y admite cinco intentos'],
  ['Parámetros de consulta', 'fecha, desde, hasta y los identificadores se validan como texto; un parámetro repetido devuelve 400 y no 500'],
];

const ESTILOS = [
  ['Paleta de colores',
   'Primario #185A66 (muestreado del logotipo) · Primario oscuro #0D4049 · Primario suave #E1EFF2 · Texto #0F1B21 · Texto suave #5A6B75 · Fondo #F7F9FA · Superficie #FFFFFF · Éxito #16704F · Advertencia #8A5209 · Peligro #A3251F'],
  ['Contraste',
   'Los veinte pares de texto y fondo se comprobaron con la fórmula de la WCAG. Ninguno baja de 4.5:1 (nivel AA) y nueve alcanzan 7:1 (nivel AAA). El primario da 7.38:1 sobre el fondo'],
  ['Tipografía',
   'Atkinson Hyperlegible Next, diseñada por el Braille Institute para baja visión. Cuatro pesos: 400, 500, 600 y 700. Escala: cifra 40 pt · título 28 · subtítulo 22 · cuerpo 18 · etiqueta 16 · pequeño 14 · rótulo 13'],
  ['Escalado',
   'Todos los tamaños se multiplican por la preferencia del paciente: normal ×1, grande ×1.2, muy grande ×1.45'],
  ['Espaciado',
   'Escala de 4 px: xs 4 · sm 8 · md 16 · lg 24 · xl 32 · xxl 48. Radios: 8 px los campos, 12 los botones, 14 las tarjetas'],
  ['Componentes base',
   'Botón (primario, secundario, éxito, peligro y texto), Campo, Tarjeta, Texto, Aviso, Insignia, Rótulo, Cargando, EstadoVacío e Icono'],
  ['Zona táctil',
   'Alto mínimo de 64 px en todo elemento tocable, frente a los 44 px que recomiendan las guías. El temblor y la artritis son frecuentes a esta edad'],
  ['Estado y color',
   'El estado nunca se comunica solo con color: siempre lleva además un icono y una palabra, para que funcione con daltonismo y con cataratas'],
];

const MODULOS = [
  ['Dominio (backend)', 'Contiene las siete entidades, sus objetos de valor y las reglas de negocio: cuándo una toma se puede confirmar, cómo se calcula la adherencia, qué hace válido un código de recuperación', 'Ninguna. Cero dependencias externas en 39 archivos'],
  ['Casos de uso', 'Orquestan: piden la entidad al repositorio, le mandan hacer algo y la guardan. No deciden reglas', 'Dominio y puertos'],
  ['PoliticaDeAcceso', 'Punto único de control de autorización. Todo acceso a datos de un paciente pasa por aquí indicando el permiso que necesita', 'Dominio (Vinculo)'],
  ['Puertos', 'Interfaces que declaran lo que la aplicación necesita del exterior: repositorios, reloj, cifrador, notificador, correo', 'Ninguna'],
  ['Adaptadores de persistencia', 'Dos implementaciones del mismo contrato: PostgreSQL y en memoria. La segunda permite correr la aplicación entera sin base de datos', 'Puertos, pg'],
  ['Adaptadores de seguridad', 'Cifrado de contraseñas con bcrypt y emisión y verificación de tokens JWT', 'Puertos, bcryptjs, jsonwebtoken'],
  ['Adaptador HTTP', 'Traduce peticiones a llamadas de casos de uso, valida la forma con Zod y convierte los errores del dominio en códigos de estado', 'Casos de uso, express, zod'],
  ['contenedor.ts', 'Raíz de composición: el único archivo que decide qué implementación concreta se conecta a cada puerto', 'Todo lo anterior'],
  ['Pantallas (móvil)', 'Presentan información y recogen acciones. No conocen HTTP ni URL', 'Contextos y componentes'],
  ['SesionContexto', 'Guarda la sesión, el perfil y las preferencias; envuelve toda la aplicación y sincroniza las alarmas locales', 'Puerto ApiDeChronova'],
  ['PacienteObservadoContexto', 'Carga una sola vez los datos que comparten las tres pestañas de la ficha del paciente', 'Puerto ApiDeChronova'],
  ['ClienteChronova', 'Única pieza de la aplicación que sabe que la comunicación es por HTTP', 'Puerto ApiDeChronova, fetch'],
  ['Sistema de diseño', 'Colores, tipografía, espaciado y componentes reutilizables, en un solo lugar', 'Ninguna'],
];

const PANTALLAS = [
  ['Hoy (paciente)', ['01-hoy-paciente.png'],
   'Es la pantalla principal y la que se abre al entrar. Muestra el saludo, el resumen del día y las tarjetas de cada toma.',
   'Resumen del día · Tarjeta de toma con hora, medicamento y dosis · Botones «Ya la tomé», «En un rato» y «No la tomé» · Aviso de inventario bajo',
   'Confirmar, posponer u omitir una toma. Las tomas cuya hora aún no llega muestran desde cuándo estarán disponibles en lugar de los botones.'],
  ['Medicamentos (paciente)', ['02-medicamentos.png'],
   'Lista de los tratamientos vigentes con su dosis, sus horarios y su inventario.',
   'Tarjeta por medicamento · Insignias con los horarios · Botones de editar, reabastecer y suspender',
   'Agregar, editar, reabastecer o suspender un medicamento.'],
  ['Historial (paciente)', ['03-historial.png'],
   'Porcentaje de adherencia del período, gráfica de los últimos días y detalle de cada toma.',
   'Tarjeta de resumen con el porcentaje y el nivel · Gráfica de barras por día · Lista de registros con su estado y puntualidad',
   'Consultar. Es una pantalla de lectura.'],
  ['Mi cuenta (paciente)', ['04-mi-cuenta-paciente.png'],
   'Preferencias de accesibilidad y control de quién accede a su información. Las preferencias van primero: si alguien no alcanza a leer la aplicación, lo primero que necesita es poder agrandarla.',
   'Selector de tamaño de letra · Interruptores de alertas · Sección de privacidad · Lista de cuidadores con sus cuatro permisos',
   'Cambiar preferencias, invitar a un cuidador, aceptar o rechazar solicitudes, conceder o retirar permisos uno por uno y revocar el acceso.'],
  ['Panel de pacientes (cuidador)', ['05-panel-cuidador.png'],
   'Los pacientes que acompaña, ordenados poniendo primero a quien necesita atención.',
   'Tarjeta por paciente con su adherencia · Insignia «Revisar» · Formulario para solicitar acceso a otro paciente',
   'Abrir la ficha de un paciente o solicitar acceso a uno nuevo.'],
  ['Ficha del paciente (cuidador)', ['06-ficha-paciente.png'],
   'Tres pestañas: Hoy, Tratamiento e Historial. Son tres preguntas distintas que no se hacen a la vez.',
   'Barra de pestañas · Contenido equivalente al del paciente, limitado por los permisos concedidos',
   'Según los permisos: registrar tomas en su nombre y gestionar sus medicamentos. Lo que no está concedido no se muestra, en lugar de mostrarse y fallar.'],
  ['Registro', ['07-registro-a.png', '07-registro-b.png'],
   'Creación de cuenta, eligiendo primero si es paciente o cuidador.',
   'Dos tarjetas grandes para elegir el rol · Campos del formulario · Casilla de autorización de tratamiento de datos',
   'Crear la cuenta. Sin marcar la casilla de autorización no se permite continuar.'],
  ['Mis datos y privacidad', ['08-privacidad-a.png', '08-privacidad-b.png', '08-privacidad-c.png'],
   'Qué datos se guardan, para qué, quién los ve y qué derechos tiene el titular.',
   'Secciones del aviso de privacidad · Constancia de la versión aceptada y su fecha · Enlaces a los documentos completos',
   'Consultar la constancia de la autorización y abrir los documentos.'],
];

const REFERENCIAS = [
  '[1] A. Cockburn, "Hexagonal Architecture," alistair.cockburn.us, 2005. [En línea]. Disponible: https://alistair.cockburn.us/hexagonal-architecture/',
  '[2] R. C. Martin, Clean Architecture: A Craftsman\'s Guide to Software Structure and Design. Boston, MA, EE. UU.: Prentice Hall, 2017.',
  '[3] E. Evans, Domain-Driven Design: Tackling Complexity in the Heart of Software. Boston, MA, EE. UU.: Addison-Wesley, 2003.',
  '[4] V. Vernon, Implementing Domain-Driven Design. Boston, MA, EE. UU.: Addison-Wesley, 2013.',
  '[5] Congreso de Colombia, "Ley Estatutaria 1581 de 2012, por la cual se dictan disposiciones generales para la protección de datos personales," Diario Oficial No. 48.587, Bogotá, Colombia, 17 oct. 2012.',
  '[6] Presidencia de la República de Colombia, "Decreto 1074 de 2015, Decreto Único Reglamentario del Sector Comercio, Industria y Turismo," Bogotá, Colombia, 26 may. 2015.',
  '[7] World Wide Web Consortium, "Web Content Accessibility Guidelines (WCAG) 2.2," W3C Recommendation, 5 oct. 2023. [En línea]. Disponible: https://www.w3.org/TR/WCAG22/',
  '[8] Braille Institute of America, "Atkinson Hyperlegible Font," 2024. [En línea]. Disponible: https://brailleinstitute.org/freefont',
  '[9] Organización Mundial de la Salud, Adherence to Long-Term Therapies: Evidence for Action. Ginebra, Suiza: OMS, 2003.',
  '[10] R. T. Fielding, "Architectural Styles and the Design of Network-based Software Architectures," tesis doctoral, Univ. of California, Irvine, CA, EE. UU., 2000.',
  '[11] M. Jones, J. Bradley y N. Sakimura, "JSON Web Token (JWT)," RFC 7519, Internet Engineering Task Force, may. 2015.',
  '[12] PostgreSQL Global Development Group, "PostgreSQL 16 Documentation," 2024. [En línea]. Disponible: https://www.postgresql.org/docs/16/',
];

// =====================================================================
// Documento
// =====================================================================

const doc = new Document({
  creator: 'Emmanuel Correa Valencia y Julián Andrés Herrera Roncancio',
  title: 'Chronova. Entregable 2: Diseño',
  styles: { default: { document: { run: { font: FUENTE, size: 24 } } } },
  sections: repartirEnSecciones([
      // ---------------- Portada ----------------
      aire(1200),
      new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 120 },
        children: [t('CHRONOVA', { size: 48, bold: true, color: '000000' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 600 },
        children: [t('Aplicación móvil para la adherencia al tratamiento farmacológico', { size: 24 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 1000 },
        children: [t('CAPÍTULO 2: DISEÑO', { size: 28, bold: true })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 200 },
        children: [
          t('Emmanuel Correa Valencia', { size: 24, bold: true }),
          new TextRun({ text: 'Julián Andrés Herrera Roncancio', font: FUENTE, size: 24, bold: true, break: 1 }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 200 },
        children: [
          t('Universidad Católica Luis Amigó', { size: 24 }),
          new TextRun({ text: 'Facultad de Ingenierías y Arquitectura', font: FUENTE, size: 24, break: 1 }),
          new TextRun({ text: 'Medellín, Colombia', font: FUENTE, size: 24, break: 1 }),
          new TextRun({ text: '2026', font: FUENTE, size: 24, break: 1 }),
        ],
      }),
      salto(),

      // ================= 1. ARQUITECTURA =================
      h1('1.  Diseño de la arquitectura'),

      h2('1.1  Arquitectura general'),
      p([t('Tipo de arquitectura seleccionada: ', { bold: true }),
         t('arquitectura hexagonal (también llamada de puertos y adaptadores), organizada en capas y desplegada bajo un modelo cliente-servidor.')]),
      p('Conviene precisar los tres términos, porque describen cosas distintas del mismo sistema. El despliegue es cliente-servidor: una aplicación móvil consume una API HTTP. La organización interna del servidor es en capas. Y el criterio con que se trazaron esas capas es el de la arquitectura hexagonal, que es la decisión de diseño propiamente dicha.'),
      p([t('La regla que define la arquitectura es una sola: ', {}),
         t('las dependencias apuntan siempre hacia adentro.', { bold: true }),
         t(' Las reglas de negocio, es decir qué es una toma, cuándo se considera cumplida y quién puede ver los datos de un paciente, viven en un núcleo que no conoce a nadie: ni a la base de datos, ni al framework web, ni a la aplicación móvil. Todo lo externo se conecta a ese núcleo a través de interfaces que el propio núcleo declara.')]),
      p('Esta elección responde al problema del proyecto. Lo que aporta Chronova no es una técnica de programación, sino un conjunto de reglas clínicas: qué cuenta como toma cumplida, cuándo un olvido queda registrado sin que el paciente haga nada, qué puede ver un cuidador y con qué autorización. Aislar esas reglas permite leerlas, probarlas y discutirlas sin que estén mezcladas con sentencias SQL o con detalles del protocolo HTTP.'),
      p('La afirmación es verificable, y esa es la razón de haberla elegido. En el directorio del dominio hay treinta y nueve archivos y 3.196 líneas, y ninguno importa una sola librería externa; la capa de infraestructura, en cambio, importa express, pg, bcryptjs, jsonwebtoken y zod. La consecuencia práctica es que la aplicación completa se ejecuta sin base de datos: basta con una variable de entorno para que los mismos casos de uso trabajen contra repositorios en memoria. Es también la razón de que las 194 pruebas automatizadas terminen en menos de seis segundos.'),
      p('Las cinco capas y su responsabilidad se resumen así:'),
      tabla([1900, 3500, 3360],
        ['Capa', 'Contenido', 'Qué decide'],
        [
          ['Dominio', 'Siete entidades, siete objetos de valor y el servicio ResumenDeAdherencia', 'Si una toma se puede confirmar, si una adherencia es baja, si un código caducó'],
          ['Aplicación', 'Veinticinco casos de uso y la PoliticaDeAcceso', 'Nada de negocio: orquesta. Pide la entidad, le manda hacer algo y la guarda'],
          ['Puertos', 'Siete interfaces en la capa de aplicación y siete repositorios declarados en el dominio', 'Qué necesita la aplicación del exterior, sin decir cómo se provee'],
          ['Adaptadores de entrada', 'API HTTP con veintitrés endpoints, aplicación móvil y tarea programada', 'Cómo llega una petición hasta un caso de uso'],
          ['Adaptadores de salida', 'PostgreSQL, repositorios en memoria, bcrypt, JWT, Expo Push y correo', 'Cómo se cumple cada puerto. Traducen, no deciden'],
        ]),
      aire(),
      p([t('Un detalle de diseño que conviene señalar: ', {}),
         t('los repositorios los declara el dominio y los otros seis puertos los declara la capa de aplicación.', { bold: true }),
         t(' No es una inconsistencia. Guardar y recuperar un paciente es una necesidad de la propia entidad, que no sabría existir sin poder persistirse; enviar un correo o firmar un token son necesidades del caso de uso. La carpeta donde vive cada interfaz indica a quién le hace falta.')]),
      p('Existe además un único archivo en todo el servidor que decide qué implementación concreta se conecta a cada puerto: contenedor.ts, la raíz de composición. Solo ahí se sabe que la persistencia es PostgreSQL, que el cifrado es bcrypt y que los tokens son JWT.'),

      ...diagrama('07-componentes-hexagonal.png', 2569, 1166,
        'Figura 1. Arquitectura hexagonal del servidor. Las flechas de dependencia apuntan siempre hacia el dominio.',
        { apaisado: true,
          antes: [h2('1.2  Diagrama de arquitectura')],
          despues: [pFigura('El diagrama permite comprobar dos propiedades. La primera es que hay dos adaptadores distintos cumpliendo el mismo puerto de repositorios, PostgreSQL y en memoria, y que la aplicación funciona con cualquiera de los dos sin que el dominio cambie. La segunda es que ningún componente del dominio tiene una flecha que salga hacia una capa externa.')] }),

      h2('1.3  Stack tecnológico'),
      p('Cada elección se justifica por el problema que resuelve en este proyecto, no por popularidad.'),
      tabla([1500, 2600, 4660], ['Capa', 'Tecnología', 'Justificación'], STACK),

      // ================= 2. BASE DE DATOS =================
      ...diagrama('08-entidad-relacion.png', 2612, 1309,
        'Figura 2. Modelo entidad-relación en notación pata de gallo, con las siete tablas, sus restricciones y las decisiones de diseño anotadas.',
        { apaisado: true,
          antes: [h1('2.  Diseño de base de datos'), h2('2.1  Modelo Entidad-Relación')],
          despues: [pFigura([t('Las líneas punteadas de dispositivos y recuperaciones no son claves foráneas. ', { bold: true }),
            t('Ambas tablas tienen una columna que apunta a pacientes o a cuidadores según el valor de otra columna, y PostgreSQL no admite una clave foránea con dos destinos posibles. Es un compromiso consciente: se pierde la integridad referencial de esas dos columnas, que pasa a cuidar la aplicación, y a cambio no hacen falta cuatro tablas casi idénticas.')])] }),

      h2('2.2  Diccionario de datos'),
      p('Se documentan las siete tablas del esquema, campo por campo. Los tipos y las restricciones corresponden literalmente al archivo esquema.sql del proyecto.'),

      h3('Tabla: pacientes'),
      tabla(DIC_COLUMNAS, ['Campo', 'Tipo', 'Descripción', 'Restricciones', 'Relación'], DIC_PACIENTES, { size: 20 }),
      aire(),
      h3('Tabla: cuidadores'),
      tabla(DIC_COLUMNAS, ['Campo', 'Tipo', 'Descripción', 'Restricciones', 'Relación'], DIC_CUIDADORES, { size: 20 }),
      aire(),
      h3('Tabla: medicamentos'),
      tabla(DIC_COLUMNAS, ['Campo', 'Tipo', 'Descripción', 'Restricciones', 'Relación'], DIC_MEDICAMENTOS, { size: 20 }),
      aire(),
      h3('Tabla: tomas'),
      tabla(DIC_COLUMNAS, ['Campo', 'Tipo', 'Descripción', 'Restricciones', 'Relación'], DIC_TOMAS, { size: 20 }),
      aire(),
      h3('Tabla: vinculos'),
      tabla(DIC_COLUMNAS, ['Campo', 'Tipo', 'Descripción', 'Restricciones', 'Relación'], DIC_VINCULOS, { size: 20 }),
      aire(),
      h3('Tabla: dispositivos'),
      tabla(DIC_COLUMNAS, ['Campo', 'Tipo', 'Descripción', 'Restricciones', 'Relación'], DIC_DISPOSITIVOS, { size: 20 }),
      aire(),
      h3('Tabla: recuperaciones'),
      tabla(DIC_COLUMNAS, ['Campo', 'Tipo', 'Descripción', 'Restricciones', 'Relación'], DIC_RECUPERACIONES, { size: 20 }),
      aire(),

      h3('Relaciones principales'),
      tabla([2100, 2200, 2200, 2260], ['Relación', 'Tabla origen', 'Tabla destino', 'Tipo de relación'], RELACIONES),
      aire(),

      h3('Restricciones y reglas de integridad'),
      p([t('Claves primarias. ', { bold: true }),
         t('Las siete tablas usan UUID como clave primaria, generado por la aplicación y no por la base de datos. Esto permite que el dominio construya una entidad completa antes de guardarla, sin depender de un valor que solo existiría después de insertarla.')]),
      p([t('Claves foráneas. ', { bold: true }),
         t('Cinco relaciones se declaran con clave foránea y todas con ON DELETE CASCADE: medicamentos y tomas hacia pacientes, tomas hacia medicamentos, y vinculos hacia pacientes y cuidadores. Las de dispositivos y recuperaciones no se pueden declarar, por el motivo explicado en el apartado 2.1.')]),
      p([t('Restricciones de unicidad. ', { bold: true }),
         t('El correo es único en pacientes y en cuidadores por separado, de modo que una misma persona puede tener las dos cuentas. UNIQUE (cuidador_id, paciente_id) impide duplicar un vínculo. UNIQUE (token) en dispositivos hace que un teléfono que cambia de dueño reasigne la fila en lugar de duplicarla, lo que evitaría avisos repetidos.')]),
      p([t('UNIQUE (medicamento_id, programada_originalmente_para). ', { bold: true }),
         t('Es la restricción más interesante del esquema. Impide que la agenda de un día se duplique si dos peticiones la generan a la vez, situación real porque la aplicación consulta la agenda al abrirse. El adaptador utiliza ON CONFLICT DO NOTHING, de modo que ese choque se resuelve en la base de datos y no se convierte en un error para el usuario.')]),
      p([t('Restricciones de dominio (CHECK). ', { bold: true }),
         t('Acotan los valores posibles de estado, origen_del_registro, frecuencia_tipo, tipo_de_propietario, plataforma y solicitado_por, y garantizan que la dosis sea positiva y que el inventario no sea negativo. Duplican reglas que el dominio ya impone, a propósito: la base de datos es la última línea de defensa si algún día se escribiera en ella por otra vía.')]),
      p([t('Índices. ', { bold: true }),
         t('Seis índices sostienen las consultas frecuentes. Dos son parciales, es decir, solo indexan las filas que interesan: idx_tomas_pendientes cubre únicamente las tomas sin resolver, que es lo que revisa la tarea periódica, e idx_recuperaciones_vigentes solo las solicitudes que no se han usado.')]),
      p([t('Tipos escogidos con intención. ', { bold: true }),
         t('fecha_inicio y fecha_fin son DATE y no TIMESTAMP porque son días del calendario, no instantes: un día no se desplaza al cambiar de zona horaria. En cambio programada_para es TIMESTAMPTZ porque sí es un instante. horarios es un arreglo de texto porque un mismo tratamiento puede tener varias tomas al día. permisos y preferencias son JSONB porque son conjuntos que pueden crecer sin migrar la tabla.')]),

      salto(),
      // ================= 3. API =================
      h1('3.  Diseño de APIs o lógica de negocio (Backend)'),

      h2('3.1  Estructura de la API'),
      p([t('URL base: ', { bold: true }), t('https://[dominio-del-servicio]/api/', { }),
         t('  (en desarrollo, http://[ip-local]:4000/api/)')]),
      p('Es una API REST sobre HTTP que intercambia JSON. Está organizada en cuatro grupos de rutas que corresponden a los módulos del sistema: autenticación y cuenta, medicamentos, tomas y vinculación con cuidadores. Suma veintitrés endpoints, incluido uno de comprobación de estado.'),
      p('Cuatro convenciones se aplican de forma uniforme:'),
      p([t('Autenticación. ', { bold: true }),
         t('Salvo el registro, el inicio de sesión y la recuperación de contraseña, toda petición exige la cabecera Authorization con un token JWT. El servidor no guarda sesiones: la validez se decide comparando una fecha que el propio token transporta con la que consta en la cuenta.')]),
      p([t('Autorización. ', { bold: true }),
         t('Cuando un cuidador accede a datos de un paciente, el caso de uso consulta la PoliticaDeAcceso indicando el permiso concreto que necesita. Un cuidador sin ese permiso recibe 403, con el mismo mensaje exista o no el vínculo, para no revelar si esa persona es paciente del sistema.')]),
      p([t('Códigos de estado. ', { bold: true }),
         t('200 y 201 en las operaciones correctas, 400 cuando los datos no tienen la forma esperada, 401 sin sesión válida, 403 sin permiso, 404 cuando el recurso no existe, 409 en conflictos como un correo ya registrado y 422 cuando se incumple una regla de negocio, como confirmar una toma cuya hora aún no ha llegado.')]),
      p([t('Errores. ', { bold: true }),
         t('Todos responden con la misma forma: un objeto error con código, mensaje y, si aplica, el campo afectado. El mensaje está redactado en español para mostrarse tal cual al usuario.')]),

      h2('3.2  Endpoints principales'),
      h3('Autenticación y cuenta'),
      tabla(ENDPOINT_COLUMNAS, ENDPOINT_CABECERAS, entradaUnica(ENDPOINTS_AUTH), { size: 18, mono: [1] }),
      aire(),
      h3('Medicamentos'),
      tabla(ENDPOINT_COLUMNAS, ENDPOINT_CABECERAS, entradaUnica(ENDPOINTS_MED), { size: 18, mono: [1] }),
      aire(),
      h3('Tomas y adherencia'),
      tabla(ENDPOINT_COLUMNAS, ENDPOINT_CABECERAS, entradaUnica(ENDPOINTS_TOMAS), { size: 18, mono: [1] }),
      aire(),
      h3('Vinculación con cuidadores'),
      tabla(ENDPOINT_COLUMNAS, ENDPOINT_CABECERAS, entradaUnica(ENDPOINTS_VINC), { size: 18, mono: [1] }),
      aire(),
      p([t('Una decisión que conviene explicar: ', {}),
         t('DELETE /api/medicamentos/:id suspende el medicamento, no lo borra.', { bold: true }),
         t(' El historial de tomas se conserva porque es evidencia del tratamiento seguido; borrarlo distorsionaría el registro clínico y las estadísticas de adherencia.')]),

      h2('3.3  Reglas de validación'),
      p('La validación ocurre en dos niveles, y la distinción es deliberada. En el borde de la aplicación, esquemas de Zod comprueban la forma de los datos, es decir que el campo exista, que sea texto o que el número sea entero, y devuelven mensajes en español. En el dominio, las entidades y los objetos de valor imponen las reglas de negocio, que no se pueden rodear llamando a la API directamente.'),
      p('El motivo de duplicar es concreto: si solo se validara en el borde, cualquier otra vía de entrada (una tarea programada, un script, otro adaptador) se saltaría las reglas. Si solo se validara en el dominio, los mensajes de error serían menos útiles para quien llena un formulario.'),
      tabla([2700, 6060], ['Campo', 'Regla de validación'], VALIDACIONES),
      aire(),
      p([t('Un ejemplo de regla que vive en el dominio y no en el formulario: ', {}),
         t('una toma solo se puede confirmar a partir de sesenta minutos antes de su hora programada.', { bold: true }),
         t(' Llegar tarde se admite siempre, porque la dosis ocurrió de verdad y el sistema debe poder registrarla; adelantarse tiene límite, porque una toma que aún no ha llegado no ha ocurrido. Un cliente que ignore el botón desactivado y envíe la petición igual recibe 422.')]),

      ...diagrama('05-secuencia-confirmar-toma.png', 1932, 1486,
        'Figura 3. Confirmar una toma. Se aprecian las capas separadas, los dos caminos de error y el descuento de inventario.',
        { apaisado: true,
          antes: [
            h2('3.4  Diagrama de secuencia de operaciones principales'),
            pFigura('Se documentan los dos flujos críticos del sistema.'),
          ],
          despues: [pFigura('El primero recorre lo que ocurre desde que el paciente toca «Ya la tomé» hasta que la pantalla se actualiza. Sirve para observar la arquitectura en movimiento: el adaptador HTTP solo valida la forma, el caso de uso orquesta, y las decisiones reales las toma la entidad Toma.')] }),
      ...diagrama('06-secuencia-agenda-del-dia.png', 1654, 1085,
        'Figura 4. Generación de la agenda del día, incluida la resolución del problema de concurrencia.',
        { apaisado: true,
          despues: [pFigura('El segundo muestra cómo un patrón como «una pastilla a las 8:00 todos los días» se convierte en tomas concretas que el paciente puede confirmar, y cómo se resuelve el caso en que dos peticiones piden la agenda del mismo día simultáneamente.')] }),

      // Sin salto(): el cambio de sección que cierra la página apaisada de la
      // figura 4 ya abre página nueva, y el salto añadía una en blanco.
      // ================= 4. INTERFACES =================
      h1('4.  Diseño de interfaces (Frontend)'),

      h2('4.1  Estructura de navegación'),
      p('La aplicación presenta dos mundos distintos según el tipo de cuenta, y el enrutador decide cuál mostrar tras verificar la sesión. Un paciente nunca ve las pantallas del cuidador ni al revés.'),
      bloque([
        'index  →  ¿hay sesión?',
        '   ',
        '      NO   >  (auth)',
        '                    ingresar',
        '                    registro              elige paciente o cuidador',
        '                    recuperar             código por correo',
        '   ',
        '      PACIENTE   >  (paciente)   [pestañas inferiores]',
        '                          hoy            <   pantalla de inicio',
        '                          medicamentos',
        '                          historial',
        '                          perfil',
        '   ',
        '      CUIDADOR   >  (cuidador)',
        '                          pacientes      <   panel',
        '                                paciente/[id]   [pestañas]',
        '                                      hoy',
        '                                      tratamiento',
        '                                      historial',
        '',
        'Pantallas modales, alcanzables desde ambos mundos:',
        '  medicamento/nuevo · medicamento/[id] · privacidad',
      ]),
      aire(),
      p('La navegación por pestañas inferiores se eligió porque mantiene visibles las cuatro secciones principales sin menús desplegables ni gestos que haya que descubrir. La ficha del paciente se dividió en tres pestañas porque responden a tres preguntas que no se hacen a la vez: cómo va hoy, qué está tomando y qué ha pasado esta semana.'),
      p('Existe además una entrada por notificación: al tocar un aviso de toma sin confirmar, la aplicación abre directamente la ficha del paciente correspondiente en lugar de la pantalla de inicio.'),

      h2('4.2  Wireframes / Mockups'),
      p('Se presentan capturas de la aplicación construida en lugar de bocetos. Las pantallas están implementadas y en funcionamiento, de modo que las capturas documentan el diseño real y no una intención.'),
      ...PANTALLAS.flatMap((pan, i) => [
        h3(`Pantalla ${i + 1}: ${pan[0]}`),
        capturas(pan[1]),
        aire(120),
        p([t('Descripción. ', { bold: true }), t(pan[2])]),
        p([t('Componentes principales. ', { bold: true }), t(pan[3])]),
        p([t('Acciones posibles. ', { bold: true }), t(pan[4])]),
      ]),

      h2('4.3  Guía de estilos'),
      p('El sistema de diseño está centralizado en un único archivo del proyecto. Las decisiones no son estéticas: la revisión de literatura identifica la experiencia de usuario como la causa principal de abandono de las aplicaciones de salud entre adultos mayores, de modo que forman parte de la solución al problema planteado.'),
      tabla([2100, 6660], ['Elemento', 'Especificación'], ESTILOS),
      aire(),
      p('Dos decisiones merecen justificación aparte. La tipografía Atkinson Hyperlegible Next fue diseñada por el Braille Institute con el objetivo explícito de aumentar la legibilidad para personas con baja visión: sus letras se distinguen deliberadamente unas de otras, porque el cero lleva un corte y la ele tiene cola, justo donde otras familias las confunden. Y el texto base de 18 puntos, frente a los 14 habituales, responde al mismo criterio que las zonas táctiles de 64 píxeles.'),
      p('Las horas se muestran en formato de doce horas con a. m. y p. m. El reloj de veinticuatro horas no es de uso corriente en Colombia, y menos entre adultos mayores: «16:30» exige una conversión mental que, en una aplicación de medicación, puede traducirse en una dosis tomada a destiempo. Internamente el sistema sigue operando en formato de veinticuatro horas, que es inequívoco.'),

      salto(),
      // ================= 5. COMPONENTES =================
      h1('5.  Diseño de componentes y módulos'),
      p('La organización de las carpetas refleja la arquitectura y no al revés. En el servidor, el nombre de cada directorio de primer nivel corresponde a una capa; en la aplicación móvil se repite la misma idea a menor escala.'),

      h2('5.1  Estructura Backend'),
      bloque([
        'backend/src/',
        '    domain/                  ← las reglas. CERO dependencias externas',
        '        paciente/            Paciente, PreferenciasDeAccesibilidad, repositorio',
        '        cuidador/            Cuidador y su repositorio',
        '        medicamento/         Medicamento, Dosis, Stock, Frecuencia',
        '        toma/                Toma, ResumenDeAdherencia',
        '        vinculo/             Vinculo y sus permisos',
        '        dispositivo/         Dispositivo, TokenDeDispositivo',
        '        recuperacion/        SolicitudDeRecuperacion, CodigoDeRecuperacion',
        '        shared/              Email, Telefono, Hora, FechaLocal, ZonaHoraria,',
        '                             Identificador, AutorizacionDeDatos, errores',
        '',
        '    application/',
        '        use-cases/           25 casos de uso, agrupados por módulo',
        '            auth/            registro, sesión, perfil, recuperación, dispositivos',
        '            medicamentos/    registrar, listar, actualizar, suspender, reabastecer',
        '            tomas/           agenda, registrar toma, historial, cerrar vencidas',
        '            cuidadores/      vínculos, permisos, panel',
        '        ports/               7 interfaces: Reloj, Notificador, Cifrador,',
        '                             ServicioDeTokens, GeneradorDeIds, Correo, Codigos',
        '        services/            PoliticaDeAcceso, políticas de contraseña y datos',
        '',
        '    infrastructure/          ← aquí sí viven express, pg, bcrypt, jwt',
        '        http/                rutas, DTOs de Zod, middlewares',
        '        persistence/         postgres/ y in-memory/',
        '        security/            CifradorBcrypt, ServicioDeTokensJwt',
        '        notificaciones/      ExpoPush, consola, compuesto',
        '        correo/              Resend y consola',
        '',
        '    config/                  lectura y validación de variables de entorno',
        '    contenedor.ts            ← raíz de composición',
        '    main.ts                  arranque del servidor y tarea periódica',
        '',
        'backend/tests/               194 pruebas: dominio, casos de uso y HTTP',
      ]),
      aire(),
      p('La diferencia con la estructura convencional de controladores, modelos y servicios es deliberada. En aquella, los modelos suelen ser reflejos de tablas y la lógica termina repartida entre controladores y servicios. Aquí el dominio contiene comportamiento, no solo datos: Toma sabe si puede confirmarse, Vinculo sabe qué autoriza y Medicamento sabe si aplica en un día determinado.'),

      h2('5.2  Estructura Frontend'),
      bloque([
        'mobile/',
        '    app/                     ← pantallas. El enrutador usa el sistema de archivos',
        '        (auth)/              ingresar, registro, recuperar',
        '        (paciente)/          hoy, medicamentos, historial, perfil',
        '        (cuidador)/          pacientes, paciente/[id]/{hoy,tratamiento,historial}',
        '        medicamento/         nuevo, [id]',
        '        privacidad.tsx',
        '        _layout.tsx          proveedores globales y pila de navegación',
        '',
        '    src/',
        '        dominio/             modelos, puertos, política de datos',
        '        infraestructura/',
        '            api/             ClienteChronova (la única pieza que sabe de HTTP)',
        '            almacenamiento/  sesión persistida en el dispositivo',
        '            notificaciones/  alarmas locales',
        '        ui/',
        '            componentes/     básicos, Icono, Logo, FormularioDeMedicamento',
        '            contexto/        SesionContexto, PacienteObservadoContexto',
        '            tema.ts          colores, tipografía, espaciado',
        '            hora.ts          presentación de horas en a. m. / p. m.',
        '',
        '    assets/                  icono, pantalla de inicio, logotipo',
      ]),
      aire(),
      p('La aplicación móvil repite el criterio del servidor: las pantallas dependen de un puerto llamado ApiDeChronova, no del cliente HTTP. Ninguna pantalla sabe que existe fetch, ni una URL, ni un código de estado. Y los nombres del dominio son los mismos en las dos partes y en los documentos, de modo que no haga falta traducir nada mentalmente al pasar de una capa a otra.'),

      h2('5.3  Módulos principales y sus responsabilidades'),
      tabla([2650, 3850, 2260], ['Módulo / Componente', 'Responsabilidad', 'Dependencias'], MODULOS),

      // El diagrama de clases es alto y estrecho: ocupa una página entera él
      // solo. Por eso el texto que lo comenta va ANTES y no después; si va
      // después queda huérfano en una página casi vacía.
      h2('5.4  Diagrama de clases (Backend)'),
      p('Dos tipos de relación aparecen en el diagrama y conviene distinguirlas. La composición, con rombo relleno, indica que Medicamento contiene su Dosis, su Stock y su Frecuencia: si el medicamento desaparece, esos objetos desaparecen con él porque no tienen sentido solos. La agregación, con rombo vacío, indica que Paciente agrega Medicamento, que tiene identidad propia y su propio ciclo de vida.'),
      p('Los objetos de valor merecen atención porque son la pieza que evita la mayor parte de las validaciones repartidas. Un Email no es una cadena de texto: es una clase que no se puede construir con un valor inválido. En consecuencia, cualquier función que reciba un Email no necesita validarlo, porque ya es válido por construcción.'),
      ...diagrama('03-clases-dominio.png', 1576, 2716,
        'Figura 5. Clases del dominio: siete entidades, sus objetos de valor, el servicio ResumenDeAdherencia y las enumeraciones.'),

      ...diagrama('09-componentes-frontend.png', 2041, 933,
        'Figura 6. Componentes de la aplicación móvil y su jerarquía de dependencias.',
        { apaisado: true,
          antes: [h2('5.5  Diagrama de componentes (Frontend)')],
          despues: [pFigura('El estado compartido vive en contextos y no en las pantallas. SesionContexto guarda quién inició sesión y sus preferencias, y envuelve toda la aplicación. PacienteObservadoContexto existe por una razón concreta: las tres pestañas de la ficha del paciente necesitan los mismos datos, de modo que se cargan una sola vez y las pestañas únicamente presentan. Sin él serían tres veces las mismas peticiones y tres lugares donde repetir la comprobación de permisos.')] }),

      // Sin salto(), por lo mismo: viene de la página apaisada de la figura 6.
      // ================= REFERENCIAS =================
      h1('Referencias'),
      p('Referencias en formato IEEE.'),
      ...REFERENCIAS.map((r) => new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 140, line: 260 },
        indent: { left: 400, hanging: 400 },
        children: [t(r, { size: 20 })],
      })),
  ]),
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync('/home/claude/chronova/docs/Chronova-Entregable2-Diseno.docx', buffer);
  console.log('Entregable 2 generado');
});
