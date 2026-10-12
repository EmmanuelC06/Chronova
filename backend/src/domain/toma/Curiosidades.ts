import type { ZonaHoraria } from '../shared/ZonaHoraria.js';
import type { Toma } from './Toma.js';
import {
  NOMBRE_DE_DIA,
  NOMBRE_DE_DIA_PLURAL,
  NOMBRE_DE_FRANJA,
  franjaDeLaHora,
  type Franja,
} from './MapaDeRiesgo.js';

export interface Curiosidad {
  /** Clave estable, para que la app elija icono sin mirar el texto. */
  clave: string;
  titulo: string;
  /** El dato en grande. Puede ser un numero o una palabra corta. */
  valor: string;
  /** La frase que lo explica. */
  detalle: string;
}

/**
 * CURIOSIDADES: la historia de la propia persona, contada con sus datos.
 *
 * Por que esto y no datos sobre medicamentos
 * ------------------------------------------
 * Porque funciona mejor y porque no tiene riesgo.
 *
 * Lo que funciona: en mayores de 65 años, las rachas aumentan el uso de
 * una app un 26,5% y las tablas de posiciones un 62,5%, mientras que los
 * premios lo BAJAN un 12,8%. A esta edad no motivan los puntos; motiva
 * ver la propia historia. Son datos de uso real sobre 250 personas, no
 * una intuicion de diseño.
 *
 * Lo que no tiene riesgo: estas tarjetas hablan de lo que la persona
 * hizo, nunca de su enfermedad ni de su tratamiento. "Llevas 23 dias
 * seguidos" es conducta. "Tu presion deberia estar mejor" seria otra
 * cosa, y nos sacaria del terreno en el que una app de recordatorios
 * puede moverse.
 *
 * La regla de redaccion
 * ---------------------
 * Ninguna tarjeta regaña. Una persona que lleva tres semanas fallando ya
 * lo sabe; recordarselo con una medalla invertida no la ayuda a tomarse
 * la pastilla. Cuando no hay nada bueno que decir, se dice lo neutro.
 */
export class Curiosidades {
  private constructor(readonly lista: readonly Curiosidad[]) {}

  static desdeTomas(
    tomas: readonly Toma[],
    zona: ZonaHoraria,
    ventanaDeToleranciaEnMinutos: number,
  ): Curiosidades {
    const resueltas = tomas
      .filter((t) => t.estado === 'TOMADA' || t.estado === 'OMITIDA')
      .slice()
      .sort(
        (a, b) =>
          a.programadaOriginalmentePara.getTime() - b.programadaOriginalmentePara.getTime(),
      );

    if (resueltas.length === 0) return new Curiosidades([]);

    const lista: Curiosidad[] = [];
    const tomadas = resueltas.filter((t) => t.estado === 'TOMADA');

    // ---- Total acumulado ----
    lista.push({
      clave: 'TOTAL',
      titulo: 'Tomas confirmadas',
      valor: String(tomadas.length),
      detalle:
        tomadas.length === 1
          ? 'Esta es la primera que queda registrada.'
          : `Son ${tomadas.length} veces que te acordaste. Cada una cuenta.`,
    });

    // ---- Rachas ----
    const { mejor, actual } = rachasDeDias(resueltas, zona);

    if (mejor > 0) {
      lista.push({
        clave: 'MEJOR_RACHA',
        titulo: 'Tu mejor racha',
        valor: mejor === 1 ? '1 día' : `${mejor} días`,
        detalle:
          mejor === 1
            ? 'Un día completo sin que se te quedara ninguna.'
            : `${mejor} días seguidos sin que se te quedara ninguna toma.`,
      });
    }

    if (actual > 0) {
      lista.push({
        clave: 'RACHA_ACTUAL',
        titulo: 'Racha actual',
        valor: actual === 1 ? '1 día' : `${actual} días`,
        detalle:
          actual >= mejor && mejor > 1
            ? 'Estás en tu mejor racha hasta ahora.'
            : 'Vas sumando. La racha se mantiene mientras no se quede ninguna.',
      });
    }

    // ---- Puntualidad ----
    const desfases = tomadas
      .map((t) => t.minutosDeDesfase())
      .filter((m): m is number => m !== null);

    if (desfases.length >= 5) {
      const medio = Math.round(
        desfases.reduce((suma, m) => suma + Math.abs(m), 0) / desfases.length,
      );
      lista.push({
        clave: 'PUNTUALIDAD',
        titulo: 'Qué tan puntual eres',
        valor: medio === 0 ? 'A la hora' : `${medio} min`,
        detalle:
          medio === 0
            ? 'En promedio confirmas tus tomas justo a la hora programada.'
            : `En promedio confirmas tus tomas a ${medio} minutos de la hora programada. ` +
              `El margen que maneja la aplicación es de ${ventanaDeToleranciaEnMinutos}.`,
      });
    }

    // ---- El dia mas fiable ----
    const porDia = contarPorClave(resueltas, (t) =>
      String(zona.fechaLocalDe(t.programadaOriginalmentePara).diaDeLaSemana),
    );
    const mejorDia = claveConMenorFallo(porDia);
    if (mejorDia !== null) {
      const indice = Number(mejorDia);
      lista.push({
        clave: 'MEJOR_DIA',
        titulo: 'Tu mejor día',
        valor: NOMBRE_DE_DIA[indice] ?? '',
        detalle: `Los ${NOMBRE_DE_DIA_PLURAL[indice]} son los días en que menos se te quedan.`,
      });
    }

    // ---- La franja mas fiable ----
    const porFranja = contarPorClave(resueltas, (t) =>
      franjaDeLaHora(Number(zona.horaDePareDe(t.programadaOriginalmentePara).slice(0, 2))),
    );
    const mejorFranja = claveConMenorFallo(porFranja);
    if (mejorFranja !== null) {
      lista.push({
        clave: 'MEJOR_FRANJA',
        titulo: 'Tu mejor momento',
        valor: NOMBRE_DE_FRANJA[mejorFranja as Franja],
        detalle: 'Es la franja del día en la que más seguido confirmas tus tomas.',
      });
    }

    // ---- Cuanto tiempo lleva ----
    const primera = resueltas[0];
    const ultima = resueltas[resueltas.length - 1];
    if (primera && ultima) {
      const dias =
        zona
          .fechaLocalDe(primera.programadaOriginalmentePara)
          .diasHasta(zona.fechaLocalDe(ultima.programadaOriginalmentePara)) + 1;
      if (dias >= 7) {
        lista.push({
          clave: 'ANTIGUEDAD',
          titulo: 'Llevas registrando',
          valor: dias >= 60 ? `${Math.round(dias / 30)} meses` : `${dias} días`,
          detalle: 'Ese registro es lo que le puedes mostrar a tu médico en la próxima cita.',
        });
      }
    }

    return new Curiosidades(lista);
  }

