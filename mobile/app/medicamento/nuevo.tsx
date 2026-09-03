import { router, useLocalSearchParams } from 'expo-router';

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
 *
 * Acepta un `pacienteId` opcional. Sin el, el medicamento es de quien
 * tiene la sesion abierta —el caso del paciente—; con el, lo esta
 * registrando un cuidador para la persona que acompana. Quien puede
 * hacer eso NO lo decide esta pantalla: el servidor exige un vinculo
 * aceptado con el permiso `puedeGestionarMedicamentos`, y responde 403
 * si no lo hay. Aqui solo se envia el dato.
 */
export default function NuevoMedicamento() {
  const { pacienteId } = useLocalSearchParams<{ pacienteId?: string }>();
  const { api, sincronizarAlarmas } = useSesion();

  const guardar = async (datos: DatosDelFormulario) => {
    await api.registrarMedicamento({
      ...datos,
      ...(pacienteId ? { pacienteId } : {}),
    });

    // Las alarmas locales son las de ESTE telefono. Si el medicamento es
    // de otra persona, las suyas se programaran en el suyo la proxima
    // vez que abra la aplicacion; rehacerlas aqui solo borraria las de
    // quien esta mirando.
    if (!pacienteId) void sincronizarAlarmas();

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
