import { ScrollView, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

import {
  AVISO_DE_BORRADOR,
  DOCUMENTOS_LEGALES,
  FECHA_DE_VIGENCIA,
  POLITICA_APROBADA,
  esClaveDeDocumento,
  type BloqueLegal,
  type DocumentoLegal,
} from '../src/dominio/textosLegales';
import { Aviso, Rotulo, Tarjeta, Texto } from '../src/ui/componentes/basicos';
import { colores, espacio, radio } from '../src/ui/tema';

/**
 * Los documentos legales, leidos dentro de la app.
 *
 * Antes estos dos documentos eran dos botones que abrian el navegador en
 * `chronova.app`, un dominio que todavia no existe: la persona tocaba
 * "Leer la politica completa" y le aparecia una pagina en blanco. El
 * arreglo no es corregir la direccion, es quitarla. Un documento legal
 * que solo existe si hay internet, si el dominio esta contratado y si el
 * navegador abre, no es un documento al que el titular tenga acceso.
 *
 * Una sola pantalla sirve a los dos porque son la misma cosa: texto
 * largo que hay que poder leer con calma. La clave viaja en la ruta
 * (`/legal?doc=politica`), y si llega cualquier otra cosa se muestra la
 * politica, que es la que la ley exige que sea alcanzable.
 */
export default function Legal() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const documento: DocumentoLegal = esClaveDeDocumento(doc)
    ? DOCUMENTOS_LEGALES[doc]
    : DOCUMENTOS_LEGALES.politica;

  return (
    <>
      <Stack.Screen options={{ title: documento.tituloCorto }} />
      <ScrollView
        contentContainerStyle={{
          padding: espacio.md,
          gap: espacio.md,
          paddingBottom: espacio.xxl,
        }}
      >
        <View style={{ gap: espacio.xs }}>
          <Texto variante="titulo" peso="negrita">
            {documento.titulo}
          </Texto>
          <Texto variante="pequeno" color={colores.textoTenue}>
            Versión {documento.version} · Vigente desde: {FECHA_DE_VIGENCIA}
          </Texto>
        </View>

        {POLITICA_APROBADA ? null : <Aviso mensaje={AVISO_DE_BORRADOR} tono="advertencia" />}

        {documento.secciones.map((seccion) => (
          <Tarjeta key={seccion.titulo}>
            <Rotulo>{seccion.titulo}</Rotulo>
            {seccion.bloques.map((bloque, indice) => (
              <Bloque key={indice} bloque={bloque} />
            ))}
          </Tarjeta>
        ))}

        <Texto variante="pequeno" color={colores.textoTenue}>
          Este texto es el mismo que se conserva en el repositorio del proyecto, en su versión{' '}
          {documento.version}. Guardamos la versión que aceptaste y la fecha, para que siempre
          puedas comprobar exactamente qué autorizaste.
        </Texto>
      </ScrollView>
    </>
  );
}

/**
 * Un bloque del documento.
 *
 * Las tablas del documento original no sobreviven a una pantalla de
 * telefono, asi que aqui hay cuatro formas y ninguna es una tabla: el
 * parrafo, la lista, el dato con su etiqueta (que es en lo que se
 * convierten las tablas de dos columnas) y el aviso, para lo que no
 * puede pasarse por alto leyendo en diagonal.
 */
function Bloque({ bloque }: { bloque: BloqueLegal }) {
  if (bloque.tipo === 'parrafo') {
    return <Texto color={colores.textoSuave}>{bloque.texto}</Texto>;
  }

  if (bloque.tipo === 'lista') {
    return (
      <View style={{ gap: espacio.xs }}>
        {bloque.puntos.map((punto) => (
          <View key={punto} style={{ flexDirection: 'row', gap: espacio.sm }}>
            <Texto color={colores.textoTenue}>•</Texto>
            <View style={{ flex: 1 }}>
              <Texto color={colores.textoSuave}>{punto}</Texto>
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (bloque.tipo === 'dato') {
    /*
      La etiqueta va ENCIMA del valor, no al lado.
      Con las dos en la misma fila, `protecciondedatos@amigo.edu.co` se
      salia de la tarjeta: es una sola palabra de treinta caracteres, sin
      espacios donde partirla, y lo que le quedaba era la mitad del ancho.
      Y esta app deja agrandar la letra, asi que el caso peor no es el de
      la captura: es el de alguien que la puso en grande porque ve mal, y
      entonces no se corta el correo por dos pixeles sino por la mitad.
      Apilado, el valor dispone del ancho completo de la tarjeta.
    */
    return (
      <View style={{ gap: 2 }}>
        <Texto variante="pequeno" peso="semi" color={colores.textoTenue}>
          {bloque.etiqueta}
        </Texto>
        <ValorPartible valor={bloque.valor} />
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: colores.primarioSuave,
        borderRadius: radio.sm,
        padding: espacio.sm,
      }}
    >
      <Texto color={colores.texto}>{bloque.texto}</Texto>
    </View>
  );
}

/**
 * Un valor que puede ser una sola palabra larguisima, partido donde debe.
 *
 * `protecciondedatos@amigo.edu.co` son treinta caracteres sin un solo
 * espacio. Con la letra en "muy grande" mide mas que el ancho de la
 * tarjeta, y ahi cada sistema hace lo que quiere: Android lo parte por
 * cualquier letra y iOS puede recortarlo. Un correo de contacto recortado
 * es un correo inservible, y es el unico camino que tiene la persona para
 * ejercer sus derechos.
 *
 * En vez de confiar en como parte las palabras cada plataforma, se parte
 * aqui: el valor se trocea por la arroba y por los puntos, y cada trozo es
 * un `Texto` dentro de una fila que envuelve. Asi el corte cae siempre en
 * un sitio que se lee bien, y el texto sigue siendo texto plano, sin
 * caracteres invisibles que se cuelen al copiarlo.
 */
function ValorPartible({ valor }: { valor: string }) {
  const trozos = partirDespuesDe(valor, '@.');

  if (trozos.length === 1) return <Texto peso="media">{valor}</Texto>;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {trozos.map((trozo, indice) => (
        <Texto key={`${trozo}-${indice}`} peso="media">
          {trozo}
        </Texto>
      ))}
    </View>
  );
}

/**
 * Parte una cadena justo despues de cada caracter de `separadores`.
 *
 * A mano y no con una expresion regular a proposito: lo natural aqui
 * seria `valor.split(/(?<=[@.])/)`, pero eso es una mirada atras, y
 * Hermes —el motor de JavaScript con el que corre la app en el telefono—
 * no la admite en todas sus versiones. Fallaria en el dispositivo y no
 * al compilar, que es la peor combinacion posible. Diez lineas de
 * bucle no fallan en ningun sitio.
 */
function partirDespuesDe(valor: string, separadores: string): string[] {
  const trozos: string[] = [];
  let actual = '';

  for (const caracter of valor) {
    actual += caracter;
    if (separadores.includes(caracter)) {
      trozos.push(actual);
      actual = '';
    }
  }
  if (actual !== '') trozos.push(actual);

  return trozos;
}
