import * as Notifications from 'expo-notifications';

import type { AgendaDelDia, Preferencias } from '../../dominio/modelos';
import type { ProgramadorDeAlarmas } from '../../dominio/puertos';

/**
 * ADAPTADOR: alarmas locales con expo-notifications.
 *
 * Son alarmas LOCALES, programadas en el propio telefono. La ventaja es
 * que suenan aunque no haya internet, que es justo lo que se necesita:
 * el recordatorio de un medicamento no puede depender de la cobertura.
 *
 * El servidor sigue siendo la fuente de la verdad de la agenda; el
 * telefono solo refleja lo que ya sabe.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class AlarmasExpo implements ProgramadorDeAlarmas {
  async pedirPermiso(): Promise<boolean> {
    try {
      const { status: actual } = await Notifications.getPermissionsAsync();
      if (actual === 'granted') return true;
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }

  async sincronizar(agenda: AgendaDelDia, preferencias: Preferencias): Promise<void> {
    try {
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
