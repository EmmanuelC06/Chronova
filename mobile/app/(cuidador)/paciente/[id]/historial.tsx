import { RefreshControl, ScrollView, View } from 'react-native';

import type { RegistroDeHistorial } from '../../../../src/dominio/modelos';
import { Aviso, Insignia, Rotulo, Tarjeta, Texto } from '../../../../src/ui/componentes/basicos';
import {
  DIAS_DE_RESUMEN,
  usePacienteObservado,
} from '../../../../src/ui/contexto/PacienteObservadoContexto';
import { colores, espacio, ESTILO_POR_ESTADO, radio } from '../../../../src/ui/tema';

/**
 * PESTANA "Historial": que ha pasado en la ultima semana.
 *
 * Dos cosas, y en este orden. Primero las tomas que se saltaron, que es
 * lo concreto que conviene hablar con la persona; despues la grafica,
 * que da la tendencia. Un porcentaje solo dice que algo va mal; la lista
 * dice QUE fue.
 */
export default function HistorialDelPaciente() {
  const { historial, nombreCorto, error, refrescando, alTirarParaRefrescar } =
    usePacienteObservado();

  const sinTomar = (historial?.registros ?? []).filter((r) => r.estado === 'OMITIDA').slice(0, 10);
  const ultimosDias = (historial?.porDia ?? []).slice(-DIAS_DE_RESUMEN);

  return (
    <ScrollView
      contentContainerStyle={{
        padding: espacio.md,
        gap: espacio.md,
        paddingBottom: espacio.xxl,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refrescando}
          onRefresh={alTirarParaRefrescar}
          tintColor={colores.primario}
        />
      }
    >
      {error ? <Aviso mensaje={error} tono="error" /> : null}

      {historial === null ? (
        <Texto color={colores.textoSuave}>No pudimos cargar el historial.</Texto>
      ) : null}

      {/* ---- Lo que fallo ---- */}
      {sinTomar.length > 0 ? (
        <>
          <Rotulo>Tomas sin tomar</Rotulo>
          <Texto variante="pequeno" color={colores.textoSuave}>
            Las mas recientes. Es lo que conviene revisar con {nombreCorto}.
          </Texto>
          {sinTomar.map((registro) => (
            <TarjetaDeOmision
              key={registro.tomaId}
              registro={registro}
              zonaHoraria={historial?.zonaHoraria}
            />
          ))}
        </>
      ) : historial ? (
        <Aviso
          tono="exito"
          mensaje={`${nombreCorto} no ha dejado de tomar ninguna dosis en el periodo consultado.`}
        />
      ) : null}

      {/* ---- Evolucion ---- */}
      {ultimosDias.length > 1 ? (
        <Tarjeta>
          <Rotulo>Ultimos dias</Rotulo>
          <View
            accessibilityLabel={`Grafica de cumplimiento de ${nombreCorto} en los ultimos ${ultimosDias.length} dias.`}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: espacio.xs,
              height: 110,
              marginTop: espacio.sm,
            }}
          >
            {ultimosDias.map((dia) => (
              <View key={dia.fecha} style={{ flex: 1, alignItems: 'center', gap: espacio.xs }}>
                <View
                  style={{
                    width: '100%',
                    height: Math.max(4, (dia.porcentaje / 100) * 84),
                    borderRadius: radio.sm,
                    backgroundColor:
                      dia.porcentaje >= 80
                        ? colores.exito
                        : dia.porcentaje >= 50
                          ? colores.advertencia
                          : colores.peligro,
                  }}
                />
                <Texto variante="pequeno" color={colores.textoSuave}>
                  {dia.fecha.slice(8)}
                </Texto>
              </View>
            ))}
          </View>
        </Tarjeta>
      ) : null}
    </ScrollView>
  );
}

// -----------------------------------------------------------------

function TarjetaDeOmision({
  registro,
  zonaHoraria,
}: {
  registro: RegistroDeHistorial;
  zonaHoraria?: string;
}) {
  const estilo = ESTILO_POR_ESTADO.OMITIDA;

  return (
    <Tarjeta>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Texto peso="media">{registro.nombreDelMedicamento}</Texto>
        <Insignia
          texto={estilo.etiqueta}
          icono={estilo.icono}
          color={estilo.color}
          fondo={estilo.fondo}
        />
      </View>
      <Texto variante="pequeno" color={colores.textoSuave}>
        {momentoEnPalabras(registro.programadaPara, zonaHoraria)}
      </Texto>
      {registro.registradaPor === 'SISTEMA' ? (
        <Texto variante="pequeno" color={colores.textoSuave}>
          Se cerro sola: nadie respondio al recordatorio.
        </Texto>
      ) : registro.registradaPor === 'CUIDADOR' ? (
        <Texto variante="pequeno" color={colores.textoSuave}>
          La registro un cuidador.
        </Texto>
      ) : null}
      {registro.observaciones ? (
        <Texto variante="pequeno" color={colores.textoSuave}>
          “{registro.observaciones}”
        </Texto>
      ) : null}
    </Tarjeta>
  );
}

/**
 * La hora SIEMPRE en la zona del paciente, no en la del cuidador.
 *
 * Un hijo que vive en Madrid y una madre en Medellin llevan siete horas
 * de diferencia: sin esto, la dosis que ella se salto a las ocho de la
 * noche le aparecia a el como "las tres de la madrugada", y llamaba a
 * preguntar por una toma que nunca existio. El servidor ya envia la zona
 * en cada respuesta; solo habia que usarla.
 */
function momentoEnPalabras(iso: string, zonaHoraria?: string): string {
  try {
    return new Date(iso).toLocaleString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: zonaHoraria,
    });
  } catch {
    // Una zona que este motor no conozca no debe dejar la tarjeta vacia.
    return new Date(iso).toLocaleString('es-CO');
  }
}
