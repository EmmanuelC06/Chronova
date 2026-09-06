/**
 * Presentación de horas.
 *
 * Chronova guarda y transmite las horas en formato de 24 horas
 * (`"20:00"`), que es inequívoco, ordenable y no depende del idioma. Pero
 * **eso no es lo que se le enseña a la persona.**
 *
 * En Colombia, y sobre todo entre adultos mayores, el reloj de 24 horas
 * no es de uso corriente: «16:30» obliga a una resta mental que mucha
 * gente no hace, y en una aplicación de medicación una hora que no se
 * entiende a la primera es una dosis que se toma tarde o no se toma. Es
 * el mismo criterio que el cuerpo de 18 pt o los botones de 64 px, no una
 * preferencia estética.
 *
 * Por qué está escrito a mano en vez de usar `toLocaleTimeString`:
 * React Native corre sobre Hermes, y el soporte de `Intl` y de datos de
 * idioma **varía entre Android, iOS y las versiones del motor**. Un
 * formateo que dependa de eso puede salir en inglés —«8:00 PM»— en unos
 * teléfonos y en español en otros, sin ningún error que lo delate. Aquí
 * el resultado es el mismo en todas partes y se puede probar.
 */

/**
 * De `"20:00"` a `"8:00 p. m."`.
 *
 * Se escribe «p. m.» con puntos y espacio, que es la forma que recoge la
 * RAE, y no «PM»: en mayúsculas se lee como una sigla en inglés.
 *
 * Si la entrada no tiene forma de hora se devuelve tal cual. Una hora
 * rara en pantalla es un defecto visible; una excepción a media pantalla
 * es una pantalla en blanco.
 */
export function formatearHora(hora24: string | null | undefined): string {
  const partes = /^(\d{1,2}):(\d{2})$/.exec((hora24 ?? '').trim());
  if (!partes) return hora24 ?? '';

  const horas = Number(partes[1]);
  const minutos = partes[2]!;
  if (horas > 23 || Number(minutos) > 59) return hora24 ?? '';

  // El mediodía es 12 p. m. y la medianoche 12 a. m. Es la convención que
  // la gente usa; "0:00" o "12 m." serían correctos y nadie los lee.
  const sufijo = horas < 12 ? 'a. m.' : 'p. m.';
  const enDoce = horas % 12 === 0 ? 12 : horas % 12;

  return `${enDoce}:${minutos} ${sufijo}`;
}

/**
 * Igual, pero pensado para que lo lea un lector de pantalla.
 *
 * «8:00 p. m.» se lee mal en voz alta: los puntos se pronuncian o se
 * saltan según el motor de voz, y «p. m.» puede salir deletreado. En
 * palabras no hay ambigüedad posible.
 */
export function horaEnPalabras(hora24: string | null | undefined): string {
  const partes = /^(\d{1,2}):(\d{2})$/.exec((hora24 ?? '').trim());
  if (!partes) return hora24 ?? '';

  const horas = Number(partes[1]);
  const minutos = Number(partes[2]);
  if (horas > 23 || minutos > 59) return hora24 ?? '';

  const enDoce = horas % 12 === 0 ? 12 : horas % 12;

  // Los tramos son los que usa la gente al hablar, no los que salen de
  // dividir el dia en dos. "12 de la manana" para la medianoche es lo
  // que devolveria un a. m./p. m. traducido sin pensar, y no lo dice
  // nadie.
  const momento =
    horas === 0
      ? 'de la noche'
      : horas < 6
        ? 'de la madrugada'
        : horas < 12
          ? 'de la manana'
          : horas === 12
            ? 'del mediodia'
            : horas < 19
              ? 'de la tarde'
              : 'de la noche';

  if (minutos === 0) return `${enDoce} ${momento}`;
  return `${enDoce} y ${minutos} ${momento}`;
}

/**
 * De `"8:30"` más a. m./p. m. al `"20:30"` que entiende el servidor.
 *
 * Devuelve `null` si la hora no es válida, para que quien llame decida
 * qué decirle a la persona.
 */
export function aHoraDe24(horaEnDoce: string, meridiano: 'AM' | 'PM'): string | null {
  const partes = /^(\d{1,2})[:.\s]?(\d{2})?$/.exec(horaEnDoce.trim());
  if (!partes) return null;

  const horas = Number(partes[1]);
  const minutos = Number(partes[2] ?? '0');
  // En el reloj de 12 horas no existe el 0: la medianoche es "12 a. m.".
  if (horas < 1 || horas > 12 || minutos > 59) return null;

  const base = horas % 12;
  const enVeinticuatro = meridiano === 'PM' ? base + 12 : base;

  return `${String(enVeinticuatro).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}
