import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { Analitica, CeldaDeRiesgo, Franja } from '../dominio/modelos';
import { fechaEnPalabras } from './fechas';
import { colores } from './tema';

/**
 * EL REPORTE: lo que se le lleva al médico.
 *
 * Por qué se comparte desde el teléfono y no lo envía el servidor
 * ---------------------------------------------------------------
 * El otro camino era la WhatsApp Business API: que Chronova mandara el
 * mensaje sola. Se descartó por tres razones, y la tercera es la que
 * manda.
 *
 * Exige una cuenta de Meta Business verificada y plantillas aprobadas
 * por Meta, que es un trámite de semanas. El número de prueba gratuito
 * solo alcanza a un puñado de destinatarios registrados a mano. Y, sobre
 * todo, haría pasar datos de salud por los servidores de Meta bajo la
 * cuenta del proyecto: eso convierte a Meta en un encargado del
 * tratamiento que habría que declarar en la política, con transferencia
 * internacional incluida.
 *
 * Compartiendo desde el teléfono no hay encargado nuevo, no hay trámite
 * y no hay costo. Pero lo importante es otra cosa: **es el paciente
 * quien decide a quién le enseña sus datos**, que es exactamente el
 * modelo de consentimiento sobre el que está construida toda la app. El
 * camino barato resultó ser también el correcto.
 *
 * Por qué un PDF y no un mensaje de texto
 * ---------------------------------------
 * Porque un médico con quince minutos de consulta mira un documento y no
 * lee un chat. Y porque el PDF se guarda, se imprime y se adjunta a una
 * historia clínica; un mensaje se pierde en la conversación.
 */

const NOMBRE_DE_FRANJA: Record<Franja, string> = {
  MADRUGADA: 'Madrugada',
  MANANA: 'Mañana',
  TARDE: 'Tarde',
  NOCHE: 'Noche',
};

const ORDEN_DE_DIAS = [1, 2, 3, 4, 5, 6, 0];
const INICIAL_DE_DIA: Record<number, string> = {
  0: 'D',
  1: 'L',
  2: 'M',
  3: 'X',
  4: 'J',
  5: 'V',
  6: 'S',
};

export async function compartirReporte(
  analitica: Analitica,
  nombreDelPaciente?: string,
): Promise<void> {
  const { uri } = await Print.printToFileAsync({
    html: construirHtml(analitica, nombreDelPaciente),
  });

  // Puede no haber a dónde compartir (un emulador limpio, por ejemplo).
  // Mejor decirlo que dejar que no pase nada al tocar el botón.
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error(
      'Este teléfono no tiene con qué compartir el archivo. El reporte se generó igual.',
    );
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Enviar mi reporte',
    UTI: 'com.adobe.pdf',
  });
}

/**
 * El HTML del que sale el PDF.
 *
 * Va todo en un archivo y con los estilos en línea porque `expo-print`
 * renderiza una cadena suelta: no hay hoja de estilos que cargar ni
 * fuentes que descargar. Los colores se toman del tema de la app para
 * que el documento se reconozca como de Chronova.
 */
