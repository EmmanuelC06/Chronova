import { Image, View } from 'react-native';

import { espacio } from '../tema';

/**
 * La marca de Chronova.
 *
 * Dos formas, y la eleccion no es de gusto:
 *
 *  - `completo` — emblema y palabra. Va donde la persona todavia no sabe
 *    en que aplicacion esta: la pantalla de ingreso, la de registro, la
 *    de recuperar la contrasena.
 *  - `emblema` — solo el simbolo. Va donde ya lo sabe y la marca solo
 *    tiene que acompanar sin ocupar sitio.
 *
 * El archivo es un PNG con transparencia recortado del logo original,
 * que venia sobre un fondo claro. `resizeMode="contain"` es
 * imprescindible: sin el, React Native deforma la imagen para rellenar
 * la caja y el circulo del reloj sale ovalado.
 *
 * Lleva `accessibilityRole="image"` con su texto, de modo que un lector
 * de pantalla diga "Chronova" en vez de saltarselo en silencio.
 */
export function Logo({
  variante = 'completo',
  alto,
}: {
  variante?: 'completo' | 'emblema';
  alto?: number;
}) {
  const completo = variante === 'completo';
  const altura = alto ?? (completo ? 104 : 56);

  // Proporciones reales de los archivos, para reservar el ancho exacto y
  // que el logo no salte al terminar de cargar la imagen.
  const proporcion = completo ? 507 / 360 : 257 / 256;

  return (
    <View style={{ alignItems: 'center', paddingVertical: espacio.sm }}>
      <Image
        source={
          completo
            ? require('../../../assets/logotipo.png')
            : require('../../../assets/emblema.png')
        }
        style={{ height: altura, width: altura * proporcion }}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="Chronova"
      />
    </View>
  );
}
