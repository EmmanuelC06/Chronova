import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icono } from './Icono';
import { Texto } from './basicos';
import { TEMAS, datosDelTema, type DatoDeHabito } from '../datosDeHabitos';
import { ALTO_TACTIL_MINIMO, colores, espacio, radio } from '../tema';

/**
 * LA BURBUJA DE CURIOSIDADES: conversación, no catálogo.
 *
 * Antes, la pantalla de curiosidades volcaba las dieciocho tarjetas de
 * golpe. Leer dieciocho cosas no es leer ninguna, y encima daba igual lo
 * que a la persona le interesara. Aquí no aparece nada hasta que elige
 * un tema, y entonces llega UNA.
 *
 * Por qué parece un chat y NO lo es
 * ---------------------------------
 * El formato de conversación se eligió porque entregar de a una cosa es
 * lo que hace, y eso es exactamente lo que un chat hace. Pero no hay
 * campo de texto, y no es un descuido: en cuanto se pueda escribir,
 * alguien va a preguntar «¿puedo tomar esto con el almuerzo?», y
 * Chronova no puede responder eso. Lo que mantiene a esta aplicación
 * fuera del régimen de dispositivos médicos es su finalidad prevista
 * (Decreto 4725 de 2005, artículo 2), y una caja de texto que acepta
 * preguntas de salud cambia esa finalidad aunque nadie conteste.
 *
 * Así que lo único que se puede hacer aquí es tocar un tema de una lista
 * cerrada. Todo lo que sale está escrito de antemano y revisado. Nada se
 * genera en el momento.
 *
 * Por qué solo en la pantalla de Hoy
 * ----------------------------------
 * Un botón flotante tapa contenido, y en una aplicación de letra grande
 * para adultos mayores eso cuesta más que en otra. Hoy es la pantalla
 * donde la gente pasa el rato esperando la siguiente toma, que es cuando
 * apetece leer algo; en el historial o en un formulario solo estorbaría.
 */

interface Mensaje {
  id: string;
  de: 'app' | 'persona';
  /**
   * El titular del dato, en negrita y en su propia línea.
   *
   * Va aparte del cuerpo porque la primera versión los pegaba en una
   * sola frase —«No todo empeora cada año. A lo largo de la vida...»— y
   * al verlo renderizado era un muro: en una tarjeta el título se
   * distingue por el tamaño, pero dentro de una burbuja todo es el
   * mismo párrafo y el ojo no encuentra dónde agarrarse.
   */
  titulo?: string;
  texto: string;
  /** Solo en los mensajes de la app que traen un dato con fuente. */
  fuente?: string;
}

const SALUDO =
  'Hola. Aquí te cuento cosas sobre hábitos y salud, de una en una. ¿De qué te gustaría saber?';

export function BurbujaDeCuriosidades() {
  const [abierta, setAbierta] = useState(false);

  return (
    <>
      <BotonFlotante onPress={() => setAbierta(true)} />
      {abierta ? <Conversacion alCerrar={() => setAbierta(false)} /> : null}
    </>
  );
}

/**
 * El botón redondo, abajo a la derecha.
 *
 * Mide 64 puntos, que es el alto táctil mínimo del proyecto (RNF-03), y
 * no 56 como manda la convención de Android: aquí pesa más una mano que
 * tiembla que la costumbre.
 */
function BotonFlotante({ onPress }: { onPress: () => void }) {
  const abajo = useSafeAreaInsets().bottom;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Curiosidades. Abre una conversación para leer sobre hábitos y salud."
      style={({ pressed }) => ({
        position: 'absolute',
        right: espacio.md,
        bottom: abajo + espacio.md,
        width: ALTO_TACTIL_MINIMO,
        height: ALTO_TACTIL_MINIMO,
        borderRadius: ALTO_TACTIL_MINIMO / 2,
        backgroundColor: colores.primario,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.85 : 1,
        // Sombra para que se despegue de lo que haya debajo: sin ella,
        // sobre una tarjeta blanca el borde del circulo se pierde.
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.22,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
      })}
    >
      <Icono nombre="idea" tamano={30} color={colores.textoInverso} />
    </Pressable>
  );
}

