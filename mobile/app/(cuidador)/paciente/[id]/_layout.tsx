import { RefreshControl, ScrollView } from 'react-native';
import { Stack, Tabs, useLocalSearchParams } from 'expo-router';

import { Aviso, Cargando } from '../../../../src/ui/componentes/basicos';
import { Icono } from '../../../../src/ui/componentes/Icono';
import {
  ProveedorDePacienteObservado,
  usePacienteObservado,
} from '../../../../src/ui/contexto/PacienteObservadoContexto';
import { colores, espacio } from '../../../../src/ui/tema';

/**
 * La ficha de un paciente, en tres pestanas.
 *
 * Antes era un solo desplazamiento larguisimo: el porcentaje, la agenda
 * de hoy, las tomas que se salto, la grafica y el tratamiento, todo
 * seguido. Funcionaba para mirar, pero desde que el cuidador tambien
 * puede EDITAR la medicacion dejo de funcionar: para agregar un
 * medicamento habia que bajar por delante de todo lo demas.
 *
 * Separarlo en pestanas responde a que son tres preguntas distintas y no
 * se hacen a la vez:
 *
 *   Hoy         -> "¿como va hoy? ¿le falta alguna toma?"
 *   Tratamiento -> "¿que esta tomando? quiero cambiar algo"
 *   Historial   -> "¿que ha pasado esta semana?"
 *
 * Es la misma division que ya tiene la aplicacion del paciente, asi que
 * quien use las dos no aprende dos cosas.
 *
 * Los datos se cargan UNA vez, en el proveedor que envuelve las tres.
 */
export default function LayoutDeLaFicha() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ProveedorDePacienteObservado pacienteId={String(id)}>
      <Contenido />
    </ProveedorDePacienteObservado>
  );
}

/**
 * Decide si hay ficha que mostrar.
 *
 * Los tres motivos de bloqueo se resuelven AQUI y no dentro de cada
 * pestana: si el paciente no acepto el vinculo, ensenar tres pestanas
 * vacias con el mismo aviso repetido seria peor que un solo mensaje
 * claro. Va en un componente aparte porque necesita estar por dentro del
 * proveedor para poder leerlo.
 */
function Contenido() {
  const { nombre, nombreCorto, cargando, bloqueo, refrescando, alTirarParaRefrescar } =
    usePacienteObservado();

  if (cargando) {
    return (
      <>
        <Stack.Screen options={{ title: 'Paciente' }} />
        <Cargando mensaje="Cargando la informacion..." />
      </>
    );
  }

  if (bloqueo) {
    // Los dos motivos que pueden desaparecer solos —se recupera la senal,
    // el paciente acepta la solicitud— ofrecen reintentar. Los otros dos
    // no dependen de esta pantalla, y un gesto que no cambia nada se lee
    // como que la app se colgo.
    const sePuedeReintentar = bloqueo === 'FALLO_DE_CARGA' || bloqueo === 'SIN_ACEPTAR';
    const sinNombre = bloqueo === 'NO_ENCONTRADO' || bloqueo === 'FALLO_DE_CARGA';

    return (
      <>
        <Stack.Screen options={{ title: sinNombre ? 'Paciente' : nombre }} />
        <ScrollView
          contentContainerStyle={{ padding: espacio.md, gap: espacio.md }}
          // Antes este aviso decia "Baja para reintentar" y el gesto no
          // estaba conectado. Prometer una salida que no existe es peor
          // que no ofrecerla: el cuidador tiraba hacia abajo hasta que se
          // le acababa la paciencia.
          refreshControl={
            sePuedeReintentar ? (
              <RefreshControl
                refreshing={refrescando}
                onRefresh={alTirarParaRefrescar}
                tintColor={colores.primario}
              />
            ) : undefined
          }
        >
          <Aviso {...MENSAJE_DE_BLOQUEO[bloqueo](nombre, nombreCorto)} />
        </ScrollView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: nombre }} />
      <Tabs
        screenOptions={{
          // El encabezado lo pone la pila de arriba, con el nombre del
          // paciente. Dos encabezados apilados serian una franja doble.
          headerShown: false,
          tabBarActiveTintColor: colores.primario,
          tabBarInactiveTintColor: colores.textoSuave,
          tabBarLabelStyle: {
            fontSize: 13,
            fontWeight: '700',
            paddingBottom: 4,
          },
          tabBarStyle: {
            height: 76,
            paddingTop: 8,
            backgroundColor: colores.superficie,
          },
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
          name="tratamiento"
          options={{
            title: 'Tratamiento',
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
      </Tabs>
    </>
  );
}

/**
 * Se distingue "no pudimos preguntar" de "no esta". Decirle a un cuidador
 * que su madre le revoco el acceso cuando lo unico que pasa es que se
 * cayo el wifi es un mensaje falso y alarmante.
 */
const MENSAJE_DE_BLOQUEO: Record<
  'NO_ENCONTRADO' | 'SIN_ACEPTAR' | 'SIN_PERMISO' | 'FALLO_DE_CARGA',
  (nombre: string, corto: string) => { mensaje: string; tono: 'info' | 'advertencia' | 'error' }
> = {
  FALLO_DE_CARGA: () => ({
    mensaje:
      'No pudimos conectarnos para traer la informacion de este paciente. Revisa tu conexion y baja para reintentar.',
    tono: 'error',
  }),
  NO_ENCONTRADO: () => ({
    mensaje:
      'Este paciente ya no aparece entre los que acompanas. Es probable que el vinculo se haya revocado.',
    tono: 'advertencia',
  }),
  SIN_ACEPTAR: (nombre) => ({
    mensaje: `${nombre} todavia no ha aceptado tu solicitud. Hasta que lo haga no puedes ver su tratamiento. Baja para comprobar si ya respondio.`,
    tono: 'info',
  }),
  SIN_PERMISO: (nombre) => ({
    mensaje: `${nombre} no te ha concedido permiso para ver su tratamiento. Solo el paciente puede cambiarlo, desde su perfil.`,
    tono: 'advertencia',
  }),
};
