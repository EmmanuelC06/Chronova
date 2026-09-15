import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';

import { ErrorDeApi } from '../src/dominio/modelos';
import { Aviso, Boton, Campo, Texto } from '../src/ui/componentes/basicos';
import { useSesion } from '../src/ui/contexto/SesionContexto';
import { colores, espacio } from '../src/ui/tema';

/**
 * Cambiar la contrasena sin salir de la aplicacion.
 *
 * Antes esto no existia. La unica forma era cerrar sesion, decir que la
 * habia olvidado, esperar un codigo de seis digitos por correo y
 * teclearlo. Para una persona de setenta y cuatro años eso no es un
 * rodeo: es la razon por la que la contrasena no se cambia nunca.
 *
 * Se piden tres campos y no dos. La contrasena actual esta ahi porque un
 * telefono desbloqueado encima de una mesa, sin ella, es una cuenta
 * secuestrada por quien pase por delante. Y la nueva se pide dos veces
 * porque va oculta: un dedo torcido en un teclado pequeño, y la persona
 * se queda fuera de su cuenta sin saber que escribio.
 */
export default function CambiarContrasena() {
  const { cambiarContrasena } = useSesion();

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const desplazamiento = useRef<ScrollView>(null);

  const avisar = (mensaje: string) => {
    setError(mensaje);
    desplazamiento.current?.scrollTo({ y: 0, animated: true });
  };

  const guardar = async () => {
    setError(null);

    if (actual === '') {
      avisar('Escribe tu contraseña actual.');
      return;
    }
    if (nueva.length < 8) {
      avisar('La contraseña nueva debe tener al menos 8 caracteres.');
      return;
    }
    if (nueva !== repetida) {
      avisar('Las dos contraseñas nuevas no son iguales. Revísalas.');
      return;
    }
    if (nueva === actual) {
      avisar('La contraseña nueva tiene que ser distinta de la actual.');
      return;
    }

    setOcupado(true);
    try {
      await cambiarContrasena({ contrasenaActual: actual, nuevaContrasena: nueva });
      router.back();
    } catch (problema) {
      avisar(
        problema instanceof ErrorDeApi
          ? problema.message
          : 'No pudimos cambiar tu contraseña. Inténtalo de nuevo.',
      );
    } finally {
      setOcupado(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Cambiar mi contraseña' }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colores.fondo }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={desplazamiento}
          contentContainerStyle={{
            padding: espacio.md,
            gap: espacio.lg,
            paddingBottom: espacio.xxl,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {error ? <Aviso mensaje={error} tono="error" /> : null}

          <Texto color={colores.textoSuave}>
            Al cambiarla se cerrarán las sesiones abiertas en otros teléfonos. En este seguirás
            dentro.
          </Texto>

          <Campo
            etiqueta="Tu contraseña actual"
            valor={actual}
            onCambio={setActual}
            secreto
            autoCompletar="password"
          />

          <Campo
            etiqueta="Contraseña nueva"
            valor={nueva}
            onCambio={setNueva}
            secreto
            ayuda="Al menos 8 caracteres. Elige algo que puedas recordar."
            autoCompletar="password"
          />

          <Campo
            etiqueta="Repite la contraseña nueva"
            valor={repetida}
            onCambio={setRepetida}
            secreto
            ayuda="Para asegurarnos de que no hubo un error al escribirla."
            autoCompletar="password"
          />

          <Boton titulo="Guardar la contraseña nueva" onPress={guardar} ocupado={ocupado} />
          <Boton titulo="Cancelar" variante="texto" onPress={() => router.back()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
