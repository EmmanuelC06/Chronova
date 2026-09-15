import { View } from 'react-native';

import { Boton, Rotulo } from './basicos';
import { espacio } from '../tema';

/**
 * Elegir cuanto historial se mira: una semana, un mes o tres meses.
 *
 * El servidor aceptaba `desde` y `hasta` desde el principio, pero ninguna
 * pantalla los enviaba: todo el mundo veia siempre los ultimos 30 dias
 * por defecto. El requisito hablaba de "un periodo determinado" y eso era
 * cierto por API y falso por aplicacion.
 *
 * Tres opciones y no un calendario, a proposito. Elegir dos fechas en un
 * calendario de telefono es de las interacciones mas dificiles que hay
 * para una persona mayor, y aqui no hace falta: las preguntas reales son
 * "¿como voy esta semana?", "¿como fue el mes?" y "¿que le llevo al
 * medico?". Tres botones las responden las tres.
 */
export const PERIODOS = [
  { dias: 7, etiqueta: 'Semana' },
  { dias: 30, etiqueta: 'Mes' },
  { dias: 90, etiqueta: '3 meses' },
] as const;

export type DiasDePeriodo = (typeof PERIODOS)[number]['dias'];

/**
 * La fecha de hace `dias` dias, en formato AAAA-MM-DD y en la zona del
 * telefono.
 *
 * Se construye a mano y no con `toISOString()` porque ese metodo
 * convierte a UTC: a las 8 de la noche en Colombia ya es el dia
 * siguiente en Greenwich, y el periodo se correria un dia sin que se
 * note hasta que alguien mira el historial por la noche.
 */
export function fechaHaceDias(dias: number, hoy = new Date()): string {
  const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - dias + 1);
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export function SelectorDePeriodo({
  dias,
  onCambiar,
  ocupado = false,
}: {
  dias: DiasDePeriodo;
  onCambiar: (dias: DiasDePeriodo) => void;
  ocupado?: boolean;
}) {
  return (
    <View style={{ gap: espacio.xs }}>
      <Rotulo>Qué período mirar</Rotulo>
      <View style={{ flexDirection: 'row', gap: espacio.sm }}>
        {PERIODOS.map((periodo) => (
          <View key={periodo.dias} style={{ flex: 1 }}>
            <Boton
              titulo={periodo.etiqueta}
              variante={periodo.dias === dias ? 'primario' : 'secundario'}
              deshabilitado={ocupado}
              descripcionAccesible={
                periodo.dias === dias
                  ? `${periodo.etiqueta}, seleccionado`
                  : `Ver los últimos ${periodo.dias} días`
              }
              onPress={() => onCambiar(periodo.dias)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
