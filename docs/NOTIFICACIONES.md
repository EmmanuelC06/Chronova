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

### Cómo comprobar que quedó bien, sin esperar a que se pierda una toma

El aviso al cuidador solo se dispara cuando una toma vence, y eso tarda horas. Depurar
con un ciclo de espera de tres horas no es depurar, es adivinar. Para eso está:

```bash
cd backend
npm run push:probar
```

Recorre exactamente el mismo camino que el servidor de verdad —los mismos teléfonos
guardados, el mismo cliente hacia Expo— y responde tres preguntas en orden, cada una
descartando una causa:

1. **¿Hay algún teléfono registrado?** Si no, la aplicación móvil nunca consiguió su
   token: el problema está en el teléfono, no en el servidor. El motivo aparece en la
   terminal de Expo.
2. **¿Expo acepta el mensaje?** Si lo rechaza, imprime el motivo. El más común es que
   falten las credenciales de FCM.
3. **¿Llegó al teléfono?** Eso ya se mira en el aparato.

Conviene saber que «aceptado» significa que Expo recibió el mensaje, no que llegó. La
entrega real se confirma consultando los recibos, que este proyecto no implementa.

### Los dos archivos, y cuál de ellos es secreto

Solo uno de los dos lo es, y confundirlos cuesta caro en las dos direcciones.

**La clave privada de la cuenta de servicio** (el `.json` del paso 2) **es secreta**.
Quien la tenga puede enviar notificaciones haciéndose pasar por Chronova a cualquier
persona que tenga la app instalada. Se sube a EAS y ahí se queda: está en `.gitignore`,
no se pega en un chat, no va en el entregable y no sale en una captura de pantalla.

**`google-services.json` NO es secreto, y sí va al repositorio.** No contiene ninguna
clave privada: solo el identificador del proyecto, el nombre del paquete y una clave de
API que **viaja dentro del APK de todas formas**, así que cualquiera que instale la
aplicación puede extraerla. Ignorarlo no protege nada.

Y tiene un costo concreto ignorarlo: **EAS Build solo sube al servidor los archivos que
git tiene registrados.** Si está en `.gitignore`, la compilación falla con

```
"google-services.json" is missing, make sure that the file exists.
Remember that EAS Build only uploads the files tracked by git.
```

o —peor— sale adelante sin configuración de Firebase y las notificaciones remotas no
llegan nunca, sin ningún error que lo explique.

La alternativa es guardarlo como *variable de archivo* en EAS, pero eso obliga a
convertir `app.json` en `app.config.js` para poder leer la variable. Para este proyecto
no compensa: más piezas que pueden fallar, a cambio de ninguna seguridad real.

---

## Precisión: por qué una alarma puede llegar tarde

Android **no garantiza** que una notificación programada suene en el segundo exacto.
Lo que hace la aplicación es pedirle al sistema «avísame a las 8:00»; a partir de ahí
decide el sistema, y son varias capas las que pueden retrasarlo:

1. **El permiso de alarmas exactas.** Desde Android 14 viene denegado de fábrica. Sin él,
   el sistema degrada la alarma a *inexacta* y puede darla con quince minutos o más de
   retraso. Se concede en *Ajustes → Aplicaciones → Acceso especial → Alarmas y
   recordatorios*.
2. **El ahorro de batería (Doze).** Con la pantalla apagada y el teléfono quieto, Android
   agrupa el trabajo pendiente y lo despacha en tandas. Marcas como Xiaomi, Huawei y
   Samsung añaden capas propias, más agresivas que las de Android.
3. **La propia librería.** `expo-notifications` programa a través del sistema y hereda
   todo lo anterior.

Incluso con todo bien configurado, conviene contar con **un margen de algunos minutos**.
Perseguir el segundo exacto exigiría abandonar `expo-notifications` por una solución
nativa (`notifee`, o un plugin propio sobre `AlarmManager`), con compilación nueva y
bastante trabajo.

### Por qué eso no rompe el proyecto

Chronova está diseñada para tolerarlo, y no por casualidad:

- La **puntualidad** se mide con una ventana de ±60 minutos. Una toma a las 8:03 en vez
  de a las 8:00 es puntual, y clínicamente es la misma toma.
- Los **minutos de gracia** —que el paciente configura entre 1 y 4 horas— son lo que
  espera el sistema antes de dar una dosis por perdida.

Un retraso de dos minutos no cambia nada. Lo que sí importa es el caso en que **la
alarma no basta**: la persona la oyó y se distrajo, o el teléfono estaba en silencio.

Y para eso la respuesta no es más precisión, es **redundancia**: el aviso al cuidador
cuando la toma no se confirma. Esa es la red de seguridad real del producto, y es
justamente la que hoy no funciona por lo de Firebase. Ahí es donde rinde el esfuerzo,
no en afinar segundos.

### Qué decir si lo preguntan en la sustentación

Que es una limitación conocida y documentada de la plataforma, no un defecto de la
implementación; que el diseño la absorbe con la ventana de tolerancia y los minutos de
gracia; y que la garantía de que una dosis olvidada no pase inadvertida no descansa en
la alarma, sino en el aviso al cuidador. Reconocer el límite es más sólido que ignorarlo.

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
- [Las alarmas exactas vienen denegadas por defecto — Android 14](https://developer.android.com/about/versions/14/changes/schedule-exact-alarms)
- [Programar alarmas — Android Developers](https://developer.android.com/develop/background-work/services/alarms)
