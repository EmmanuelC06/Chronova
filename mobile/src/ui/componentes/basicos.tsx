import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import type { KeyboardTypeOptions } from 'react-native';

import { useSesion } from '../contexto/SesionContexto';
import {
  ALTO_TACTIL_MINIMO,
  colores,
  espacio,
  familiaYPeso,
  INTERLETRADO,
  INTERLINEADO,
  radio,
  tamanoDeTexto,
} from '../tema';
import type { NombreDeTamano, PesoDeTexto } from '../tema';
import { Icono } from './Icono';
import type { NombreDeIcono } from './Icono';

/**
 * Componentes base de la interfaz.
 *
 * Todos leen el tamano de letra que el paciente eligio, de modo que
 * cambiar la preferencia en Perfil agranda la aplicacion entera sin que
 * ninguna pantalla tenga que ocuparse de ello.
 *
 * Todos llevan ademas propiedades de accesibilidad, que es lo que
 * permite que un lector de pantalla (TalkBack o VoiceOver) lea la app en
 * voz alta a una persona con baja vision.
 */

// -----------------------------------------------------------------
// Texto
// -----------------------------------------------------------------

interface TextoProps {
  children: React.ReactNode;
  variante?: NombreDeTamano;
  color?: string;
  /**
   * Peso tipografico. `negrita` sigue existiendo como atajo del 700
   * porque lo usan decenas de pantallas, pero lo interesante son los
   * intermedios: el 500 y el 600 son los que dan jerarquia sin tener
   * que agrandar el texto.
   */
  peso?: PesoDeTexto;
  negrita?: boolean;
  centrado?: boolean;
  numeroDeLineas?: number;
}

export function Texto({
  children,
  variante = 'cuerpo',
  color = colores.texto,
  peso,
  negrita = false,
  centrado = false,
  numeroDeLineas,
}: TextoProps) {
  const { preferencias, fuenteLista } = useSesion();
  const tamano = tamanoDeTexto(variante, preferencias.tamanoDeLetra);
  const elPeso: PesoDeTexto = peso ?? (negrita ? 'negrita' : 'regular');

  return (
    <Text
      numberOfLines={numeroDeLineas}
      style={{
        ...familiaYPeso(elPeso, fuenteLista),
        fontSize: tamano,
        lineHeight: Math.round(tamano * INTERLINEADO[variante]),
        letterSpacing: INTERLETRADO[variante],
        color,
        textAlign: centrado ? 'center' : 'left',
        textTransform: variante === 'rotulo' ? 'uppercase' : undefined,
      }}
    >
      {children}
    </Text>
  );
}

/**
 * Rotulo de seccion: pequeno, en mayusculas y muy espaciado.
 *
 * Titula un GRUPO de contenido, no una tarjeta ni un dato. Antes esas
 * separaciones eran subtitulos de 22 pt en negrita, que competian con el
 * contenido que estaban ordenando.
 */
export function Rotulo({
  children,
  color = colores.textoTenue,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <Texto variante="rotulo" peso="semi" color={color}>
      {children}
    </Texto>
  );
}

// -----------------------------------------------------------------
// Boton
// -----------------------------------------------------------------

interface BotonProps {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario' | 'exito' | 'peligro' | 'texto';
  icono?: NombreDeIcono;
  ocupado?: boolean;
  deshabilitado?: boolean;
  descripcionAccesible?: string;
  ancho?: 'completo' | 'ajustado';
}

/**
 * Boton.
 *
 * El cambio importante no es de color: es de JERARQUIA. Antes las
 * variantes `secundario` y `peligro` llevaban un borde de 2 px del color
 * de su estado, asi que en una tarjeta con tres botones los tres pesaban
 * lo mismo y ninguno indicaba cual era la accion esperada. Ahora solo las
 * acciones principales van rellenas; las demas comparten un borde gris
 * de 1 px y llevan el color unicamente en el texto.
 *
 * Los 64 px de alto minimo se mantienen intactos.
 */
