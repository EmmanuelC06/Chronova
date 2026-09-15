import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ErrorDeApi } from '../../src/dominio/modelos';
import type { TipoDeUsuario } from '../../src/dominio/modelos';
import { Aviso, Boton, Campo, Texto } from '../../src/ui/componentes/basicos';
import { Logo } from '../../src/ui/componentes/Logo';
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

  /**
   * Un mensaje que llega de otra pantalla.
   *
   * Hoy lo manda una sola: la de recuperar la contrasena, cuando el
   * cambio SI funciono pero el inicio de sesion automatico no. Sin esto,
   * esa persona aterrizaba aqui sin saber que su contrasena ya es la
   * nueva, y volvia a pedir un codigo que no necesita.
   */
  const { aviso } = useLocalSearchParams<{ aviso?: string }>();

  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  /**
   * Este correo abre dos cuentas y hay que preguntar con cual entrar.
   *
   * Solo se pone en `true` cuando el servidor lo dice, y el servidor solo
   * lo dice despues de comprobar que la contrasena es correcta para las
   * dos. Por eso la pregunta aparece DESPUES de escribir la contrasena y
   * no antes: quien tiene una sola cuenta, que es casi todo el mundo, no
   * ve nada y no elige nada. Esa era la razon de no preguntar el tipo de
   * entrada, y se conserva.
   */
  const [hayQueElegir, setHayQueElegir] = useState(false);

  const entrar = async (tipo?: TipoDeUsuario) => {
    setError(null);

    if (email.trim() === '' || contrasena === '') {
      setError('Escribe tu correo y tu contraseña para continuar.');
      return;
    }

    setOcupado(true);
    try {
      await iniciarSesion(email.trim(), contrasena, tipo);
      router.replace('/');
    } catch (problema) {
      if (problema instanceof ErrorDeApi && problema.codigo === 'CUENTA_AMBIGUA') {
        setHayQueElegir(true);
        setOcupado(false);
        return;
      }
      setError(
        problema instanceof ErrorDeApi
          ? problema.message
          : 'No pudimos iniciar tu sesión. Inténtalo de nuevo.',
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
          <Logo />
          <Texto centrado color={colores.textoSuave}>
            Tu tratamiento, a tiempo y acompañado.
          </Texto>
        </View>

        {aviso && !error ? <Aviso mensaje={aviso} tono="info" /> : null}
        {error ? <Aviso mensaje={error} tono="error" /> : null}

        <Campo
          etiqueta="Correo electrónico"
          valor={email}
          onCambio={setEmail}
          marcador="ejemplo@correo.com"
          tipoDeTeclado="email-address"
          autoCompletar="email"
        />

        <Campo
          etiqueta="Contraseña"
          valor={contrasena}
          onCambio={setContrasena}
          marcador="Tu contraseña"
          secreto
          autoCompletar="password"
        />

        {hayQueElegir ? (
          <View style={{ gap: espacio.sm }}>
            <Aviso
              mensaje="Con este correo tienes dos cuentas. ¿Con cuál quieres entrar?"
              tono="info"
            />
            <Boton
              titulo="Entrar como paciente"
              onPress={() => void entrar('PACIENTE')}
              ocupado={ocupado}
            />
            <Boton
              titulo="Entrar como acompañante"
              variante="secundario"
              onPress={() => void entrar('CUIDADOR')}
              ocupado={ocupado}
            />
          </View>
        ) : (
          <Boton titulo="Entrar" onPress={() => void entrar()} ocupado={ocupado} />
        )}

        {/* Va justo debajo de "Entrar", que es donde se busca cuando la
            contrasena no funciona. Escondida al final de la pantalla no
            la encontraria quien mas la necesita. */}
        <Boton
          titulo="Olvidé mi contraseña"
          variante="texto"
          onPress={() => router.push('/(auth)/recuperar')}
        />

        <View style={{ gap: espacio.sm, marginTop: espacio.md }}>
          <Texto centrado color={colores.textoSuave}>
            ¿Todavía no tienes cuenta?
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
