import { router } from 'expo-router';

import { useSesion } from '../../src/ui/contexto/SesionContexto';
import {
  FormularioDeMedicamento,
  type DatosDelFormulario,
} from '../../src/ui/componentes/FormularioDeMedicamento';

/**
 * Alta de un medicamento.
 *
 * La pantalla es fina a proposito: todo el formulario vive en un
 * componente compartido con la pantalla de edicion, para que las reglas
 * de validacion y la forma de preguntar las cosas sean exactamente las
 * mismas al crear y al modificar.
 */
export default function NuevoMedicamento() {
  const { api, sincronizarAlarmas } = useSesion();

  const guardar = async (datos: DatosDelFormulario) => {
    await api.registrarMedicamento({ ...datos });
    // La agenda cambio: hay que rehacer las alarmas de los proximos dias.
    void sincronizarAlarmas();
    router.back();
  };

  return (
    <FormularioDeMedicamento
      textoDelBoton="Guardar medicamento"
      onGuardar={guardar}
      onCancelar={() => router.back()}
    />
  );
}
