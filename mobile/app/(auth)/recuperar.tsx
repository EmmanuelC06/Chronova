import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';

import { ErrorDeApi } from '../../src/dominio/modelos';
import { Aviso, Boton, Campo, Texto } from '../../src/ui/componentes/basicos';
import { useSesion } from '../../src/ui/contexto/SesionContexto';
import { colores, espacio } from '../../src/ui/tema';

/**
 * PANTALLA: recuperar la contrasena.
 *
 * Es un solo formulario en dos pasos, no dos pantallas separadas, y la
 * razon es practica: el correo con el codigo se abre en otra aplicacion,
 * y al volver la persona tiene que encontrar las cosas donde las dejo. Si
 * hubiera navegado a otra pantalla, volver seria empezar de cero.
 *
 * El codigo son seis numeros en vez de un enlace porque el correo suele
 * abrirse en un aparato distinto del telefono donde esta la aplicacion, y
 * porque los clientes de correo reescriben los enlaces hasta romperlos.
 * Un numero se lee en una pantalla y se teclea en otra.
 */
export default function Recuperar() {
  const { api, iniciarSesion } = useSesion();

  const [paso, setPaso] = useState<'PEDIR' | 'CONFIRMAR'>('PEDIR');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const pedirCodigo = async () => {
    setError(null);
    setAviso(null);

    if (email.trim() === '') {
      setError('Escribe el correo de tu cuenta.');
      return;
    }

    setOcupado(true);
    try {
      const resultado = await api.solicitarRecuperacion(email.trim());
      setAviso(resultado.mensaje);
      setPaso('CONFIRMAR');
    } catch (problema) {
      setError(
        problema instanceof ErrorDeApi
          ? problema.message
          : 'No pudimos enviar el codigo. Revisa tu conexion.',
      );
    } finally {
      setOcupado(false);
    }
  };

  const confirmar = async () => {
    setError(null);

    if (codigo.trim() === '') {
      setError('Escribe el codigo que te llego al correo.');
      return;
    }
    if (nuevaContrasena.length < 8) {
      setError('La contrasena nueva debe tener al menos 8 caracteres.');
      return;
    }

    setOcupado(true);
    try {
      await api.restablecerContrasena({
        email: email.trim(),
        codigo: codigo.trim(),
        nuevaContrasena,
      });

      // Se entra sola: la persona acaba de escribir su contrasena nueva
      // dos pasos atras, obligarla a teclearla otra vez es maltratarla.
      await iniciarSesion(email.trim(), nuevaContrasena);
      router.replace('/');
    } catch (problema) {
      setError(
        problema instanceof ErrorDeApi
          ? problema.message
          : 'No pudimos cambiar tu contrasena.',
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
        contentContainerStyle={{ padding: espacio.md, gap: espacio.md, paddingBottom: espacio.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        <Texto variante="subtitulo" negrita>
          Recuperar tu contrasena
        </Texto>

        {error ? <Aviso mensaje={error} tono="error" /> : null}
        {aviso ? <Aviso mensaje={aviso} tono="info" /> : null}

        <Campo
          etiqueta="Tu correo"
          valor={email}
          onCambio={setEmail}
          marcador="correo@ejemplo.com"
          tipoDeTeclado="email-address"
          autoCompletar="email"
          ayuda="El mismo con el que creaste tu cuenta."
        />

        {paso === 'PEDIR' ? (
          <Boton titulo="Enviarme un codigo" onPress={pedirCodigo} ocupado={ocupado} />
        ) : (
          <View style={{ gap: espacio.md }}>
            <Campo
              etiqueta="Codigo del correo"
              valor={codigo}
              onCambio={setCodigo}
              marcador="6 numeros"
              tipoDeTeclado="number-pad"
              ayuda="Revisa tu correo. Si no llega, mira en la carpeta de correo no deseado."
            />

            <Campo
              etiqueta="Tu contrasena nueva"
              valor={nuevaContrasena}
              onCambio={setNuevaContrasena}
              marcador="Al menos 8 caracteres"
              secreto
              autoCompletar="password"
              ayuda="Elige algo que puedas recordar y que nadie mas adivine."
            />

            <Boton titulo="Cambiar mi contrasena" onPress={confirmar} ocupado={ocupado} />

            <Boton
              titulo="Enviarme otro codigo"
              variante="secundario"
              deshabilitado={ocupado}
              onPress={() => {
                setCodigo('');
                void pedirCodigo();
              }}
            />
          </View>
        )}

        <Boton titulo="Volver" variante="texto" onPress={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
