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
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colores.fondo },
      }}
    />
  );
}
