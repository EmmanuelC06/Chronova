import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Sesion } from '../../dominio/modelos';
import type { AlmacenDeSesion } from '../../dominio/puertos';

const CLAVE = 'chronova.sesion';

/**
 * ADAPTADOR: guarda la sesion en el almacenamiento del telefono.
 *
 * Que el usuario no tenga que escribir su contrasena cada vez que abre
 * la app no es comodidad: para una persona mayor, teclear un correo y
 * una contrasena en una pantalla pequena es la barrera que hace que
 * abandone la aplicacion.
 *
 * Si el almacenamiento falla (poco frecuente, pero pasa), se devuelve
 * null y el usuario simplemente vuelve a iniciar sesion. Nunca se deja
 * caer la app por esto.
 */
export class SesionEnAsyncStorage implements AlmacenDeSesion {
  async leer(): Promise<Sesion | null> {
    try {
      const texto = await AsyncStorage.getItem(CLAVE);
      return texto ? (JSON.parse(texto) as Sesion) : null;
    } catch {
      return null;
    }
  }

  async guardar(sesion: Sesion): Promise<void> {
    try {
      await AsyncStorage.setItem(CLAVE, JSON.stringify(sesion));
    } catch {
      // La sesion sigue viva en memoria; solo no sobrevivira al cierre.
    }
  }

  async borrar(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CLAVE);
    } catch {
      // Nada que hacer.
    }
  }
}
