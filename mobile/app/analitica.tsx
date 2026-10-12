import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { ErrorDeApi } from '../src/dominio/modelos';
import type { Analitica as AnaliticaModelo } from '../src/dominio/modelos';
import { Aviso, Boton, Cargando, EstadoVacio, Rotulo, Tarjeta, Texto } from '../src/ui/componentes/basicos';
import { MapaDeCalor } from '../src/ui/componentes/MapaDeCalor';
import {
  SelectorDePeriodo,
  fechaHaceDias,
  type DiasDePeriodo,
} from '../src/ui/componentes/SelectorDePeriodo';
import { useSesion } from '../src/ui/contexto/SesionContexto';
import { fechaEnPalabras } from '../src/ui/fechas';
import { colores, espacio } from '../src/ui/tema';
import { compartirReporte, sePuedeCompartirReporte } from '../src/ui/reporte';

/**
 * ANALÍTICA: cuándo falla esta persona, no cuánto.
 *
 * El porcentaje de adherencia ya estaba en el historial y no sirve para
 * actuar: saber que vas al 72% no te dice qué cambiar. Esta pantalla
 * responde la otra pregunta, la que sí tiene respuesta accionable:
 * ¿cuándo se me quedan?
 *
 * Lo que esta pantalla NO hace, y es deliberado: no recomienda cambiar
 * horarios, no interpreta nada en clave médica y no menciona
 * enfermedades. Describe la conducta de una persona con sus propios
 * registros. Esa frontera es la que mantiene a Chronova fuera del
 * régimen de dispositivos médicos, que en Colombia clasifica el software
 * por su finalidad prevista (Decreto 4725 de 2005, artículo 2).
 */
