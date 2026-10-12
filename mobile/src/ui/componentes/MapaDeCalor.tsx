import { View } from 'react-native';

import type { CeldaDeRiesgo, Franja } from '../../dominio/modelos';
import { Texto } from './basicos';
import { colores, espacio, radio } from '../tema';

const FRANJAS: readonly Franja[] = ['MADRUGADA', 'MANANA', 'TARDE', 'NOCHE'];

const NOMBRE_CORTO_DE_FRANJA: Record<Franja, string> = {
  MADRUGADA: 'Madrug.',
  MANANA: 'Mañana',
  TARDE: 'Tarde',
  NOCHE: 'Noche',
};

const NOMBRE_DE_FRANJA: Record<Franja, string> = {
  MADRUGADA: 'madrugada',
  MANANA: 'mañana',
  TARDE: 'tarde',
  NOCHE: 'noche',
};

/** Lunes primero: es como se lee una semana, aunque el servidor use 0 = domingo. */
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
const NOMBRE_DE_DIA: Record<number, string> = {
  0: 'domingo',
  1: 'lunes',
  2: 'martes',
  3: 'miércoles',
  4: 'jueves',
  5: 'viernes',
  6: 'sábado',
};

/**
 * MAPA DE CALOR: cuándo se le quedan las tomas a esta persona.
 *
 * Decisiones que no son estéticas
 * -------------------------------
 * **Cuatro colores y no un degradado.** Un degradado continuo obliga a
 * comparar tonos, que es justo lo que peor hace el ojo, y encima falla
 * para quien no distingue bien los colores. Cuatro escalones se leen de
 * un vistazo.
 *
 * **El color NUNCA va solo.** Cada casilla con riesgo alto lleva además
 * un punto, y cada una tiene su etiqueta para el lector de pantalla con
 * el día, la franja y las cifras. Es el RNF-04 del proyecto, y aquí
 * importa más que en ninguna otra pantalla: un mapa de calor es la forma
 * más fácil de construir una interfaz que solo funciona si ves bien.
 *
 * **Las casillas sin datos se dibujan vacías, no en verde.** Pintar de
 * verde una franja en la que la persona no toma nada diría que ahí va
 * perfecto, y lo que pasa es que ahí no pasa nada.
 */
export function MapaDeCalor({ celdas }: { celdas: CeldaDeRiesgo[] }) {
  const buscar = (franja: Franja, dia: number) =>
    celdas.find((c) => c.franja === franja && c.diaDeLaSemana === dia);

  return (
    <View style={{ gap: espacio.xs }}>
      {/* Cabecera con las iniciales de los días */}
      <View style={{ flexDirection: 'row', gap: 3 }}>
        <View style={{ width: 62 }} />
        {ORDEN_DE_DIAS.map((dia) => (
          <View key={dia} style={{ flex: 1, alignItems: 'center' }}>
            <Texto variante="pequeno" peso="semi" color={colores.textoTenue}>
              {INICIAL_DE_DIA[dia]}
            </Texto>
          </View>
        ))}
      </View>

      {FRANJAS.map((franja) => (
        <View key={franja} style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
          <View style={{ width: 62 }}>
            <Texto variante="pequeno" color={colores.textoSuave}>
              {NOMBRE_CORTO_DE_FRANJA[franja]}
            </Texto>
          </View>

          {ORDEN_DE_DIAS.map((dia) => {
            const celda = buscar(franja, dia);
            const estilo = estiloDeCelda(celda);

            return (
              <View
                key={`${franja}-${dia}`}
                accessible
                accessibilityLabel={etiquetaDe(celda, franja, dia)}
                style={{
                  flex: 1,
                  aspectRatio: 1,
                  borderRadius: radio.sm,
                  backgroundColor: estilo.fondo,
                  borderWidth: estilo.borde ? 1 : 0,
                  borderColor: colores.borde,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/*
                  El punto es la redundancia que hace que esto funcione
                  sin distinguir colores. Solo aparece donde hay algo que
                  mirar, para no convertir el mapa en una cuadrícula de
                  puntos sin significado.
                */}
                {estilo.punto ? (
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: colores.textoInverso,
                    }}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      ))}

      <Leyenda />
    </View>
  );
}

function Leyenda() {
  const escalones = [
    { fondo: colores.exitoSuave, texto: 'Bien' },
    { fondo: colores.advertenciaSuave, texto: 'Regular' },
    { fondo: colores.peligro, texto: 'Se quedan' },
  ];

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: espacio.sm,
        marginTop: espacio.xs,
        alignItems: 'center',
      }}
    >
      {escalones.map((e) => (
        <View key={e.texto} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              backgroundColor: e.fondo,
            }}
          />
          <Texto variante="pequeno" color={colores.textoSuave}>
            {e.texto}
          </Texto>
        </View>
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 3,
            borderWidth: 1,
            borderColor: colores.borde,
          }}
        />
        <Texto variante="pequeno" color={colores.textoSuave}>
          Sin tomas
        </Texto>
      </View>
    </View>
  );
}

/**
 * Los cuatro escalones.
 *
 * Los cortes son 15% y 30% de riesgo. No salen de ninguna norma clínica
 * y no pretenden salir: son los que separan "va bien" de "conviene
 * mirarlo" en una conducta, y están puestos donde se ven distintos en
 * pantalla.
 */
function estiloDeCelda(celda: CeldaDeRiesgo | undefined): {
  fondo: string;
  punto: boolean;
  borde: boolean;
} {
  if (!celda || celda.observaciones === 0) {
    return { fondo: 'transparent', punto: false, borde: true };
  }
  if (celda.riesgo >= 0.3) return { fondo: colores.peligro, punto: true, borde: false };
  if (celda.riesgo >= 0.15) {
    return { fondo: colores.advertenciaSuave, punto: false, borde: false };
  }
  return { fondo: colores.exitoSuave, punto: false, borde: false };
}

/**
 * Lo que lee TalkBack al tocar una casilla.
 *
 * Dice las cifras crudas y no el porcentaje suavizado: para alguien que
 * navega a ciegas, "3 de 12" es comprobable y "riesgo 0,24" no significa
 * nada.
 *
 * Y lo dice sin "te": este mismo mapa lo ve el paciente y lo ve su
 * cuidador, y una etiqueta en segunda persona le hablaria del paciente
 * al cuidador como si fuera de el. La frase neutra sirve para los dos.
 */
function etiquetaDe(
  celda: CeldaDeRiesgo | undefined,
  franja: Franja,
  dia: number,
): string {
  const donde = `${NOMBRE_DE_DIA[dia]} por la ${NOMBRE_DE_FRANJA[franja]}`;

  if (!celda || celda.observaciones === 0) {
    return `${donde}: no hay tomas programadas.`;
  }
  if (celda.omitidas === 0) {
    return `${donde}: no se ha quedado ninguna de ${celda.observaciones} tomas.`;
  }
  return (
    `${donde}: se han quedado ${celda.omitidas} de ${celda.observaciones} tomas.` +
    (celda.suficiente ? '' : ' Todavía hay pocos datos de esta franja.')
  );
}
