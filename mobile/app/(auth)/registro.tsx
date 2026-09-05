import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';

import { ErrorDeApi } from '../../src/dominio/modelos';
import {
  TEXTO_DE_LA_ADVERTENCIA,
  TEXTO_DE_LA_AUTORIZACION,
} from '../../src/dominio/politicaDeDatos';
import { Aviso, Boton, Campo, Texto } from '../../src/ui/componentes/basicos';
import { Icono } from '../../src/ui/componentes/Icono';
import { Logo } from '../../src/ui/componentes/Logo';
import { useSesion } from '../../src/ui/contexto/SesionContexto';
import { ALTO_TACTIL_MINIMO, colores, espacio, radio } from '../../src/ui/tema';

type Rol = 'PACIENTE' | 'CUIDADOR';

/**
 * Pantalla de registro.
 *
 * Aqui si hace falta preguntar el rol, porque determina que aplicacion
 * va a usar la persona. Se pregunta con dos tarjetas grandes que
 * explican en una frase que hace cada una, en vez de un selector
 * desplegable con dos palabras sueltas.
 */
export default function Registro() {
  const { registrarPaciente, registrarCuidador } = useSesion();

  const [rol, setRol] = useState<Rol>('PACIENTE');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaDeNacimiento, setFechaDeNacimiento] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  /**
   * Empieza SIN marcar, y no es un descuido.
   *
   * Una casilla premarcada no es autorizacion expresa: es una suposicion
   * con forma de consentimiento. Para datos de salud —sensibles segun el
   * articulo 5 de la Ley 1581— la autorizacion tiene que ser un acto
   * deliberado de la persona.
   */
  const [autoriza, setAutoriza] = useState(false);

  const crear = async () => {
    setError(null);

    if (nombre.trim().length < 2) {
      setError('Escribe tu nombre completo.');
      return;
    }
    if (contrasena.length < 8) {
      setError('La contrasena debe tener al menos 8 caracteres.');
      return;
    }
    if (!autoriza) {
      setError(
        'Para crear la cuenta necesitamos que autorices el tratamiento de tus datos. ' +
          'Marca la casilla del final si estas de acuerdo.',
      );
      return;
    }
    if (fechaDeNacimiento && !/^\d{4}-\d{2}-\d{2}$/.test(fechaDeNacimiento)) {
      setError('La fecha de nacimiento debe escribirse como 1952-04-18 (ano-mes-dia).');
      return;
    }

    setOcupado(true);
    try {
      const comunes = {
        nombre: nombre.trim(),
        email: email.trim(),
        contrasena,
        telefono: telefono.trim() || null,
      };

      if (rol === 'PACIENTE') {
        await registrarPaciente({
          ...comunes,
          fechaDeNacimiento: fechaDeNacimiento || null,
          aceptaPoliticaDeDatos: autoriza,
        });
      } else {
        await registrarCuidador({ ...comunes, aceptaPoliticaDeDatos: autoriza });
      }
      router.replace('/');
    } catch (problema) {
      setError(
        problema instanceof ErrorDeApi
          ? problema.message
          : 'No pudimos crear tu cuenta. Intentalo de nuevo.',
      );
    } finally {
      setOcupado(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: espacio.lg, gap: espacio.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <Logo variante="emblema" alto={48} />

        <Texto variante="titulo" peso="negrita" centrado>
          Crear cuenta
        </Texto>

        {error ? <Aviso mensaje={error} tono="error" /> : null}

        <View style={{ gap: espacio.sm }}>
          <Texto negrita>¿Como vas a usar Chronova?</Texto>

          <OpcionDeRol
            seleccionada={rol === 'PACIENTE'}
            titulo="Sigo un tratamiento"
            descripcion="Quiero recordar mis medicamentos y llevar el control de mis tomas."
            onPress={() => setRol('PACIENTE')}
          />
          <OpcionDeRol
            seleccionada={rol === 'CUIDADOR'}
            titulo="Acompano a alguien"
            descripcion="Soy familiar, cuidador o profesional de la salud y hago seguimiento."
            onPress={() => setRol('CUIDADOR')}
          />
        </View>

        <Campo
          etiqueta="Nombre completo"
          valor={nombre}
          onCambio={setNombre}
          marcador="Rosa Elena Valencia"
          autoCompletar="name"
        />

        <Campo
          etiqueta="Correo electronico"
          valor={email}
          onCambio={setEmail}
          marcador="ejemplo@correo.com"
          tipoDeTeclado="email-address"
          autoCompletar="email"
        />

        <Campo
          etiqueta="Contrasena"
          valor={contrasena}
          onCambio={setContrasena}
          secreto
          ayuda="Al menos 8 caracteres. Elige algo que puedas recordar."
          autoCompletar="password"
        />

        <Campo
          etiqueta="Telefono (opcional)"
          valor={telefono}
          onCambio={setTelefono}
          marcador="300 123 4567"
          tipoDeTeclado="phone-pad"
          autoCompletar="tel"
        />

        {rol === 'PACIENTE' ? (
          <Campo
            etiqueta="Fecha de nacimiento (opcional)"
            valor={fechaDeNacimiento}
            onCambio={setFechaDeNacimiento}
            marcador="1952-04-18"
            ayuda="Escribela como ano-mes-dia."
          />
        ) : null}

        <CasillaDeAutorizacion marcada={autoriza} onCambiar={() => setAutoriza((v) => !v)} />

        <Boton titulo="Crear mi cuenta" onPress={crear} ocupado={ocupado} />
        <Boton titulo="Ya tengo cuenta" variante="texto" onPress={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * La casilla de autorizacion de tratamiento de datos.
 *
 * Tres cosas la hacen valida y no decorativa:
 *
 *  - Empieza SIN marcar. Una casilla premarcada no es autorizacion.
 *  - Dice explicitamente que incluye datos de SALUD y que salen del
 *    pais, porque son las dos cosas que la ley exige informar y las dos
 *    que la gente no se imagina.
 *  - Avisa de que NO esta obligada a autorizarlo (paragrafo del art. 6).
 *    Es la frase que casi ninguna aplicacion incluye, y es justo la que
 *    convierte una casilla en una decision.
 */
function CasillaDeAutorizacion({
  marcada,
  onCambiar,
}: {
  marcada: boolean;
  onCambiar: () => void;
}) {
  return (
    <View style={{ gap: espacio.sm }}>
      <Pressable
        onPress={onCambiar}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: marcada }}
        accessibilityLabel={TEXTO_DE_LA_AUTORIZACION}
        accessibilityHint={TEXTO_DE_LA_ADVERTENCIA}
        style={{
          minHeight: ALTO_TACTIL_MINIMO,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: espacio.sm,
          padding: espacio.md,
          borderRadius: radio.md,
          borderWidth: 2,
          borderColor: marcada ? colores.primario : colores.bordeFuerte,
          backgroundColor: marcada ? colores.primarioSuave : colores.superficie,
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: radio.sm,
            borderWidth: 2,
            borderColor: marcada ? colores.primario : colores.bordeFuerte,
            backgroundColor: marcada ? colores.primario : colores.superficie,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {marcada ? <Icono nombre="check" tamano={20} color={colores.textoInverso} /> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Texto variante="pequeno">{TEXTO_DE_LA_AUTORIZACION}</Texto>
        </View>
      </Pressable>

      <Texto variante="pequeno" color={colores.textoSuave}>
        {TEXTO_DE_LA_ADVERTENCIA}
      </Texto>

      <Boton
        titulo="Leer que datos guardamos y por que"
        variante="texto"
        onPress={() => router.push('/privacidad')}
      />
    </View>
  );
}

function OpcionDeRol({
  seleccionada,
  titulo,
  descripcion,
  onPress,
}: {
  seleccionada: boolean;
  titulo: string;
  descripcion: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: seleccionada }}
      accessibilityLabel={`${titulo}. ${descripcion}`}
      style={{
        minHeight: ALTO_TACTIL_MINIMO,
        padding: espacio.md,
        borderRadius: radio.md,
        borderWidth: 2,
        borderColor: seleccionada ? colores.primario : colores.borde,
        backgroundColor: seleccionada ? colores.primarioSuave : colores.superficie,
        gap: espacio.xs,
      }}
    >
      <Texto negrita color={seleccionada ? colores.primarioOscuro : colores.texto}>
        {titulo}
      </Texto>
      <Texto variante="pequeno" color={colores.textoSuave}>
        {descripcion}
      </Texto>
    </Pressable>
  );
}
