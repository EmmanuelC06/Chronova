import {
  useFonts,
  AtkinsonHyperlegibleNext_400Regular,
  AtkinsonHyperlegibleNext_500Medium,
  AtkinsonHyperlegibleNext_600SemiBold,
  AtkinsonHyperlegibleNext_700Bold,
} from '@expo-google-fonts/atkinson-hyperlegible-next';

import { FUENTE } from './tema';

/**
 * Carga la tipografia de la aplicacion.
 *
 * Atkinson Hyperlegible Next la diseno el Braille Institute para
 * aumentar la legibilidad de personas con baja vision: sus letras se
 * distinguen unas de otras justo donde otras familias las confunden
 * —el cero lleva un corte, la ele tiene cola, la i mayuscula lleva
 * remates—. Para el publico de Chronova no es una eleccion estetica.
 *
 * Devuelve si ya esta lista. NO se bloquea la aplicacion esperandola:
 * mientras tanto se usa la tipografia del sistema, y si la carga
 * fallara —lo cual es posible— la app sigue funcionando y siendo
 * legible. Detener una aplicacion de recordatorios de medicacion en una
 * pantalla en blanco por una fuente seria un mal negocio.
 *
 * Los cuatro pesos se cargan con los nombres que el tema espera, de modo
 * que `tema.ts` es el unico sitio donde estan escritos.
 */
export function useFuenteDeLaApp(): boolean {
  const [cargada] = useFonts({
    [FUENTE.regular]: AtkinsonHyperlegibleNext_400Regular,
    [FUENTE.media]: AtkinsonHyperlegibleNext_500Medium,
    [FUENTE.semi]: AtkinsonHyperlegibleNext_600SemiBold,
    [FUENTE.negrita]: AtkinsonHyperlegibleNext_700Bold,
  });

  return cargada;
}
