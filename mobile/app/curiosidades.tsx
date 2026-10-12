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
import { Icono } from '../src/ui/componentes/Icono';
import { fechaHaceDias } from '../src/ui/componentes/SelectorDePeriodo';
import { useSesion } from '../src/ui/contexto/SesionContexto';
import { colores, espacio } from '../src/ui/tema';
import {
  MAXIMO_DE_TEMAS,
  TEMAS,
  datosOrdenadosPara,
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
 * Los temas se ORDENAN, no se filtran
 * -----------------------------------
 * Marcar «el sueño» no esconde el dato de moverse: lo baja. Es la
 * diferencia entre una lista personalizada y una lista censurada, y la
 * segunda vacía de sentido un módulo que existe para que la gente se
 * tropiece con cosas. Quien no marca nada lo ve todo.
 *
 * La regla que no se cruza
 * -----------------------
 * Ninguna tarjeta de esta pantalla regaña, y ninguna habla de la
 * enfermedad ni del tratamiento de nadie. Las de arriba describen
 * conducta ("llevas 23 días seguidos"); las de abajo son datos generales
 * con su fuente, iguales para todo el mundo y escritos a mano. Nada se
 * genera en el momento, y por eso se puede revisar antes de que alguien
 * lo lea.
 *
 * Solo la ve el paciente
 * ----------------------
 * El cuidador entra a la analítica y al reporte, que es lo que le sirve,
 * pero no aquí. Una racha es de quien se toma la pastilla, y los temas
 * los marca quien va a leerlos.
 */

/** Un año: las rachas y el "llevas registrando" quieren toda la historia. */
const DIAS_DE_HISTORIA = 365;

export default function Curiosidades() {
  const { api, perfil } = useSesion();

  const [curiosidades, setCuriosidades] = useState<Curiosidad[] | null>(null);
  const [temas, setTemas] = useState<string[]>(perfil?.temasDeInteres ?? []);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Un aviso que no es un fallo: el tope de temas, por ejemplo. */
  const [nota, setNota] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setError(null);
      const analitica = await api.obtenerAnalitica({ desde: fechaHaceDias(DIAS_DE_HISTORIA) });
      setCuriosidades(analitica.curiosidades);
      // La respuesta trae lo guardado de verdad en el servidor, que gana
      // sobre lo que esta pantalla creyera recordar de otro teléfono.
      if (!guardando) setTemas(analitica.temasDeInteres);
    } catch (problema) {
      setError(
        problema instanceof ErrorDeApi ? problema.message : 'No pudimos cargar tus datos.',
      );
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
    // `guardando` se lee a propósito sin declararlo: si entra en las
    // dependencias, terminar de guardar relanzaría la carga entera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  /**
   * Marcar o desmarcar un tema.
   *
   * Se pinta el cambio ANTES de que el servidor conteste y se deshace si
   * falla. Con una conexión mala, esperar la respuesta hace que el toque
   * parezca no haber funcionado y la persona lo repite, que es como se
   * acaba marcando y desmarcando lo mismo.
   */
  const alternar = async (clave: string) => {
    const estaba = temas.includes(clave);

    /*
      Al llegar al tope, el toque CONTESTA.

      La primera version simplemente no hacia nada, y eso es de las peores
      cosas que puede hacer una interfaz: quien toca y no ve reaccion no
      concluye "habre llegado al limite", concluye que la aplicacion se
      colgo, y vuelve a tocar. Decir por que no se puede cuesta una linea.
    */
    if (!estaba && temas.length >= MAXIMO_DE_TEMAS) {
      setNota(
        `Ya tienes ${MAXIMO_DE_TEMAS} temas marcados, que es el máximo. ` +
          'Desmarca uno y vuelve a intentarlo.',
      );
      return;
    }

    setNota(null);
    const anteriores = temas;
    const siguientes = estaba ? temas.filter((t) => t !== clave) : [...temas, clave];

    setTemas(siguientes);
    setGuardando(true);
    setError(null);
    try {
      const guardado = await api.actualizarTemasDeInteres(siguientes);
      setTemas(guardado.temasDeInteres);
    } catch (problema) {
      setTemas(anteriores);
      setError(
        problema instanceof ErrorDeApi
          ? problema.message
          : 'No pudimos guardar tus temas. Inténtalo otra vez.',
      );
    } finally {
      setGuardando(false);
    }
  };

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

  const { destacados, resto } = datosOrdenadosPara(temas);
  const lleno = temas.length >= MAXIMO_DE_TEMAS;

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
        {nota ? <Aviso mensaje={nota} tono="info" /> : null}

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

        {/* ---- Elegir temas ---- */}
        <View style={{ marginTop: espacio.md }}>
          <Rotulo>¿De qué te gustaría leer?</Rotulo>
        </View>
        <Texto variante="pequeno" color={colores.textoSuave}>
          Marca hasta {MAXIMO_DE_TEMAS} temas y los pondremos de primeros. Los demás siguen
          estando, un poco más abajo.
        </Texto>

        <Tarjeta>
          {TEMAS.map((tema, indice) => {
            const marcado = temas.includes(tema.clave);
            const bloqueado = !marcado && lleno;
            return (
              <View key={tema.clave}>
                {indice > 0 ? (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: colores.borde,
                      marginVertical: espacio.sm,
                    }}
                  />
                ) : null}
                <FilaDeTema
                  titulo={tema.titulo}
                  descripcion={tema.descripcion}
                  icono={tema.icono}
                  marcado={marcado}
                  alTope={bloqueado}
                  ocupado={guardando}
                  onPress={() => void alternar(tema.clave)}
                />
              </View>
            );
          })}
        </Tarjeta>

        {lleno ? (
          <Texto variante="pequeno" color={colores.textoTenue}>
            Ya tienes {MAXIMO_DE_TEMAS}. Para cambiar uno, primero desmárcalo.
          </Texto>
        ) : null}

        {/* ---- Lo general ----
            Esta sección se muestra SIEMPRE, incluso sin datos propios y
            incluso si el servidor no responde. Es a propósito: alguien
            que abre esto el primer día merece encontrar algo, y lo que
            tiene que encontrar es que olvidarse es normal. */}
        <View style={{ marginTop: espacio.md }}>
          <Rotulo>{temas.length > 0 ? 'Para ti' : 'Para saber'}</Rotulo>
        </View>
        <Texto variante="pequeno" color={colores.textoSuave}>
          Datos generales sobre hábitos y salud, con su fuente. No son sobre ti ni sobre tu
          tratamiento.
        </Texto>

        {destacados.map((dato) => (
          <TarjetaDeHabito key={dato.clave} dato={dato} />
        ))}

        {resto.length > 0 ? (
          <>
            <View style={{ marginTop: espacio.md }}>
              <Rotulo>Lo demás</Rotulo>
            </View>
            {resto.map((dato) => (
              <TarjetaDeHabito key={dato.clave} dato={dato} />
            ))}
          </>
        ) : null}

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
 * Una fila del selector de temas.
 *
 * La marca es un icono con forma distinta, no solo un color: un círculo
 * vacío contra un círculo con palomita. Es el RNF-04 otra vez, y aquí
 * hace falta porque "marcado" y "sin marcar" es justo el tipo de estado
 * que se suele codificar solo con color.
 *
 * `alTope` NO deshabilita la fila, y tampoco la atenúa hasta borrarla.
 * Atenuar al 45% dejaba el texto por debajo de cualquier contraste
 * legible, y en una aplicación cuyo público son adultos mayores eso
 * convierte "no puedes marcar más" en "aquí no se ve nada". Se insinúa
 * con un 0.7 y lo que de verdad explica es el aviso que sale al tocarla.
 */
