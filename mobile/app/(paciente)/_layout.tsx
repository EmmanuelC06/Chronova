import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';

import { useSesion } from '../../src/ui/contexto/SesionContexto';
import { colores } from '../../src/ui/tema';

/**
 * Navegacion del paciente: cuatro pestanas, ni una mas.
 *
 * Cada pestana lleva icono Y palabra. Los iconos solos ahorran espacio
 * pero obligan a adivinar, y adivinar es exactamente lo que un adulto
 * mayor con poca experiencia digital no deberia tener que hacer.
 */
export default function LayoutDelPaciente() {
  const { sesion, cargando } = useSesion();

  if (cargando) return null;
  if (!sesion) return <Redirect href="/(auth)/ingresar" />;
  if (sesion.usuario.tipo !== 'PACIENTE') return <Redirect href="/(cuidador)/pacientes" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colores.primario,
        tabBarInactiveTintColor: colores.textoSuave,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '700', paddingBottom: 4 },
        tabBarStyle: { height: 76, paddingTop: 8, backgroundColor: colores.superficie },
        headerStyle: { backgroundColor: colores.superficie },
        headerTitleStyle: { fontWeight: '700', fontSize: 20 },
        sceneStyle: { backgroundColor: colores.fondo },
      }}
    >
      <Tabs.Screen
        name="hoy"
        options={{
          title: 'Hoy',
          tabBarIcon: ({ color }) => <IconoDeTexto simbolo="☀" color={color} />,
        }}
      />
      <Tabs.Screen
        name="medicamentos"
        options={{
          title: 'Medicamentos',
          tabBarIcon: ({ color }) => <IconoDeTexto simbolo="💊" color={color} />,
        }}
      />
      <Tabs.Screen
        name="historial"
        options={{
          title: 'Historial',
          tabBarIcon: ({ color }) => <IconoDeTexto simbolo="📊" color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Mi cuenta',
          tabBarIcon: ({ color }) => <IconoDeTexto simbolo="👤" color={color} />,
        }}
      />
    </Tabs>
  );
}

function IconoDeTexto({ simbolo, color }: { simbolo: string; color: string }) {
  return <Text style={{ fontSize: 22, color }}>{simbolo}</Text>;
}