export default function Analitica() {
  const { api } = useSesion();
  const { pacienteId, nombre } = useLocalSearchParams<{
    pacienteId?: string;
    nombre?: string;
  }>();

  const [analitica, setAnalitica] = useState<AnaliticaModelo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dias, setDias] = useState<DiasDePeriodo>(90);
  const [compartiendo, setCompartiendo] = useState(false);

  /*
    La misma pantalla la abren dos personas distintas, y no se les puede
    hablar igual. El paciente lee "cuándo se te quedan"; su hija tiene
    que leer "cuándo se le quedan a Rosa", o no sabe de quién le hablan.
    La diferencia es que el cuidador llega con `nombre` en la ruta.
  */
  const deOtraPersona = Boolean(nombre);
  const quien = nombre ? nombre.split(' ')[0] : null;
  const titulo = quien ? `Patrones de ${quien}` : 'Cuándo se te quedan';

  /*
    Se pregunta una vez, al dibujar, y no al tocar el boton. Asi el boton
    de compartir ni siquiera aparece cuando no se puede cumplir, en vez
    de aparecer y fallar al pulsarlo.
  */
  const sePuedeCompartir = sePuedeCompartirReporte();

  const cargar = useCallback(async () => {
    try {
      setError(null);
      setAnalitica(
        await api.obtenerAnalitica({
          ...(pacienteId ? { pacienteId } : {}),
          desde: fechaHaceDias(dias),
        }),
      );
    } catch (problema) {
      setError(
        problema instanceof ErrorDeApi ? problema.message : 'No pudimos cargar tu analítica.',
      );
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [api, dias, pacienteId]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const compartir = async () => {
    if (!analitica) return;
    setCompartiendo(true);
    try {
      await compartirReporte(analitica, nombre);
    } catch (problema) {
      setError(
        problema instanceof Error ? problema.message : 'No pudimos preparar el reporte.',
      );
    } finally {
      setCompartiendo(false);
    }
  };

  if (cargando) return <Cargando mensaje="Revisando tus patrones..." />;

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

  // Igual que en el resto de la app: `null` significa "no pudimos
  // preguntar", que no es lo mismo que "preguntamos y no hay nada".
  if (!analitica) {
    return (
      <>
        <Stack.Screen options={{ title: titulo }} />
        <ScrollView
          contentContainerStyle={{ padding: espacio.md, gap: espacio.md }}
          refreshControl={recargar}
        >
          {error ? <Aviso mensaje={error} tono="error" /> : null}
          <Boton titulo="Reintentar" variante="secundario" onPress={() => void cargar()} />
        </ScrollView>
      </>
    );
  }

  const { mapaDeRiesgo, evidencia } = analitica;

  return (
    <>
      <Stack.Screen options={{ title: titulo }} />
      <ScrollView
        contentContainerStyle={{
          padding: espacio.md,
          gap: espacio.md,
          paddingBottom: espacio.xxl,
        }}
        refreshControl={recargar}
      >
        {error ? <Aviso mensaje={error} tono="error" /> : null}

        <SelectorDePeriodo dias={dias} onCambiar={setDias} ocupado={refrescando} />

        {/* ---- Lo que encontramos, primero ---- */}
        {!evidencia.suficienteParaElMapa ? (
          <Aviso
            tono="info"
            mensaje={
              `Todavía hay poca historia para sacar conclusiones: van ` +
              `${evidencia.tomasResueltas} tomas registradas. El mapa se va afinando ` +
              `solo a medida que pasan las semanas.`
            }
          />
        ) : null}

        {mapaDeRiesgo.hallazgos.length > 0 ? (
          <Tarjeta>
            <Rotulo>Lo que vemos</Rotulo>
            {mapaDeRiesgo.hallazgos.map((hallazgo) => (
              <Texto key={hallazgo.texto} color={colores.texto}>
                {hallazgo.texto}
              </Texto>
            ))}
            <Texto variante="pequeno" color={colores.textoTenue}>
              {deOtraPersona
                ? `Son patrones del registro de ${quien}, no un diagnóstico. Sirven para saber ` +
                  `en qué momento conviene estar pendiente, no para cambiar nada del tratamiento.`
                : 'Son patrones de tu propio registro, no un diagnóstico. Si quieres cambiar algo ' +
                  'de tu tratamiento, eso se habla con tu médico.'}
            </Texto>
          </Tarjeta>
        ) : evidencia.suficienteParaElMapa ? (
          <Aviso
            tono="exito"
            mensaje={
              deOtraPersona
                ? `No hay ninguna franja en la que a ${quien} se le queden las tomas de forma repetida.`
                : 'No encontramos ninguna franja que se te esté quedando de forma repetida.'
            }
          />
        ) : null}

        {/* ---- El mapa ---- */}
        <Tarjeta>
          <Rotulo>{deOtraPersona ? 'La semana, franja por franja' : 'Tu semana, franja por franja'}</Rotulo>
          <Texto variante="pequeno" color={colores.textoSuave}>
            Cada casilla es un día de la semana y un momento del día. Toca una para oír el
            detalle.
          </Texto>
          <View style={{ marginTop: espacio.sm }}>
            <MapaDeCalor celdas={mapaDeRiesgo.celdas} />
          </View>
        </Tarjeta>

        {/* ---- Lo mejor, para no hablar solo de fallos ---- */}
        {mapaDeRiesgo.mejorCelda && mapaDeRiesgo.mejorCelda.omitidas === 0 ? (
          <Aviso
            tono="exito"
            mensaje={
              deOtraPersona
                ? `Hay franjas en las que no se ha quedado ninguna toma. Esas ya son un hábito.`
                : 'Hay franjas en las que no se te ha quedado ninguna. Esas ya son un hábito.'
            }
          />
        ) : null}

        {/* ---- Compartir ---- */}
        <Tarjeta>
          <Rotulo>Llevárselo al médico</Rotulo>
          <Texto variante="pequeno" color={colores.textoSuave}>
            {deOtraPersona
              ? `Prepara un documento con el cumplimiento y los patrones de ${quien} para ` +
                `llevarlo a la cita. Lo envías por WhatsApp, correo o lo que prefieras.`
              : 'Prepara un documento con tu cumplimiento y tus patrones, y lo envías por ' +
                'WhatsApp, correo o lo que prefieras. Tú eliges a quién.'}
          </Texto>
          {sePuedeCompartir ? (
            <Boton
              titulo="Preparar reporte"
              icono="compartir"
              onPress={compartir}
              ocupado={compartiendo}
            />
          ) : (
            /*
              Solo pasa en desarrollo, con un build del telefono anterior
              al que trajo expo-print. En una app publicada los modulos
              nativos vienen dentro y esta rama no se ve nunca.
            */
            <Aviso
              tono="info"
              mensaje={
                __DEV__
                  ? 'El reporte necesita un development build nuevo: expo-print y expo-sharing ' +
                    'son módulos nativos y este teléfono tiene una compilación anterior. El ' +
                    'resto de la pantalla funciona igual.'
                  : 'Esta versión de la aplicación todavía no puede preparar el reporte. ' +
                    'Actualízala desde la tienda para tenerlo.'
              }
            />
          )}
        </Tarjeta>

        <Texto variante="pequeno" color={colores.textoTenue}>
          Calculado sobre {evidencia.tomasResueltas} tomas resueltas entre el{' '}
          {fechaEnPalabras(analitica.desde)} y el {fechaEnPalabras(analitica.hasta)}.
        </Texto>
      </ScrollView>
    </>
  );
}
