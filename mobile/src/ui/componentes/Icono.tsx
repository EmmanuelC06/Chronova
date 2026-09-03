import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { colores } from '../tema';

/**
 * Los iconos de la aplicacion.
 *
 * Antes eran EMOJI escritos como texto: ☀ 💊 📊 👤 ✓ ✕ ○ ↻. Se veian
 * bien en el simulador y mal en todo lo demas, por tres razones:
 *
 *  1. Cada sistema los dibuja a su manera. El mismo caracter es una cosa
 *     en Android, otra en iOS y otra en WhatsApp. No hay forma de que la
 *     aplicacion se vea igual en dos telefonos.
 *  2. NO SE PUEDEN PINTAR. Un emoji trae su color de fabrica, asi que un
 *     ✓ verde y un ✕ rojo no eran verde y rojo: eran el verde y el rojo
 *     que decidiera el fabricante del telefono. Con estos, el color lo
 *     pone el tema y coincide con el resto del estado.
 *  3. Un lector de pantalla los lee en voz alta con nombres absurdos
 *     ("marca de verificacion pesada"). Aqui van marcados como decorativos
 *     y quien habla es la palabra que los acompana.
 *
 * Se usa una sola familia —los trazos de MaterialCommunityIcons— para que
 * todos compartan grosor y terminacion. Mezclar familias es lo que hace
 * que un conjunto de iconos parezca reunido de prestado.
 *
 * Viene dentro de `@expo/vector-icons`, que Expo ya instala, y sus
 * tipografias las carga `expo-font`, que tambien viene con Expo. En
 * limpio: no hace falta volver a compilar la aplicacion para tenerlos.
 */

/**
 * Los nombres son del dominio, no del catalogo.
 *
 * Esta tabla es la unica que sabe como se llama cada icono en la
 * libreria. Cambiar de libreria seria cambiar esta tabla y nada mas: el
 * resto de la aplicacion pide "pastilla", no "pill".
 */
const CATALOGO = {
  // Navegacion
  hoy: 'white-balance-sunny',
  pastilla: 'pill',
  historial: 'chart-bar',
  cuenta: 'account-outline',
  volver: 'chevron-left',

  // Estados de una toma
  reloj: 'clock-outline',
  check: 'check',
  equis: 'close',
  posponer: 'backup-restore',

  // Acciones
  agregar: 'plus',
  editar: 'pencil-outline',
  inventario: 'package-variant',

  // Avisos
  aviso: 'alert-outline',
  informacion: 'information-outline',
  campana: 'bell-outline',

  // Personas
  cuidador: 'account-heart-outline',
} as const;

export type NombreDeIcono = keyof typeof CATALOGO;

export function Icono({
  nombre,
  tamano = 24,
  color = colores.texto,
}: {
  nombre: NombreDeIcono;
  tamano?: number;
  color?: string;
}) {
  return (
    <MaterialCommunityIcons
      name={CATALOGO[nombre]}
      size={tamano}
      color={color}
      // Decorativo: lo que se lee en voz alta es el texto de al lado.
      // Sin esto, TalkBack anuncia el nombre del glifo y repite la
      // informacion que la palabra ya da.
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
