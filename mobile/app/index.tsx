import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { Cargando } from '../src/ui/componentes/basicos';
import { Logo } from '../src/ui/componentes/Logo';
import { useSesion } from '../src/ui/contexto/SesionContexto';
import { colores } from '../src/ui/tema';

/**
 * Pantalla de entrada: decide a donde va el usuario.
 *
 * Paciente y cuidador tienen aplicaciones muy distintas dentro de la
 * misma app. El paciente ve su dia; el cuidador ve a sus pacientes.
 * Mezclarlas en una sola pantalla con opciones ocultas seria justo el
 * tipo de complejidad que hace que un adulto mayor abandone la app.
 */
export default function Entrada() {
  const { cargando, sesion } = useSesion();

  if (cargando) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          backgroundColor: colores.fondo,
        }}
      >
        <Logo />
        <Cargando mensaje="Abriendo Chronova..." />
      </View>
    );
  }

  if (!sesion) return <Redirect href="/(auth)/ingresar" />;

  return sesion.usuario.tipo === 'CUIDADOR' ? (
    <Redirect href="/(cuidador)/pacientes" />
  ) : (
    <Redirect href="/(paciente)/hoy" />
  );
}