export function Boton({
  titulo,
  onPress,
  variante = 'primario',
  icono,
  ocupado = false,
  deshabilitado = false,
  descripcionAccesible,
  ancho = 'completo',
}: BotonProps) {
  const { preferencias, fuenteLista } = useSesion();
  const inactivo = deshabilitado || ocupado;

  const estilos = {
    primario: {
      fondo: colores.primario,
      texto: colores.textoInverso,
      borde: 'transparent',
    },
    exito: {
      fondo: colores.exito,
      texto: colores.textoInverso,
      borde: 'transparent',
    },
    secundario: {
      fondo: colores.superficie,
      texto: colores.primario,
      borde: colores.bordeFuerte,
    },
    peligro: {
      fondo: colores.superficie,
      texto: colores.peligro,
      borde: colores.bordeFuerte,
    },
    texto: {
      fondo: 'transparent',
      texto: colores.primario,
      borde: 'transparent',
    },
  }[variante];

  const conBorde = variante === 'secundario' || variante === 'peligro';
  const tamano = tamanoDeTexto('cuerpo', preferencias.tamanoDeLetra);

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityLabel={descripcionAccesible ?? titulo}
      accessibilityState={{ disabled: inactivo, busy: ocupado }}
      style={({ pressed }) => ({
        minHeight: ALTO_TACTIL_MINIMO,
        alignSelf: ancho === 'completo' ? 'stretch' : 'flex-start',
        flexDirection: 'row',
        gap: espacio.sm,
        paddingHorizontal: espacio.lg,
        paddingVertical: espacio.md,
        borderRadius: radio.md,
        borderWidth: conBorde ? 1 : 0,
        borderColor: estilos.borde,
        backgroundColor: estilos.fondo,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: inactivo ? 0.45 : pressed ? 0.85 : 1,
      })}
    >
      {ocupado ? (
        <ActivityIndicator color={estilos.texto} />
      ) : (
        <>
          {icono ? (
            <Icono nombre={icono} tamano={Math.round(tamano * 1.15)} color={estilos.texto} />
          ) : null}
          <Text
            style={{
              ...familiaYPeso('semi', fuenteLista),
              color: estilos.texto,
              fontSize: tamano,
              textAlign: 'center',
            }}
          >
            {titulo}
          </Text>
        </>
      )}
    </Pressable>
  );
}

// -----------------------------------------------------------------
// Tarjeta
// -----------------------------------------------------------------

/**
 * Tarjeta.
 *
 * Un solo recurso visual: un borde de 1 px. Antes llevaba a la vez
 * sombra, borde y una barra de color de 6 px a la izquierda, y el
 * resultado era que ninguna de las tres decia nada. El estado ahora lo
 * lleva el icono con su palabra, dentro del contenido.
 *
 * `colorDeBorde` se conserva para el unico caso en que la tarjeta entera
 * debe destacarse del resto —un medicamento por agotarse— y ahora tine
 * el borde completo en vez de anadir una barra.
 */
export function Tarjeta({
  children,
  onPress,
  colorDeBorde,
  descripcionAccesible,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  colorDeBorde?: string;
  descripcionAccesible?: string;
}) {
  const contenido = (
    <View
      style={{
        backgroundColor: colores.superficie,
        borderRadius: radio.lg,
        padding: espacio.md,
        borderWidth: 1,
        borderColor: colorDeBorde ?? colores.borde,
        gap: espacio.sm,
      }}
    >
      {children}
    </View>
  );

  if (!onPress) return contenido;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={descripcionAccesible}
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
    >
      {contenido}
    </Pressable>
  );
}

/**
 * Icono dentro de un cuadro tenido del color del estado.
 *
 * Es el recurso que sustituye a la barra lateral: ocupa poco, se ve de
 * lejos y va acompanado siempre de la palabra del estado.
 */