  toJSON() {
    return this.lista;
  }
}

/**
 * Rachas de DIAS completos sin ninguna omision.
 *
 * Se cuentan por dia y no por toma a proposito: "llevo 12 tomas
 * seguidas" no significa nada para quien toma tres al dia, y ademas
 * premiaria a quien toma mas medicamentos. Un dia limpio es un dia
 * limpio para todo el mundo, y es como la gente cuenta estas cosas.
 *
 * La racha actual cuenta hacia atras desde el ultimo dia con registro, y
 * no desde hoy: si alguien no ha tomado nada en dos dias porque el
 * tratamiento terminó, su racha no deberia desaparecer por eso.
 */
function rachasDeDias(
  resueltas: readonly Toma[],
  zona: ZonaHoraria,
): { mejor: number; actual: number } {
  const porDia = new Map<string, boolean>(); // fecha -> ¿dia limpio?

  for (const toma of resueltas) {
    const fecha = zona.fechaLocalDe(toma.programadaOriginalmentePara).toString();
    const limpioHastaAhora = porDia.get(fecha) ?? true;
    porDia.set(fecha, limpioHastaAhora && toma.estado === 'TOMADA');
  }

  const fechas = [...porDia.keys()].sort();
  let mejor = 0;
  let corriendo = 0;

  for (const fecha of fechas) {
    if (porDia.get(fecha)) {
      corriendo += 1;
      if (corriendo > mejor) mejor = corriendo;
    } else {
      corriendo = 0;
    }
  }

  // `corriendo` acaba valiendo la racha que llega hasta el ultimo dia
  // con datos, que es justo la racha actual.
  return { mejor, actual: corriendo };
}

function contarPorClave(
  resueltas: readonly Toma[],
  clave: (toma: Toma) => string,
): Map<string, { total: number; omitidas: number }> {
  const mapa = new Map<string, { total: number; omitidas: number }>();

  for (const toma of resueltas) {
    const k = clave(toma);
    const actual = mapa.get(k) ?? { total: 0, omitidas: 0 };
    actual.total += 1;
    if (toma.estado === 'OMITIDA') actual.omitidas += 1;
    mapa.set(k, actual);
  }

  return mapa;
}

/**
 * La clave con menor tasa de fallo, exigiendo un minimo de datos.
 *
 * Sin el minimo, un dia con una sola toma confirmada ganaria siempre con
 * un 0% de fallo perfecto, y la tarjeta diria que el mejor dia es aquel
 * en el que la persona casi no toma nada.
 */
function claveConMenorFallo(
  mapa: Map<string, { total: number; omitidas: number }>,
  minimo = 5,
): string | null {
  let mejorClave: string | null = null;
  let mejorTasa = Number.POSITIVE_INFINITY;

  for (const [clave, { total, omitidas }] of mapa) {
    if (total < minimo) continue;
    const tasa = omitidas / total;
    if (tasa < mejorTasa) {
      mejorTasa = tasa;
      mejorClave = clave;
    }
  }

  return mejorClave;
}
