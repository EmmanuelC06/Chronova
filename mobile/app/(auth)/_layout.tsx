import { Stack } from 'expo-router';

import { colores } from '../../src/ui/tema';

export default function LayoutDeAutenticacion() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colores.fondo },
      }}
    />
  );
}
