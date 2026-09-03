import { Redirect, Tabs } from 'expo-router';

import { Icono } from '../../src/ui/componentes/Icono';
import { useSesion } from '../../src/ui/contexto/SesionContexto';
import { colores } from '../../src/ui/tema';

/**
 * Navegacion del paciente: cuatro pestanas, ni una mas.
 *
 * Cada pestana lleva icono Y palabra. Los iconos solos ahorran espacio
 * pero obligan a adivinar, y adivinar es exactamente lo que un adulto
 * mayor con poca experiencia digital no deberia tener que hacer.
 *
 * Los iconos son dibujados, no emoji. Un emoji lo pinta cada telefono a
 * su manera y trae su propio color de fabrica, asi que la pestana activa
 * no se podia tenir del color del tema: se veia igual que las demas.
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
        tabBarStyle: {
          height: 76,
          paddingTop: 8,
          backgroundColor: colores.superficie,
        },
        headerStyle: { backgroundColor: colores.superficie },
        headerTitleStyle: { fontWeight: '700', fontSize: 20 },
        sceneStyle: { backgroundColor: colores.fondo },
      }}
    >
      <Tabs.Screen
        name="hoy"
        options={{
          title: 'Hoy',
          tabBarIcon: ({ color }) => <Icono nombre="hoy" color={color} />,
        }}
      />
      <Tabs.Screen
        name="medicamentos"
        options={{
          title: 'Medicamentos',
          tabBarIcon: ({ color }) => <Icono nombre="pastilla" color={color} />,
        }}
      />
      <Tabs.Screen
        name="historial"
        options={{
          title: 'Historial',
          tabBarIcon: ({ color }) => <Icono nombre="historial" color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Mi cuenta',
          tabBarIcon: ({ color }) => <Icono nombre="cuenta" color={color} />,
        }}
      />
    </Tabs>
  );
}