function Conversacion({ alCerrar }: { alCerrar: () => void }) {
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);

  const [mensajes, setMensajes] = useState<Mensaje[]>([
    { id: 'saludo', de: 'app', texto: SALUDO },
  ]);
  const [temaActual, setTemaActual] = useState<string | null>(null);
  /** Cuántas se han contado ya de cada tema, en esta conversación. */
  const [contadas, setContadas] = useState<Record<string, number>>({});
  const contador = useRef(0);

  const siguienteId = () => {
    contador.current += 1;
    return `m${contador.current}`;
  };

  // Al llegar un mensaje nuevo, bajar. Si no, el dato aparece fuera de
  // la vista y parece que el toque no hizo nada.
  useEffect(() => {
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [mensajes]);

  const contar = (clave: string, titulo: string, esCambioDeTema: boolean) => {
    const disponibles = datosDelTema(clave);
    const yaContadas = contadas[clave] ?? 0;
    const nuevos: Mensaje[] = [];

    if (esCambioDeTema) {
      nuevos.push({ id: siguienteId(), de: 'persona', texto: titulo });
    } else {
      nuevos.push({ id: siguienteId(), de: 'persona', texto: 'Cuéntame otra' });
    }

    const dato: DatoDeHabito | undefined = disponibles[yaContadas];

    if (!dato) {
      /*
        Se acabó el tema. Se dice, en vez de repetir en silencio.

        Repetir sin avisar es lo cómodo de programar y lo peor de leer:
        quien toca tres veces y ve lo mismo concluye que la aplicación
        está rota, no que se agotó el tema.
      */
      nuevos.push({
        id: siguienteId(),
        de: 'app',
        texto: `Ya te conté todo lo que tengo sobre ${titulo.toLowerCase()}. ¿Miramos otro tema?`,
      });
      setMensajes((previos) => [...previos, ...nuevos]);
      return;
    }

    nuevos.push({
      id: siguienteId(),
      de: 'app',
      titulo: dato.titulo,
      texto: dato.texto,
      fuente: dato.fuente,
    });

    setContadas((previas) => ({ ...previas, [clave]: yaContadas + 1 }));
    setTemaActual(clave);
    setMensajes((previos) => [...previos, ...nuevos]);
  };

  const tituloActual = TEMAS.find((t) => t.clave === temaActual)?.titulo ?? '';
  const quedanEnElTema =
    temaActual !== null && (contadas[temaActual] ?? 0) < datosDelTema(temaActual).length;

  return (
    <Modal
      visible
      animationType="slide"
      transparent
      onRequestClose={alCerrar}
      accessibilityViewIsModal
    >
      {/* El velo: tocar fuera cierra, que es lo que la gente intenta. */}
      <Pressable
        onPress={alCerrar}
        accessibilityLabel="Cerrar las curiosidades"
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}
      />

      <View
        style={{
          backgroundColor: colores.fondo,
          borderTopLeftRadius: radio.lg * 2,
          borderTopRightRadius: radio.lg * 2,
          paddingBottom: insets.bottom,
          maxHeight: '85%',
        }}
      >
        {/* ---- Cabecera ---- */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: espacio.sm,
            padding: espacio.md,
            borderBottomWidth: 1,
            borderBottomColor: colores.borde,
          }}
        >
          <Icono nombre="idea" tamano={24} color={colores.primario} />
          <View style={{ flex: 1 }}>
            <Texto peso="semi">Curiosidades</Texto>
          </View>
          <Pressable
            onPress={alCerrar}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            hitSlop={12}
            style={{
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icono nombre="equis" tamano={26} color={colores.textoSuave} />
          </Pressable>
        </View>

        {/* ---- La conversación ---- */}
        <ScrollView
          ref={scroll}
          contentContainerStyle={{ padding: espacio.md, gap: espacio.sm }}
          keyboardShouldPersistTaps="handled"
        >
          {mensajes.map((mensaje) => (
            <Burbuja key={mensaje.id} mensaje={mensaje} />
          ))}
        </ScrollView>

        {/* ---- Lo único que se puede hacer: elegir ----
            Aquí iría el campo de texto en un chat de verdad. No lo hay a
            propósito: ver el comentario de arriba. */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colores.borde,
            padding: espacio.md,
            gap: espacio.sm,
            backgroundColor: colores.superficie,
          }}
        >
          {quedanEnElTema ? (
            <Opcion
              texto={`Cuéntame otra sobre ${tituloActual.toLowerCase()}`}
              destacada
              onPress={() => contar(temaActual!, tituloActual, false)}
            />
          ) : null}

          <Texto variante="pequeno" color={colores.textoSuave}>
            {temaActual === null ? 'Elige un tema:' : 'O cambia de tema:'}
          </Texto>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm }}>
            {TEMAS.filter((t) => t.clave !== temaActual).map((tema) => (
              <Opcion
                key={tema.clave}
                texto={tema.titulo}
                icono={tema.icono}
                onPress={() => contar(tema.clave, tema.titulo, true)}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Un mensaje.
 *
 * La diferencia entre quién habla no es solo el color: la de la persona
 * va a la derecha y la de la aplicación a la izquierda, con formas de
 * esquina distintas. Es el RNF-04 otra vez, y aquí sale gratis porque la
 * posición ya hace el trabajo.
 */
function Burbuja({ mensaje }: { mensaje: Mensaje }) {
  const esDeLaPersona = mensaje.de === 'persona';

  return (
    <View
      style={{
        alignSelf: esDeLaPersona ? 'flex-end' : 'flex-start',
        maxWidth: '88%',
        backgroundColor: esDeLaPersona ? colores.primario : colores.superficie,
        borderWidth: esDeLaPersona ? 0 : 1,
        borderColor: colores.borde,
        borderRadius: radio.lg,
        borderBottomRightRadius: esDeLaPersona ? radio.sm : radio.lg,
        borderBottomLeftRadius: esDeLaPersona ? radio.lg : radio.sm,
        paddingHorizontal: espacio.md,
        paddingVertical: espacio.sm + 2,
        gap: espacio.xs,
      }}
    >
      {mensaje.titulo ? (
        <Texto peso="semi" color={colores.texto}>
          {mensaje.titulo}
        </Texto>
      ) : null}
      <Texto color={esDeLaPersona ? colores.textoInverso : colores.texto}>
        {mensaje.texto}
      </Texto>
      {mensaje.fuente ? (
        <Texto variante="pequeno" color={colores.textoTenue}>
          Fuente: {mensaje.fuente}
        </Texto>
      ) : null}
    </View>
  );
}

/** Una de las cosas que se pueden tocar. Nunca por debajo del mínimo táctil. */
function Opcion({
  texto,
  icono,
  destacada = false,
  onPress,
}: {
  texto: string;
  icono?: Parameters<typeof Icono>[0]['nombre'];
  destacada?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={texto}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: espacio.xs,
        minHeight: ALTO_TACTIL_MINIMO - 12,
        paddingHorizontal: espacio.md,
        paddingVertical: espacio.sm,
        borderRadius: radio.redondo,
        backgroundColor: destacada ? colores.primarioSuave : colores.fondo,
        borderWidth: 1,
        borderColor: destacada ? colores.primario : colores.borde,
        opacity: pressed ? 0.85 : 1,
        alignSelf: destacada ? 'stretch' : 'auto',
        justifyContent: destacada ? 'center' : 'flex-start',
      })}
    >
      {icono ? <Icono nombre={icono} tamano={20} color={colores.primario} /> : null}
      <Texto variante="pequeno" peso={destacada ? 'semi' : 'regular'} color={colores.primario}>
        {texto}
      </Texto>
    </Pressable>
  );
}
