import { useCallback, useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ErrorDeApi } from '../../src/dominio/modelos';
import type { Medicamento } from '../../src/dominio/modelos';
import { Aviso, Boton, Cargando, EstadoVacio } from '../../src/ui/componentes/basicos';
import {
  FormularioDeMedicamento,
  type DatosDelFormulario,
} from '../../src/ui/componentes/FormularioDeMedicamento';
import { useSesion } from '../../src/ui/contexto/SesionContexto';
import { espacio } from '../../src/ui/tema';

/**
 * Edicion de un medicamento.
 *
 * Cierra el RF-08, que existia en el servidor desde el principio y no
 * tenia forma de alcanzarse desde la aplicacion. Sin esto, cambiar la
 * dosis que ajusto el medico obligaba a suspender el medicamento y crear
 * otro, perdiendo su historial de tomas: justo la evidencia del
 * tratamiento que el proyecto existe para conservar.
 *
 * El servidor ya se encarga de lo delicado: si cambian las horas, los
 * dias o la fecha de fin, retira las tomas futuras generadas con la
 * definicion anterior y deja intactas las que ya ocurrieron.
 */
export default function EditarMedicamento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, sincronizarAlarmas } = useSesion();

  const [medicamento, setMedicamento] = useState<Medicamento | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setError(null);
      const lista = await api.listarMedicamentos();
      setMedicamento(lista.find((m) => m.id === id) ?? null);
    } catch (problema) {
      setError(
        problema instanceof ErrorDeApi
          ? problema.message
          : 'No pudimos cargar este medicamento.',
      );
    } finally {
      setCargando(false);
    }
  }, [api, id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const guardar = async (datos: DatosDelFormulario) => {
    // El inventario no se toca aqui: tiene su propio endpoint y su propio
    // boton en la lista. Enviarlo desde este formulario lo sobreescribiria
    // con lo que hubiera en pantalla.
    const { stock: _sinUsar, ...cambios } = datos;
    await api.actualizarMedicamento(String(id), cambios);
    void sincronizarAlarmas();
    router.back();
  };

  if (cargando) return <Cargando mensaje="Cargando el medicamento..." />;

  if (error) {
    return (
      <ScrollView contentContainerStyle={{ padding: espacio.md, gap: espacio.md }}>
        <Aviso mensaje={error} tono="error" />
        <Boton titulo="Reintentar" onPress={() => void cargar()} />
        <Boton titulo="Volver" variante="texto" onPress={() => router.back()} />
      </ScrollView>
    );
  }

  if (!medicamento) {
    return (
      <ScrollView contentContainerStyle={{ padding: espacio.md }}>
        <EstadoVacio
          titulo="No encontramos este medicamento"
          descripcion="Puede que lo hayas suspendido desde otro dispositivo."
          accion={{ titulo: 'Volver', onPress: () => router.back() }}
        />
      </ScrollView>
    );
  }

  return (
    <FormularioDeMedicamento
      inicial={medicamento}
      textoDelBoton="Guardar cambios"
      onGuardar={guardar}
      onCancelar={() => router.back()}
    />
  );
}
