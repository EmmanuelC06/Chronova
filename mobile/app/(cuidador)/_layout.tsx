import { Redirect, Stack } from 'expo-router';

import { useSesion } from '../../src/ui/contexto/SesionContexto';
import { colores } from '../../src/ui/tema';

export default function LayoutDelCuidador() {
  const { sesion, cargando } = useSesion();

  if (cargando) return null;
  if (!sesion) return <Redirect href="/(auth)/ingresar" />;
  if (sesion.usuario.tipo !== 'CUIDADOR') return <Redirect href="/(paciente)/hoy" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colores.superficie },
        headerTintColor: colores.texto,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colores.fondo },
      }}
    >
      <Stack.Screen name="pacientes" options={{ title: 'Tus pacientes' }} />
      {/* El titulo real lo pone la pantalla cuando sabe de quien se
          trata; este es el que se ve mientras carga. */}
      <Stack.Screen name="paciente/[id]" options={{ title: 'Paciente' }} />
    </Stack>
  );
}
