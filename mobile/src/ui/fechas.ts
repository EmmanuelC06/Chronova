const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/**
 * Una fecha AAAA-MM-DD como se escribe en Colombia.
 *
 * "2026-04-15" es correcto y es ilegible. Aparece en la pantalla de
 * analítica y en el reporte impreso, y en los dos sitios lo lee alguien
 * que no trabaja con bases de datos.
 *
 * Se arma a mano, y hay dos razones.
 *
 * `toLocaleDateString` depende de los datos de idioma que traiga el
 * motor del teléfono, y en Android eso varía: el mismo reporte saldría
 * en inglés en unos equipos y en español en otros.
 *
 * Y `new Date('2026-04-15')` interpreta esa cadena como UTC. En Colombia
 * eso devuelve el día anterior, así que el período entero aparecería
 * corrido un día. Partir la cadena evita las dos cosas.
 */
export function fechaEnPalabras(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  const nombre = MESES[Number(mes) - 1];
  if (!nombre || !dia || !anio) return fecha;
  return `${Number(dia)} de ${nombre} de ${anio}`;
}
