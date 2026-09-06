import { Tabs } from 'expo-router';

import { Icono } from '../../../src/ui/componentes/Icono';
import { colores } from '../../../src/ui/tema';

/**
 * Las dos pestanas del cuidador: sus pacientes y su cuenta.
 *
 * El cuidador no tenia pestana propia. Podia cerrar sesion —al final de
 * la lista de pacientes, despues de bajar por todas las tarjetas— y
 * nada mas: no podia agrandar la letra, ni abrir la politica de
 * privacidad, ni ver la constancia de la autorizacion que el mismo
 * otorgo al registrarse. Ese ultimo punto no es una comodidad: el
 * articulo 8 de la Ley 1581 de 2012 da a TODO titular el derecho a
 * pedir prueba de lo que autorizo, y el cuidador es un titular tanto
 * como el paciente.
 *
 * Va en un grupo —(inicio)— y no directamente en (cuidador) porque la
 * ficha de un paciente tiene sus propias pestanas: si estuvieran en el
 * mismo navegador, se verian dos barras de pestanas apiladas. Asi la
 * ficha se abre ENCIMA, en la pila de arriba, igual que en la
 * aplicacion del paciente. Los parentesis hacen que el grupo no
 * aparezca en la ruta: /(cuidador)/pacientes sigue siendo la direccion.
 */
export default function LayoutDePestanasDelCuidador() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colores.superficie },
        headerTintColor: colores.texto,
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: colores.primario,
        tabBarInactiveTintColor: colores.textoSuave,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '700', paddingBottom: 4 },
        tabBarStyle: { height: 76, paddingTop: 8, backgroundColor: colores.superficie },
        sceneStyle: { backgroundColor: colores.fondo },
      }}
    >
      <Tabs.Screen
        name="pacientes"
        options={{
          title: 'Pacientes',
          tabBarIcon: ({ color }) => <Icono nombre="cuidador" color={color} />,
        }}
      />
      <Tabs.Screen
        name="cuenta"
        options={{
          title: 'Mi cuenta',
          tabBarIcon: ({ color }) => <Icono nombre="cuenta" color={color} />,
        }}
      />
    </Tabs>
  );
}
