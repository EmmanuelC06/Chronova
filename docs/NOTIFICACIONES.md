# Notificaciones en Chronova

## Son dos cosas distintas, y conviene no confundirlas

Chronova avisa por dos caminos que no se parecen en nada por dentro:

| | **Alarmas locales** | **Avisos remotos (push)** |
|---|---|---|
| Quién las dispara | El propio teléfono | El servidor |
| Para quién | El paciente | Sobre todo el cuidador |
| Ejemplo | «Hora de tu Losartán» | «Rosa no ha confirmado su toma de las 8» |
| ¿Necesita internet? | **No** | Sí |
| ¿Necesita el servidor encendido? | **No** | Sí |
| ¿Necesita Firebase? | **No** | Sí, en Android |

Las alarmas del paciente son locales **a propósito**. Un recordatorio de medicación
que dependa de la cobertura no sirve: la señal se cae justo en el hospital, en el bus
o en la casa de la abuela. El teléfono se programa las alarmas de los próximos siete
días y las hace sonar aunque no haya red, aunque el servidor esté apagado y aunque el
computador esté cerrado.

---

## El aviso que aparece en la consola

```
WARN [push] No se pudo obtener el token del dispositivo: ...
Default FirebaseApp is not initialized in this process com.chronova.app.
```

**Qué significa exactamente:** este teléfono no va a recibir avisos **remotos**.

**Qué sigue funcionando:** todo lo demás. Las alarmas de las tomas —que son la función
principal de la aplicación— se programan en el teléfono y suenan con normalidad. El
aviso se lee como si algo grave se hubiera roto, y no es el caso.

**Qué NO funciona:** el aviso que el servidor le manda al cuidador cuando su paciente
se salta una toma. Esa es una función real del proyecto, y hoy está inoperante en
Android.

Aparece en la terminal de **Expo** (donde corre `npx expo start`), no en la del
backend, aunque las dos ventanas se parezcan.

---

## Por qué pasa

Android no deja que una aplicación reciba mensajes de un servidor por su cuenta: todos
pasan por **Firebase Cloud Messaging (FCM)**, que es el servicio de Google para eso.
Expo actúa de intermediario, pero necesita credenciales de FCM a nombre de la
aplicación para poder entregar el mensaje. Chronova todavía no las tiene, así que
`getExpoPushTokenAsync` falla y el teléfono nunca se registra en el servidor.

Dos detalles que conviene saber:

- **Desde el SDK 53, Expo Go no admite notificaciones push en Android.** Da igual cómo
  se configure: hace falta un *development build*, que es justo lo que ya estás usando
  (por eso el error menciona `com.chronova.app` y no `host.exp.exponent`).
- Las notificaciones **locales** sí funcionan en Expo Go. Por eso las alarmas nunca
  dieron problema.

---

## Cómo habilitarlo

Son cinco pasos y hay que rehacer la compilación al final.

1. **Crear un proyecto en Firebase** para la aplicación, en la consola de Firebase.
2. En **Configuración del proyecto → Cuentas de servicio**, pulsar **Generar nueva
   clave privada**. Descarga un archivo `.json`.
3. Subir esa clave a EAS con `eas credentials`: elegir **Android → production →
   Google Service Account**, y de ahí la opción de configurar credenciales **FCM V1**.
4. Descargar `google-services.json` desde la consola de Firebase y ponerlo en la raíz
   del proyecto móvil.
5. Declararlo en `mobile/app.json`:

   ```json
   "android": {
     "package": "com.chronova.app",
     "googleServicesFile": "./google-services.json"
   }
   ```

Después, una compilación nueva. La configuración de credenciales no se aplica a un
`.apk` ya construido.

### Dos archivos que NO se suben al repositorio

- **`google-services.json`** — identifica el proyecto de Firebase.
- **La clave privada de la cuenta de servicio** (el `.json` del paso 2) — esta es la
  más delicada: quien la tenga puede enviar notificaciones haciéndose pasar por
  Chronova, a cualquier persona que tenga la app instalada.

Las dos están ya en `.gitignore`. No las pegues en un chat, ni en el entregable, ni en
una captura de pantalla.

---

## ¿Hay que hacerlo ya?

No es urgente para que la aplicación funcione, pero **sí antes de la sustentación** si
piensas mostrar la parte del cuidador: el aviso «tu paciente se saltó una toma» es uno
de los argumentos del proyecto, y ahora mismo no llega.

Mientras tanto, el panel del cuidador sí muestra la información correcta al abrirlo
—la adherencia, las tomas pendientes, la última actividad—. Lo que falta es el empujón
que avisa sin que el cuidador tenga que entrar a mirar.

---

## Fuentes

- [Configurar credenciales de FCM — Expo](https://docs.expo.dev/push-notifications/fcm-credentials/)
- [expo-notifications — Expo](https://docs.expo.dev/versions/latest/sdk/notifications/)