function FilaDeTema({
  titulo,
  descripcion,
  icono,
  marcado,
  alTope,
  ocupado,
  onPress,
}: {
  titulo: string;
  descripcion: string;
  icono: Parameters<typeof Icono>[0]['nombre'];
  marcado: boolean;
  alTope: boolean;
  ocupado: boolean;
  onPress: () => void;
}) {
  return (
    <Tarjeta
      onPress={ocupado ? undefined : onPress}
      descripcionAccesible={
        `${titulo}. ${marcado ? 'Marcado' : 'Sin marcar'}.` +
        (alTope ? ' Ya elegiste el máximo de temas.' : '')
      }
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: espacio.sm,
          opacity: alTope ? 0.7 : 1,
        }}
      >
        <IconoDeEstado
          nombre={icono}
          color={marcado ? colores.primario : colores.textoSuave}
          fondo={marcado ? colores.primarioSuave : colores.fondo}
          lado={36}
        />
        <View style={{ flex: 1 }}>
          <Texto peso={marcado ? 'semi' : 'regular'}>{titulo}</Texto>
          <Texto variante="pequeno" color={colores.textoSuave}>
            {descripcion}
          </Texto>
        </View>
        <Icono
          nombre={marcado ? 'marcado' : 'sinMarcar'}
          tamano={26}
          color={marcado ? colores.primario : colores.bordeFuerte}
        />
      </View>
    </Tarjeta>
  );
}

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
