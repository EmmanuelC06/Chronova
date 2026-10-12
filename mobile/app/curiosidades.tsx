import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';

import { ErrorDeApi } from '../src/dominio/modelos';
import type { Curiosidad } from '../src/dominio/modelos';
import {
  Aviso,
  Boton,
  Cargando,
  IconoDeEstado,
  Rotulo,
  Tarjeta,
  Texto,
} from '../src/ui/componentes/basicos';
import { fechaHaceDias } from '../src/ui/componentes/SelectorDePeriodo';
import { useSesion } from '../src/ui/contexto/SesionContexto';
import { colores, espacio } from '../src/ui/tema';
import {
  DATOS_DE_HABITOS,
  iconoDeCuriosidad,
  type DatoDeHabito,
} from '../src/ui/datosDeHabitos';

/**
 * CURIOSIDADES: la historia de la propia persona, y algo que saber.
 *
 * Qué es esta pantalla y qué no
 * -----------------------------
 * Es la parte motivacional de Chronova, y es la única. El resto de la
 * aplicación es utilitaria: avisa, registra y reporta. Aquí se le
 * devuelve a la persona lo que lleva hecho, porque un tratamiento largo
 * se abandona por desánimo mucho antes que por desconocimiento.
 *
 * Por qué rachas y no puntos ni medallas
 * --------------------------------------
 * Porque está medido, y en la población que nos importa. En mayores de
 * 65 años las rachas aumentan el uso de una aplicación y las tablas de
 * posiciones también, mientras que los premios y los puntos lo BAJAN. A
 * esta edad no motiva competir: motiva ver la propia historia.
 *
 * La regla que no se cruza
 * -----------------------
 * Ninguna tarjeta de esta pantalla regaña, y ninguna habla de la
 * enfermedad ni del tratamiento de nadie. Las de arriba describen
 * conducta ("llevas 23 días seguidos"); las de abajo son datos generales
 * de hábitos y memoria, con su fuente, iguales para todo el mundo y
 * escritos a mano. Nada de esto se genera en el momento, y por eso se
 * puede revisar antes de que alguien lo lea.
 *
 * Solo la ve el paciente
 * ----------------------
 * El cuidador entra a la analítica y al reporte, que es lo que le sirve,
 * pero no aquí. Una racha es de quien se toma la pastilla.
 */

/** Un año: las rachas y el "llevas registrando" quieren toda la historia. */
const DIAS_DE_HISTORIA = 365;

export default function Curiosidades() {
  const { api } = useSesion();

  const [curiosidades, setCuriosidades] = useState<Curiosidad[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setError(null);
      const analitica = await api.obtenerAnalitica({ desde: fechaHaceDias(DIAS_DE_HISTORIA) });
      setCuriosidades(analitica.curiosidades);
    } catch (problema) {
      setError(
        problema instanceof ErrorDeApi ? problema.message : 'No pudimos cargar tus datos.',
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

  if (cargando) return <Cargando mensaje="Buscando tus datos..." />;

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

  return (
    <>
      <Stack.Screen options={{ title: 'Curiosidades' }} />
      <ScrollView
        contentContainerStyle={{
          padding: espacio.md,
          gap: espacio.md,
          paddingBottom: espacio.xxl,
        }}
        refreshControl={recargar}
      >
        {error ? <Aviso mensaje={error} tono="error" /> : null}

        {/* ---- Lo tuyo ---- */}
        <Rotulo>Tus números</Rotulo>

        {/*
          Tres estados distintos y no dos, que es el mismo cuidado que en
          el historial: `null` es "no pudimos preguntar", la lista vacía
          es "preguntamos y todavía no hay suficiente". Decirle "todavía
          no has registrado nada" a quien solo se quedó sin internet es
          una mentira que desanima.
        */}
        {curiosidades === null ? (
          <Tarjeta>
            <Texto color={colores.textoSuave}>
              No pudimos traer tus datos. Baja para reintentar.
            </Texto>
            <Boton titulo="Reintentar" variante="secundario" onPress={() => void cargar()} />
          </Tarjeta>
        ) : curiosidades.length === 0 ? (
          <Aviso
            tono="info"
            mensaje={
              'Todavía no hay historia que contar. En cuanto empieces a confirmar tus tomas, ' +
              'aquí van apareciendo tus rachas y tus mejores días.'
            }
          />
        ) : (
          curiosidades.map((curiosidad) => (
            <TarjetaDeCuriosidad key={curiosidad.clave} curiosidad={curiosidad} />
          ))
        )}

        {/* ---- Lo general ----
            Esta sección se muestra SIEMPRE, incluso sin datos propios y
            incluso si el servidor no responde. Es a propósito: alguien
            que abre esto el primer día merece encontrar algo, y lo que
            tiene que encontrar es que olvidarse es normal. */}
        <View style={{ marginTop: espacio.md }}>
          <Rotulo>Para saber</Rotulo>
        </View>
        <Texto variante="pequeno" color={colores.textoSuave}>
          Datos generales sobre memoria y hábitos, con su fuente. No son sobre ti ni sobre tu
          tratamiento.
        </Texto>

        {DATOS_DE_HABITOS.map((dato) => (
          <TarjetaDeHabito key={dato.clave} dato={dato} />
        ))}

        <Texto variante="pequeno" color={colores.textoTenue}>
          Nada de lo que hay en esta pantalla es un consejo médico. Si quieres cambiar algo de
          tu tratamiento, eso se habla con tu médico.
        </Texto>
      </ScrollView>
    </>
  );
}

// -----------------------------------------------------------------

/**
 * Una curiosidad calculada: el dato en grande y la frase que lo explica.
 *
 * El número va grande porque es lo único que se mira de lejos, y lleva
 * su rótulo encima: un "23 días" suelto no significa nada.
 */
function TarjetaDeCuriosidad({ curiosidad }: { curiosidad: Curiosidad }) {
  return (
    <Tarjeta>
      <View style={{ flexDirection: 'row', gap: espacio.md, alignItems: 'center' }}>
        <IconoDeEstado
          nombre={iconoDeCuriosidad(curiosidad.clave)}
          color={colores.primario}
          fondo={colores.primarioSuave}
        />
        <View style={{ flex: 1 }}>
          <Texto variante="pequeno" color={colores.textoSuave}>
            {curiosidad.titulo}
          </Texto>
          <Texto variante="subtitulo" peso="negrita" color={colores.primario}>
            {curiosidad.valor}
          </Texto>
        </View>
      </View>
      <Texto color={colores.texto}>{curiosidad.detalle}</Texto>
    </Tarjeta>
  );
}

/** Un dato general. La fuente va visible, no en letra de contrato. */
function TarjetaDeHabito({ dato }: { dato: DatoDeHabito }) {
  return (
    <Tarjeta>
      <View style={{ flexDirection: 'row', gap: espacio.sm, alignItems: 'center' }}>
        <IconoDeEstado
          nombre={dato.icono}
          color={colores.exito}
          fondo={colores.exitoSuave}
          lado={36}
        />
        <View style={{ flex: 1 }}>
          <Texto peso="semi">{dato.titulo}</Texto>
        </View>
      </View>
      <Texto color={colores.texto}>{dato.texto}</Texto>
      <Texto variante="pequeno" color={colores.textoTenue}>
        Fuente: {dato.fuente}
      </Texto>
    </Tarjeta>
  );
}
