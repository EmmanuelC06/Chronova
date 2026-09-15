import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NavegacionPorNotificaciones } from '../src/ui/contexto/NavegacionPorNotificaciones';
import { ProveedorDeSesion } from '../src/ui/contexto/SesionContexto';
import { colores } from '../src/ui/tema';

/**
 * Layout raiz de la aplicacion.
 *
 * Envuelve todo en el proveedor de sesion, que es la raiz de composicion
 * de la app movil: alli se crean el cliente de la API, el almacen de
 * sesion y el programador de alarmas, y se reparten hacia abajo.
 */
export default function LayoutRaiz() {
  return (
    <SafeAreaProvider>
      <ProveedorDeSesion>
        <StatusBar style="dark" />
        <NavegacionPorNotificaciones />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colores.superficie },
            headerTintColor: colores.texto,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: colores.fondo },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(paciente)" options={{ headerShown: false }} />
          <Stack.Screen name="(cuidador)" options={{ headerShown: false }} />
          <Stack.Screen
            name="medicamento/nuevo"
            options={{ title: 'Nuevo medicamento', presentation: 'modal' }}
          />
          <Stack.Screen
            name="medicamento/[id]"
            options={{ title: 'Editar medicamento', presentation: 'modal' }}
          />
          {/*
            Va aqui, fuera de los grupos de paciente y cuidador, porque
            se abre desde los dos y tambien desde el registro, cuando
            todavia no hay sesion ni se sabe que tipo de cuenta sera.
          */}
          <Stack.Screen
            name="privacidad"
            options={{ title: 'Mis datos y privacidad', presentation: 'modal' }}
          />
          {/*
            La politica y los terminos, completos y dentro de la app.
            Se abren desde privacidad y desde el registro, asi que viven
            aqui por la misma razon que la pantalla de arriba. El titulo
            lo pone la propia pantalla, que es la que sabe cual de los
            dos documentos le pidieron.
          */}
          <Stack.Screen name="legal" options={{ presentation: 'modal' }} />
          {/*
            Cambiar la contrasena. Fuera de los grupos por la misma razon
            que las dos de arriba: la abren el paciente y el cuidador.
          */}
          <Stack.Screen
            name="contrasena"
            options={{ title: 'Cambiar mi contraseña', presentation: 'modal' }}
          />
        </Stack>
      </ProveedorDeSesion>
    </SafeAreaProvider>
  );
}