export function IconoDeEstado({
  nombre,
  color,
  fondo,
  lado = 44,
}: {
  nombre: NombreDeIcono;
  color: string;
  fondo: string;
  lado?: number;
}) {
  return (
    <View
      style={{
        width: lado,
        height: lado,
        borderRadius: radio.sm,
        backgroundColor: fondo,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icono nombre={nombre} tamano={Math.round(lado * 0.5)} color={color} />
    </View>
  );
}

// -----------------------------------------------------------------
// Campo de texto
// -----------------------------------------------------------------

interface CampoProps {
  etiqueta: string;
  valor: string;
  onCambio: (valor: string) => void;
  marcador?: string;
  secreto?: boolean;
  tipoDeTeclado?: KeyboardTypeOptions;
  ayuda?: string;
  error?: string;
  autoCompletar?: 'email' | 'password' | 'name' | 'tel' | 'off';
}

export function Campo({
  etiqueta,
  valor,
  onCambio,
  marcador,
  secreto = false,
  tipoDeTeclado = 'default',
  ayuda,
  error,
  autoCompletar = 'off',
}: CampoProps) {
  const { preferencias, fuenteLista } = useSesion();
  const tamano = tamanoDeTexto('cuerpo', preferencias.tamanoDeLetra);

  return (
    <View style={{ gap: espacio.xs }}>
      <Rotulo>{etiqueta}</Rotulo>

      <TextInput
        value={valor}
        onChangeText={onCambio}
        placeholder={marcador}
        placeholderTextColor={colores.textoTenue}
        secureTextEntry={secreto}
        keyboardType={tipoDeTeclado}
        autoCapitalize={tipoDeTeclado === 'email-address' ? 'none' : 'sentences'}
        autoCorrect={false}
        autoComplete={autoCompletar}
        accessibilityLabel={etiqueta}
        accessibilityHint={ayuda}
        style={{
          ...familiaYPeso('regular', fuenteLista),
          minHeight: ALTO_TACTIL_MINIMO,
          fontSize: tamano,
          color: colores.texto,
          backgroundColor: colores.superficie,
          borderWidth: 1,
          borderColor: error ? colores.peligro : colores.bordeFuerte,
          borderRadius: radio.md,
          paddingHorizontal: espacio.md,
          paddingVertical: espacio.sm,
        }}
      />

      {error ? (
        <Texto variante="pequeno" color={colores.peligro}>
          {error}
        </Texto>
      ) : ayuda ? (
        <Texto variante="pequeno" color={colores.textoTenue}>
          {ayuda}
        </Texto>
      ) : null}
    </View>
  );
}

// -----------------------------------------------------------------
// Avisos y estados
// -----------------------------------------------------------------

export function Aviso({
  mensaje,
  tono = 'info',
}: {
  mensaje: string;
  tono?: 'info' | 'exito' | 'advertencia' | 'error';
}) {
  const estilo = {
    info: {
      fondo: colores.primarioSuave,
      texto: colores.primarioOscuro,
      icono: 'informacion',
    },
    exito: { fondo: colores.exitoSuave, texto: colores.exito, icono: 'check' },
    advertencia: {
      fondo: colores.advertenciaSuave,
      texto: colores.advertencia,
      icono: 'aviso',
    },
    error: {
      fondo: colores.peligroSuave,
      texto: colores.peligro,
      icono: 'aviso',
    },
  }[tono] as { fondo: string; texto: string; icono: NombreDeIcono };

  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        gap: espacio.sm,
        alignItems: 'flex-start',
        backgroundColor: estilo.fondo,
        borderRadius: radio.md,
        padding: espacio.md,
      }}
    >
      <View style={{ marginTop: 2 }}>
        <Icono nombre={estilo.icono} tamano={20} color={estilo.texto} />
      </View>
      <View style={{ flex: 1 }}>
        <Texto color={estilo.texto}>{mensaje}</Texto>
      </View>
    </View>
  );
}

export function Cargando({ mensaje = 'Cargando...' }: { mensaje?: string }) {
  return (
    <View style={{ padding: espacio.xl, alignItems: 'center', gap: espacio.md }}>
      <ActivityIndicator size="large" color={colores.primario} />
      <Texto color={colores.textoSuave}>{mensaje}</Texto>
    </View>
  );
}

export function EstadoVacio({
  titulo,
  descripcion,
  icono,
  accion,
}: {
  titulo: string;
  descripcion: string;
  icono?: NombreDeIcono;
  accion?: { titulo: string; onPress: () => void };
}) {
  return (
    <View
      style={{
        paddingVertical: espacio.xl,
        paddingHorizontal: espacio.md,
        alignItems: 'center',
        gap: espacio.md,
      }}
    >
      {icono ? <Icono nombre={icono} tamano={44} color={colores.bordeFuerte} /> : null}
      <Texto variante="subtitulo" peso="semi" centrado>
        {titulo}
      </Texto>
      <Texto centrado color={colores.textoSuave}>
        {descripcion}
      </Texto>
      {accion ? <Boton titulo={accion.titulo} onPress={accion.onPress} /> : null}
    </View>
  );
}

/** Etiqueta compacta de estado: color + icono + palabra. Nunca solo color. */
export function Insignia({
  texto,
  color,
  fondo,
  icono,
}: {
  texto: string;
  color: string;
  fondo: string;
  icono?: NombreDeIcono;
}) {
  const { preferencias, fuenteLista } = useSesion();
  const tamano = tamanoDeTexto('pequeno', preferencias.tamanoDeLetra);

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: espacio.xs,
        alignSelf: 'flex-start',
        alignItems: 'center',
        backgroundColor: fondo,
        borderRadius: radio.redondo,
        paddingHorizontal: espacio.sm + espacio.xs,
        paddingVertical: espacio.xs,
      }}
    >
      {icono ? <Icono nombre={icono} tamano={Math.round(tamano * 1.15)} color={color} /> : null}
      <Text
        style={{
          ...familiaYPeso('semi', fuenteLista),
          color,
          fontSize: tamano,
        }}
      >
        {texto}
      </Text>
    </View>
  );
}
