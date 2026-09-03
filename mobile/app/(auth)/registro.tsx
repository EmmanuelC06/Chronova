import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';

import { ErrorDeApi } from '../../src/dominio/modelos';
import { Aviso, Boton, Campo, Texto } from '../../src/ui/componentes/basicos';
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
        });
      } else {
        await registrarCuidador(comunes);
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
        <Texto variante="titulo" negrita>
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

        <Boton titulo="Crear mi cuenta" onPress={crear} ocupado={ocupado} />
        <Boton titulo="Ya tengo cuenta" variante="texto" onPress={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
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
