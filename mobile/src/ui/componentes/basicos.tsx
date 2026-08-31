import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import type { KeyboardTypeOptions, StyleProp, ViewStyle } from 'react-native';

import { useSesion } from '../contexto/SesionContexto';
import {
  ALTO_TACTIL_MINIMO,
  colores,
  espacio,
  radio,
  sombra,
  tamanoDeTexto,
} from '../tema';
import type { NombreDeTamano } from '../tema';

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
  negrita?: boolean;
  centrado?: boolean;
  numeroDeLineas?: number;
  style?: StyleProp<ViewStyle>;
}

export function Texto({
  children,
  variante = 'cuerpo',
  color = colores.texto,
  negrita = false,
  centrado = false,
  numeroDeLineas,
}: TextoProps) {
  const { preferencias } = useSesion();
  return (
    <Text
      numberOfLines={numeroDeLineas}
      style={{
        fontSize: tamanoDeTexto(variante, preferencias.tamanoDeLetra),
        lineHeight: tamanoDeTexto(variante, preferencias.tamanoDeLetra) * 1.4,
        color,
        fontWeight: negrita ? '700' : '400',
        textAlign: centrado ? 'center' : 'left',
      }}
    >
      {children}
    </Text>
  );
}

// -----------------------------------------------------------------
// Boton
// -----------------------------------------------------------------

interface BotonProps {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario' | 'exito' | 'peligro' | 'texto';
  ocupado?: boolean;
  deshabilitado?: boolean;
  descripcionAccesible?: string;
  ancho?: 'completo' | 'ajustado';
}

export function Boton({
  titulo,
  onPress,
  variante = 'primario',
  ocupado = false,
  deshabilitado = false,
  descripcionAccesible,
  ancho = 'completo',
}: BotonProps) {
  const { preferencias } = useSesion();
  const inactivo = deshabilitado || ocupado;

  const estilos = {
    primario: { fondo: colores.primario, texto: colores.textoInverso, borde: 'transparent' },
    secundario: { fondo: colores.superficie, texto: colores.primario, borde: colores.primario },
    exito: { fondo: colores.exito, texto: colores.textoInverso, borde: 'transparent' },
    peligro: { fondo: colores.superficie, texto: colores.peligro, borde: colores.peligro },
    texto: { fondo: 'transparent', texto: colores.primario, borde: 'transparent' },
  }[variante];

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
        paddingHorizontal: espacio.lg,
        paddingVertical: espacio.md,
        borderRadius: radio.md,
        borderWidth: variante === 'secundario' || variante === 'peligro' ? 2 : 0,
        borderColor: estilos.borde,
        backgroundColor: estilos.fondo,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: inactivo ? 0.5 : pressed ? 0.85 : 1,
      })}
    >
      {ocupado ? (
        <ActivityIndicator color={estilos.texto} />
      ) : (
        <Text
          style={{
            color: estilos.texto,
            fontSize: tamanoDeTexto('cuerpo', preferencias.tamanoDeLetra),
            fontWeight: '700',
            textAlign: 'center',
          }}
        >
          {titulo}
        </Text>
      )}
    </Pressable>
  );
}

// -----------------------------------------------------------------
// Tarjeta
// -----------------------------------------------------------------

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
        borderLeftWidth: colorDeBorde ? 6 : 0,
        borderLeftColor: colorDeBorde,
        borderWidth: 1,
        borderColor: colores.borde,
        gap: espacio.sm,
        ...sombra,
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
  const { preferencias } = useSesion();
  const tamano = tamanoDeTexto('cuerpo', preferencias.tamanoDeLetra);

  return (
    <View style={{ gap: espacio.xs }}>
      <Texto variante="etiqueta" negrita color={colores.textoSuave}>
        {etiqueta}
      </Texto>

      <TextInput
        value={valor}
        onChangeText={onCambio}
        placeholder={marcador}
        placeholderTextColor={colores.textoSuave}
        secureTextEntry={secreto}
        keyboardType={tipoDeTeclado}
        autoCapitalize={tipoDeTeclado === 'email-address' ? 'none' : 'sentences'}
        autoCorrect={false}
        autoComplete={autoCompletar}
        accessibilityLabel={etiqueta}
        accessibilityHint={ayuda}
        style={{
          minHeight: ALTO_TACTIL_MINIMO,
          fontSize: tamano,
          color: colores.texto,
          backgroundColor: colores.superficie,
          borderWidth: 2,
          borderColor: error ? colores.peligro : colores.borde,
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
        <Texto variante="pequeno" color={colores.textoSuave}>
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
    info: { fondo: colores.primarioSuave, texto: colores.primarioOscuro, icono: 'i' },
    exito: { fondo: colores.exitoSuave, texto: colores.exito, icono: '✓' },
    advertencia: { fondo: colores.advertenciaSuave, texto: colores.advertencia, icono: '!' },
    error: { fondo: colores.peligroSuave, texto: colores.peligro, icono: '!' },
  }[tono];

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
      <Texto negrita color={estilo.texto}>
        {estilo.icono}
      </Texto>
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
  accion,
}: {
  titulo: string;
  descripcion: string;
  accion?: { titulo: string; onPress: () => void };
}) {
  return (
    <View style={{ padding: espacio.xl, alignItems: 'center', gap: espacio.md }}>
      <Texto variante="subtitulo" negrita centrado>
        {titulo}
      </Texto>
      <Texto centrado color={colores.textoSuave}>
        {descripcion}
      </Texto>
      {accion ? <Boton titulo={accion.titulo} onPress={accion.onPress} /> : null}
    </View>
  );
}

/** Etiqueta compacta de estado: color + icono + palabra. */
export function Insignia({
  texto,
  color,
  fondo,
  icono,
}: {
  texto: string;
  color: string;
  fondo: string;
  icono?: string;
}) {
  const { preferencias } = useSesion();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: espacio.xs,
        alignSelf: 'flex-start',
        alignItems: 'center',
        backgroundColor: fondo,
        borderRadius: radio.redondo,
        paddingHorizontal: espacio.md,
        paddingVertical: espacio.xs,
      }}
    >
      <Text
        style={{
          color,
          fontWeight: '700',
          fontSize: tamanoDeTexto('pequeno', preferencias.tamanoDeLetra),
        }}
      >
        {icono ? `${icono} ${texto}` : texto}
      </Text>
    </View>
  );
}
