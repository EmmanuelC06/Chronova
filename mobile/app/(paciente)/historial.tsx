import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { ErrorDeApi } from '../../src/dominio/modelos';
import type { Historial as HistorialModelo } from '../../src/dominio/modelos';
import {
  Aviso,
  Cargando,
  EstadoVacio,
  Insignia,
  Rotulo,
  Tarjeta,
  Texto,
} from '../../src/ui/componentes/basicos';
import { useSesion } from '../../src/ui/contexto/SesionContexto';
import { colores, espacio, ESTILO_POR_ESTADO, ESTILO_POR_NIVEL, radio } from '../../src/ui/tema';

/**
 * Historial de adherencia del paciente.
 *
 * Muestra el porcentaje, una grafica de barras de los ultimos dias y el
 * detalle de cada toma. La grafica se dibuja con Views de altura
 * variable: sin librerias, sin peso extra y perfectamente legible.
 */
export default function Historial() {
  const { api } = useSesion();

  const [historial, setHistorial] = useState<HistorialModelo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setError(null);
      setHistorial(await api.consultarHistorial());
    } catch (problema) {
      setError(
        problema instanceof ErrorDeApi ? problema.message : 'No pudimos cargar tu historial.',
      );
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  if (cargando) return <Cargando mensaje="Revisando tu historial..." />;

  const recargar = (
    <RefreshControl
      refreshing={refrescando}
      onRefresh={() => {
        setRefrescando(true);
        void cargar();
      }}
      tintColor={colores.primario}
    />
  );

  // No pudimos traer el historial. Antes esta rama entraba por la misma
  // puerta que "no hay nada todavia" —la condicion era `!historial ||
  // registros.length === 0`— y a un paciente sin cobertura la app le
  // decia que no habia confirmado ninguna toma en su vida. Son dos cosas
  // distintas y solo una se arregla tomandose la medicina.
  if (!historial) {
    return (
      <ScrollView
        contentContainerStyle={{ padding: espacio.md, gap: espacio.md }}
        refreshControl={recargar}
      >
        <Aviso
          mensaje={error ?? 'No pudimos cargar tu historial. Baja para reintentar.'}
          tono="error"
        />
      </ScrollView>
    );
  }

  if (historial.registros.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={{ padding: espacio.md, gap: espacio.md }}
        refreshControl={recargar}
      >
        {error ? <Aviso mensaje={error} tono="error" /> : null}
        <EstadoVacio
          titulo="Todavia no hay historial"
          descripcion="A medida que confirmes tus tomas, aqui veras como va tu tratamiento."
        />
      </ScrollView>
    );
  }

  const nivel = ESTILO_POR_NIVEL[historial.resumen.nivel];
  const ultimosDias = historial.porDia.slice(-14);

  return (
    <ScrollView
      contentContainerStyle={{
        padding: espacio.md,
        gap: espacio.md,
        paddingBottom: espacio.xxl,
      }}
      refreshControl={recargar}
    >
      {error ? <Aviso mensaje={error} tono="error" /> : null}

      {/* ---- Resumen ---- */}
      <Tarjeta>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: espacio.xs,
          }}
        >
          <Texto variante="cifra" peso="negrita">
            {historial.resumen.porcentaje}
          </Texto>
          <Texto variante="subtitulo" peso="semi" color={colores.textoTenue}>
            %
          </Texto>
        </View>
        <Texto variante="rotulo" peso="semi" color={nivel.color}>
          {nivel.etiqueta}
        </Texto>
        <Texto color={colores.textoSuave}>{historial.resumen.mensaje}</Texto>

        <View
          style={{
            flexDirection: 'row',
            gap: espacio.lg,
            marginTop: espacio.sm,
          }}
        >
          <Dato etiqueta="Tomadas" valor={historial.resumen.tomadas} color={colores.exito} />
          <Dato etiqueta="No tomadas" valor={historial.resumen.omitidas} color={colores.peligro} />
          <Dato
            etiqueta="A tiempo"
            valor={`${historial.resumen.porcentajeDePuntualidad}%`}
            color={colores.primario}
          />
        </View>
      </Tarjeta>

      {/* ---- Grafica por dia ---- */}
      {ultimosDias.length > 1 ? (
        <Tarjeta>
          <Rotulo>Ultimos dias</Rotulo>
          <View
            accessibilityLabel={`Grafica de cumplimiento de los ultimos ${ultimosDias.length} dias.`}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: espacio.xs,
              height: 120,
              marginTop: espacio.sm,
            }}
          >
            {ultimosDias.map((dia) => (
              <View key={dia.fecha} style={{ flex: 1, alignItems: 'center', gap: espacio.xs }}>
                <View
                  style={{
                    width: '100%',
                    height: Math.max(4, (dia.porcentaje / 100) * 96),
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

      {/* ---- Detalle ---- */}
      <Rotulo>Detalle</Rotulo>

      {historial.registros.slice(0, 60).map((registro) => {
        const estilo = ESTILO_POR_ESTADO[registro.estado];
        return (
          <Tarjeta key={registro.tomaId}>
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
              Programada: {fechaYHora(registro.programadaPara)}
            </Texto>

            {registro.puntualidad === 'CON_RETRASO' && registro.minutosDeDesfase !== null ? (
              <Texto variante="pequeno" color={colores.advertencia}>
                Se tomo {formatearDemora(registro.minutosDeDesfase)} despues de la hora.
              </Texto>
            ) : null}

            {registro.observaciones ? (
              <Texto variante="pequeno" color={colores.textoSuave}>
                {registro.observaciones}
              </Texto>
            ) : null}

            {registro.registradaPor === 'CUIDADOR' ? (
              <Texto variante="pequeno" color={colores.textoSuave}>
                Registrada por tu cuidador.
              </Texto>
            ) : null}
          </Tarjeta>
        );
      })}
    </ScrollView>
  );
}

function Dato({
  etiqueta,
  valor,
  color,
}: {
  etiqueta: string;
  valor: number | string;
  color: string;
}) {
  return (
    <View>
      <Texto variante="subtitulo" peso="semi" color={color}>
        {valor}
      </Texto>
      <Texto variante="pequeno" color={colores.textoSuave}>
        {etiqueta}
      </Texto>
    </View>
  );
}

function fechaYHora(iso: string): string {
  const fecha = new Date(iso);
  return fecha.toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatearDemora(minutos: number): string {
  if (minutos < 60) return `${minutos} minutos`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} hora${horas > 1 ? 's' : ''}` : `${horas} h ${resto} min`;
}
