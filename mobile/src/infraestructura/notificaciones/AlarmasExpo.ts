import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import type { AgendaDelDia, Preferencias } from '../../dominio/modelos';
import type {
  DatosDeNotificacion,
  ProgramadorDeAlarmas,
  RegistroDePush,
} from '../../dominio/puertos';

/**
 * ADAPTADOR de notificaciones con expo-notifications.
 *
 * Cumple dos puertos porque el telefono es el mismo aparato para las dos
 * cosas, pero conviene no confundirlas:
 *
 *  - ALARMAS LOCALES: las programa este telefono a partir de la agenda y
 *    suenan aunque no haya internet. Son las del paciente, y por eso son
 *    locales: el recordatorio de un medicamento no puede depender de la
 *    cobertura.
 *
 *  - NOTIFICACIONES REMOTAS: las envia el servidor cuando ocurre algo
 *    que este telefono no puede saber solo, como que el paciente al que
 *    acompanas se salto una toma. Son sobre todo para el cuidador.
 */

const CANAL_ANDROID = 'chronova-tomas';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class AlarmasExpo implements ProgramadorDeAlarmas, RegistroDePush {
  private canalPreparado = false;

  // ---------------------------------------------------------------
  // Permisos y canal
  // ---------------------------------------------------------------

  async pedirPermiso(): Promise<boolean> {
    try {
      await this.prepararCanal();

      const { status: actual } = await Notifications.getPermissionsAsync();
      if (actual === 'granted') return true;

      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Android exige declarar un canal para que las notificaciones puedan
   * sonar y vibrar. Sin el, llegan en silencio, que para una alarma de
   * medicamento equivale a no llegar.
   *
   * El identificador debe coincidir con el que usa el servidor al enviar.
   */
  private async prepararCanal(): Promise<void> {
    if (this.canalPreparado || Platform.OS !== 'android') return;

    await Notifications.setNotificationChannelAsync(CANAL_ANDROID, {
      name: 'Recordatorios de medicamentos',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400],
      lightColor: '#0E6E62',
      sound: 'default',
      bypassDnd: false,
    });

    this.canalPreparado = true;
  }

  // ---------------------------------------------------------------
  // Puerto RegistroDePush
  // ---------------------------------------------------------------

  plataforma(): 'android' | 'ios' | 'web' {
    if (Platform.OS === 'android') return 'android';
    if (Platform.OS === 'ios') return 'ios';
    return 'web';
  }

  /**
   * Token que identifica a este telefono ante el servicio de Expo.
   *
   * Devuelve null en varios casos normales: si el usuario no concedio
   * permiso, si se ejecuta en un emulador sin servicios de Google, o si
   * el proyecto todavia no tiene identificador de EAS. Ninguno es un
   * error: significa que esta persona no recibira avisos remotos, pero
   * las alarmas locales siguen funcionando.
   */
  async obtenerToken(): Promise<string | null> {
    try {
      if (!(await this.pedirPermiso())) return null;

      const idDeProyecto =
        (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
          ?.projectId ?? Constants.easConfig?.projectId;

      if (!idDeProyecto) {
        console.warn(
          '[push] Falta extra.eas.projectId en app.json: no se puede obtener el token. ' +
            'Las alarmas locales siguen funcionando.',
        );
        return null;
      }

      const { data } = await Notifications.getExpoPushTokenAsync({ projectId: idDeProyecto });
      return data ?? null;
    } catch (error) {
      console.warn(
        '[push] No se pudo obtener el token del dispositivo:',
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }

  /**
   * Escucha los toques sobre una notificacion.
   *
   * Nota sobre el tipo: `data` viaja como JSON libre, asi que llega como
   * un objeto sin forma garantizada. Se normaliza aqui, en el borde, para
   * que ninguna pantalla tenga que desconfiar de el.
   */
  alTocarNotificacion(manejador: (datos: DatosDeNotificacion) => void): () => void {
    try {
      const suscripcion = Notifications.addNotificationResponseReceivedListener((respuesta) => {
        manejador(normalizar(respuesta.notification.request.content.data));
      });
      return () => suscripcion.remove();
    } catch {
      // En web, o sin soporte de notificaciones: no hay nada que escuchar.
      return () => {};
    }
  }

  async notificacionQueAbrioLaApp(): Promise<DatosDeNotificacion | null> {
    try {
      const respuesta = await Notifications.getLastNotificationResponseAsync();
      if (!respuesta) return null;
      return normalizar(respuesta.notification.request.content.data);
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------
  // Puerto ProgramadorDeAlarmas
  // ---------------------------------------------------------------

  async sincronizar(agenda: AgendaDelDia, preferencias: Preferencias): Promise<void> {
    try {
      await this.prepararCanal();
      await this.cancelarTodas();

      const ahora = Date.now();

      for (const elemento of agenda.elementos) {
        if (elemento.estado === 'TOMADA' || elemento.estado === 'OMITIDA') continue;

        const instante = new Date(elemento.programadaPara).getTime();
        if (instante <= ahora) continue; // ya paso: no tiene sentido programarla

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Hora de tu ${elemento.nombreDelMedicamento}`,
            body: elemento.instrucciones
              ? `${elemento.dosis}. ${elemento.instrucciones}`
              : `Te toca ${elemento.dosis}.`,
            sound: preferencias.alertasSonoras,
            vibrate: preferencias.alertasVibracion ? [0, 400, 200, 400] : undefined,
            data: { tomaId: elemento.tomaId, medicamentoId: elemento.medicamentoId },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(instante),
            channelId: CANAL_ANDROID,
          },
        });
      }
    } catch {
      // Sin permisos o sin soporte (por ejemplo, en la version web).
      // La app sigue funcionando: solo no suenan las alarmas.
    }
  }

  async cancelarTodas(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {
      // Nada que hacer.
    }
  }
}

/** Se queda solo con los campos conocidos, y solo si son cadenas. */
function normalizar(data: unknown): DatosDeNotificacion {
  if (typeof data !== 'object' || data === null) return {};
  const bruto = data as Record<string, unknown>;
  const texto = (clave: string): string | undefined =>
    typeof bruto[clave] === 'string' ? (bruto[clave] as string) : undefined;

  return {
    tipo: texto('tipo'),
    pacienteId: texto('pacienteId'),
    tomaId: texto('tomaId'),
    medicamentoId: texto('medicamentoId'),
  };
}
