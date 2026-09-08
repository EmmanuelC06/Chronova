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

/**
 * Tope de alarmas programadas a la vez.
 *
 * iOS no admite mas de 64 notificaciones locales pendientes por
 * aplicacion y descarta en silencio las que sobran. Se deja margen por
 * debajo de ese limite para no depender de un comportamiento que no
 * avisa cuando falla.
 */
const MAXIMO_DE_ALARMAS = 60;

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

  /**
   * Que ya se explico por que no hay avisos remotos.
   *
   * El motivo no cambia durante la ejecucion —o hay credenciales de
   * Firebase o no las hay—, asi que repetir el aviso en cada inicio de
   * sesion solo llena la consola y entierra los mensajes que si son
   * nuevos. Se dice una vez y con todas las letras.
   */
  private yaSeExplicoLaFaltaDeToken = false;

  /**
   * Cola de sincronizacion, con una sola tarea pendiente.
   *
   * `sincronizar` borra todas las alarmas y vuelve a programarlas una por
   * una, y cada una de esas operaciones es una llamada al sistema
   * operativo: entre el borrado y la ultima alarma pasa un rato. Si
   * durante ese rato entra una segunda sincronizacion, las dos se
   * entrelazan: la segunda borra lo que la primera llevaba puesto, la
   * primera sigue su bucle y programa lo que le quedaba, y la segunda
   * programa su tanda completa. La misma toma acaba con dos alarmas. Con
   * tres o cuatro llamadas seguidas —abrir la app, cambiar una
   * preferencia y confirmar una toma bastan— son cinco o seis avisos
   * para la misma pastilla.
   *
   * `cola` encadena las llamadas para que nunca corran dos a la vez.
   * `siguiente` guarda solo la ULTIMA peticion: si mientras una
   * sincronizacion esta en marcha llegan tres mas, al terminar se hace
   * una sola con los datos mas frescos, y las otras dos se descartan.
   * Rehacer las alarmas cuatro veces seguidas con la misma agenda no
   * aporta nada y tarda.
   */
  private cola: Promise<void> = Promise.resolve();
  private siguiente: { agendas: readonly AgendaDelDia[]; preferencias: Preferencias } | null = null;

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
        this.explicarUnaVez('falta extra.eas.projectId en app.json');
        return null;
      }

      const { data } = await Notifications.getExpoPushTokenAsync({ projectId: idDeProyecto });
      return data ?? null;
    } catch (error) {
      this.explicarUnaVez(error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Deja claro en la consola QUE deja de funcionar, no solo que fallo.
   *
   * Este aviso se confunde con facilidad con un fallo general de la
   * aplicacion, y no lo es: sin token de push las alarmas de medicacion
   * del paciente —que son locales y las programa el propio telefono—
   * siguen sonando igual. Lo que no llega son los avisos que manda el
   * servidor al cuidador, que es una funcion distinta.
   */
  private explicarUnaVez(motivo: string): void {
    if (this.yaSeExplicoLaFaltaDeToken) return;
    this.yaSeExplicoLaFaltaDeToken = true;

    console.warn(
      `[push] Este dispositivo no recibira avisos REMOTOS. Motivo: ${motivo}\n` +
        '       Las alarmas de las tomas son locales y siguen funcionando con normalidad.\n' +
        '       Lo que no llegara son los avisos del servidor al cuidador ("se salto una toma").\n' +
        '       En Android eso exige credenciales de Firebase (FCM); ver docs/NOTIFICACIONES.md.',
    );
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

  async sincronizar(agendas: readonly AgendaDelDia[], preferencias: Preferencias): Promise<void> {
    this.siguiente = { agendas, preferencias };
    this.cola = this.cola.then(() => this.reprogramarLoPendiente());
    return this.cola;
  }

  /**
   * Hace la sincronizacion que haya quedado apuntada, si queda alguna.
   *
   * Puede no quedar ninguna: si tres llamadas se encolaron mientras
   * corria la primera, la primera de las tres ya hizo el trabajo con los
   * datos mas recientes y las otras dos encuentran el hueco vacio.
   */
  private async reprogramarLoPendiente(): Promise<void> {
    const trabajo = this.siguiente;
    if (!trabajo) return;
    this.siguiente = null;
    await this.reprogramar(trabajo.agendas, trabajo.preferencias);
  }

  private async reprogramar(
    agendas: readonly AgendaDelDia[],
    preferencias: Preferencias,
  ): Promise<void> {
    try {
      // El permiso se pide AQUI, y no solo al registrar el telefono para
      // avisos remotos. Hasta ahora las alarmas de medicacion dependian,
      // sin decirlo, de que el registro de push hubiera pedido el permiso
      // antes: funcionaba de casualidad. Si ese camino se corta —y hoy ya
      // falla, por las credenciales de Firebase que faltan— la funcion
      // principal de la aplicacion se quedaria sin permiso y sin alarmas,
      // en silencio. Lo que necesita el permiso es esto, asi que esto lo
      // pide. Si ya esta concedido no se le pregunta nada a nadie.
      await this.pedirPermiso();
      await this.prepararCanal();
      await this.borrarTodas();

      const ahora = Date.now();

      // Se juntan todos los dias y se ordenan por hora: si hubiera mas
      // tomas que el tope del sistema, las que se programan son las mas
      // proximas, que son las que de verdad importan.
      const pendientes = agendas
        .flatMap((agenda) => agenda.elementos)
        .filter((e) => e.estado !== 'TOMADA' && e.estado !== 'OMITIDA')
        .map((e) => ({ elemento: e, instante: new Date(e.programadaPara).getTime() }))
        .filter((x) => x.instante > ahora)
        .sort((a, b) => a.instante - b.instante)
        .slice(0, MAXIMO_DE_ALARMAS);

      for (const { elemento, instante } of pendientes) {
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

  /**
   * Borra todas las alarmas de este telefono.
   *
   * Pasa por la misma cola que la sincronizacion, y de paso descarta la
   * peticion que hubiera apuntada. Sin eso, cerrar sesion mientras una
   * sincronizacion va en camino dejaria que esa sincronizacion volviera
   * a programar, despues del borrado, las alarmas de la persona que
   * acaba de salir: avisos sobre la medicacion de otro en un telefono
   * que ya cambio de manos.
   */
  async cancelarTodas(): Promise<void> {
    this.siguiente = null;
    this.cola = this.cola.then(() => this.borrarTodas());
    return this.cola;
  }

  private async borrarTodas(): Promise<void> {
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
