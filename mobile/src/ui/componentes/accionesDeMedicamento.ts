import { Alert, Platform } from 'react-native';

import type { Medicamento } from '../../dominio/modelos';

/**
 * Las dos acciones delicadas sobre un medicamento: reabastecer y
 * suspender.
 *
 * Viven aqui, y no en cada pantalla, porque ahora las ejecutan DOS
 * personas distintas —el paciente sobre su tratamiento y el cuidador
 * sobre el de la persona que acompana— y son exactamente las mismas
 * decisiones clinicas. Duplicarlas era garantizar que un dia el texto de
 * advertencia de una pantalla dijera una cosa y el de la otra, otra.
 *
 * El texto SI cambia segun quien actua, y eso importa: no es lo mismo
 * "dejaras de recibir recordatorios" que "Rosa dejara de recibirlos".
 */

/**
 * Nombre de la persona dueña del tratamiento, o null si es quien mira.
 *
 * Cuando es null los mensajes se escriben en segunda persona; cuando
 * trae un nombre, se habla de esa persona en tercera.
 */
export type Duena = string | null;

function soloElNombre(duena: Duena): string {
  return duena ? duena.split(' ')[0]! : '';
}

/**
 * Pregunta cuantas unidades se agregaron y llama a `aplicar`.
 *
 * `Alert.prompt` EXISTE en las dos plataformas —es un metodo estatico de
 * la clase— pero su cuerpo entero esta dentro de un if de iOS, asi que
 * en Android no hace nada y no avisa. Comprobar si la funcion existe
 * daba siempre verdadero: el boton se quedaba mudo en Android, que es la
 * plataforma en la que se prueba esta aplicacion.
 */
export function pedirReabastecimiento(
  medicamento: Medicamento,
  duena: Duena,
  aplicar: (unidades: number) => void,
): void {
  const deQuien = duena ? `${soloElNombre(duena)} agrego` : 'agregaste';

  if (Platform.OS === 'ios') {
    Alert.prompt(
      'Reabastecer',
      `¿Cuantas unidades de ${medicamento.nombre} ${deQuien}?`,
      (texto) => aplicar(Number(texto)),
      'plain-text',
      '30',
      'number-pad',
    );
    return;
  }

  Alert.alert(
    'Reabastecer',
    `Se agregaran 30 unidades a ${medicamento.nombre}. ¿Continuar?`,
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Agregar 30', onPress: () => aplicar(30) },
    ],
  );
}

/**
 * Pide confirmacion antes de suspender, y solo entonces llama a `aplicar`.
 *
 * La advertencia sobre el medico no es adorno. Suspender es la unica
 * accion de la aplicacion que apaga los recordatorios de un tratamiento
 * en curso, y cuando quien la ejecuta es el cuidador y no el paciente,
 * conviene decirlo mas claro todavia.
 */
export function confirmarSuspension(
  medicamento: Medicamento,
  duena: Duena,
  aplicar: () => void,
): void {
  const nombre = soloElNombre(duena);

  const mensaje = duena
    ? `${nombre} dejara de recibir recordatorios de ${medicamento.nombre}. Su historial se conserva.\n\nEstas cambiando el tratamiento de otra persona: hazlo solo si su medico lo indico.`
    : `Dejaras de recibir recordatorios de ${medicamento.nombre}. Tu historial se conserva.\n\nHazlo solo si tu medico lo indico.`;

  Alert.alert('Suspender medicamento', mensaje, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Suspender', style: 'destructive', onPress: aplicar },
  ]);
}