export function construirHtml(analitica: Analitica, nombreDelPaciente?: string): string {
  const { resumen, mapaDeRiesgo, evidencia } = analitica;
  const titulo = nombreDelPaciente
    ? `Reporte de adherencia · ${escapar(nombreDelPaciente)}`
    : 'Mi reporte de adherencia';

  const hallazgos =
    mapaDeRiesgo.hallazgos.length > 0
      ? `<ul>${mapaDeRiesgo.hallazgos.map((h) => `<li>${escapar(h.texto)}</li>`).join('')}</ul>`
      : '<p class="suave">No se encontraron franjas que se repitan como problemáticas.</p>';

  /*
    Las curiosidades NO van en el reporte, aunque la pantalla las tenga
    al lado y fuera gratis incluirlas.

    Dos razones. La primera es que no le sirven a quien lo lee: "tu mejor
    racha, 23 días" no cambia ninguna decisión en una consulta, y cada
    línea que no cambia una decisión le quita atención a las que sí.

    La segunda la enseñó el propio documento al imprimirlo. Las
    curiosidades están escritas en segunda persona porque en el teléfono
    las lee la propia persona; impresas en una hoja que va a manos del
    médico, "qué tan puntual eres" le habla a quien no es. Se podía
    reescribir cada frase, pero la pregunta correcta era si debían estar,
    y no debían.
  */

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<style>
  @page { margin: 18mm 16mm; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: ${colores.texto};
         font-size: 11pt; line-height: 1.5; }
  h1 { font-size: 19pt; margin: 0 0 2mm; color: ${colores.primario}; }
  h2 { font-size: 12pt; margin: 8mm 0 2mm; color: ${colores.primario};
       border-bottom: 1px solid ${colores.borde}; padding-bottom: 1.5mm; }
  .meta { color: ${colores.textoSuave}; font-size: 9.5pt; margin: 0 0 6mm; }
  .cifra { font-size: 30pt; font-weight: 700; color: ${colores.primario}; line-height: 1; }
  .suave { color: ${colores.textoSuave}; }
  table { border-collapse: collapse; width: 100%; }
  td, th { padding: 1.6mm 2mm; font-size: 10pt; }
  .et { color: ${colores.textoSuave}; width: 55%; }
  .mapa td { text-align: center; border: 1px solid #fff; border-radius: 2px;
             width: 11%; font-size: 8.5pt; }
  .mapa th { font-size: 8.5pt; color: ${colores.textoSuave}; text-align: center; }
  .mapa .franja { text-align: left; color: ${colores.textoSuave}; width: 16%; border: none; }
  .nota { margin-top: 9mm; padding-top: 3mm; border-top: 1px solid ${colores.borde};
          font-size: 8.5pt; color: ${colores.textoSuave};
          /* La advertencia no se parte entre dos hojas: si la segunda
             mitad se queda en la pagina siguiente, el documento parece
             terminar sin ella. */
          page-break-inside: avoid; break-inside: avoid; }
  ul { margin: 0; padding-left: 5mm; }
</style></head>
<body>
  <h1>${titulo}</h1>
  <p class="meta">Período del ${escapar(fechaEnPalabras(analitica.desde))} al
     ${escapar(fechaEnPalabras(analitica.hasta))} ·
     ${evidencia.tomasResueltas} tomas registradas · Generado por Chronova</p>

  <h2>Cumplimiento</h2>
  <p><span class="cifra">${resumen.porcentaje}%</span>
     <span class="suave"> de las tomas del período</span></p>
  <table>
    <tr><td class="et">Tomas confirmadas</td><td>${resumen.tomadas}</td></tr>
    <tr><td class="et">Tomas que se quedaron</td><td>${resumen.omitidas}</td></tr>
    <tr><td class="et">Confirmadas dentro del horario</td><td>${resumen.porcentajeDePuntualidad}%</td></tr>
  </table>

  <h2>Cuándo se quedan las tomas</h2>
  ${hallazgos}
  ${tablaDelMapa(mapaDeRiesgo.celdas)}

  <p class="nota">
    Este documento lo genera Chronova a partir de los registros que la propia persona
    confirmó en la aplicación. Describe el cumplimiento del horario de las tomas:
    <strong>no es un diagnóstico, no evalúa el tratamiento y no sustituye el criterio de un
    profesional de la salud</strong>. Las franjas señaladas son patrones de conducta
    calculados sobre el propio historial, con suavizado estadístico para no sacar
    conclusiones de pocos datos.
  </p>
</body></html>`;
}

/** El mismo mapa de la pantalla, en una tabla que el PDF sepa dibujar. */
function tablaDelMapa(celdas: CeldaDeRiesgo[]): string {
  const franjas: Franja[] = ['MADRUGADA', 'MANANA', 'TARDE', 'NOCHE'];

  const filas = franjas
    .map((franja) => {
      const casillas = ORDEN_DE_DIAS.map((dia) => {
        const celda = celdas.find((c) => c.franja === franja && c.diaDeLaSemana === dia);
        if (!celda || celda.observaciones === 0) {
          return `<td style="background:#fff;color:#ccc">·</td>`;
        }
        const fondo =
          celda.riesgo >= 0.3
            ? colores.peligro
            : celda.riesgo >= 0.15
              ? colores.advertenciaSuave
              : colores.exitoSuave;
        const tinta = celda.riesgo >= 0.3 ? '#fff' : colores.texto;
        // La cifra cruda dentro de la casilla: en papel no hay forma de
        // tocar nada para ver el detalle, asi que el detalle va impreso.
        return `<td style="background:${fondo};color:${tinta}">${celda.omitidas}/${celda.observaciones}</td>`;
      }).join('');
      return `<tr><td class="franja">${NOMBRE_DE_FRANJA[franja]}</td>${casillas}</tr>`;
    })
    .join('');

  const cabecera = ORDEN_DE_DIAS.map((d) => `<th>${INICIAL_DE_DIA[d]}</th>`).join('');

  return `<table class="mapa" style="margin-top:3mm">
    <tr><th class="franja"></th>${cabecera}</tr>
    ${filas}
  </table>
  <p class="suave" style="font-size:8.5pt;margin-top:2mm">
    Cada casilla muestra cuántas tomas se quedaron de cuántas programadas.
  </p>`;
}

/**
 * Escapa el texto que entra al HTML.
 *
 * El nombre del paciente y los textos de los hallazgos vienen de datos,
 * y un nombre con un signo de menor que rompería el documento. Es barato
 * y evita un fallo que solo aparecería con el usuario que lo tenga.
 */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
