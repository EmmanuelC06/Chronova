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
        </Stack>
      </ProveedorDeSesion>
    </SafeAreaProvider>
  );
}
