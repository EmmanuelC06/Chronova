import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';

import { ErrorDeApi } from '../../src/dominio/modelos';
import { Aviso, Boton, Campo, Texto } from '../../src/ui/componentes/basicos';
import { useSesion } from '../../src/ui/contexto/SesionContexto';
import { colores, espacio } from '../../src/ui/tema';

/**
 * Pantalla de inicio de sesion.
 *
 * Decisiones pensadas para el publico objetivo:
 *  - No se pide elegir "soy paciente" o "soy cuidador": el servidor lo
 *    deduce del correo. Una decision menos que tomar.
 *  - El error se muestra completo, arriba y en rojo, no como un mensaje
 *    diminuto debajo del campo.
 *  - El boton de entrar es grande y esta siempre visible.
 */
export default function Ingresar() {
  const { iniciarSesion } = useSesion();

  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const entrar = async () => {
    setError(null);

    if (email.trim() === '' || contrasena === '') {
      setError('Escribe tu correo y tu contrasena para continuar.');
      return;
    }

    setOcupado(true);
    try {
      await iniciarSesion(email.trim(), contrasena);
      router.replace('/');
    } catch (problema) {
      setError(
        problema instanceof ErrorDeApi
          ? problema.message
          : 'No pudimos iniciar tu sesion. Intentalo de nuevo.',
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
        contentContainerStyle={{
          padding: espacio.lg,
          gap: espacio.lg,
          flexGrow: 1,
          justifyContent: 'center',
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: espacio.sm, marginBottom: espacio.md }}>
          <Texto variante="titulo" negrita centrado>
            Chronova
          </Texto>
          <Texto centrado color={colores.textoSuave}>
            Tu tratamiento, a tiempo y acompanado.
          </Texto>
        </View>

        {error ? <Aviso mensaje={error} tono="error" /> : null}

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
          marcador="Tu contrasena"
          secreto
          autoCompletar="password"
        />

        <Boton titulo="Entrar" onPress={entrar} ocupado={ocupado} />

        <View style={{ gap: espacio.sm, marginTop: espacio.md }}>
          <Texto centrado color={colores.textoSuave}>
            ¿Todavia no tienes cuenta?
          </Texto>
          <Boton
            titulo="Crear una cuenta"
            variante="secundario"
            onPress={() => router.push('/(auth)/registro')}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
