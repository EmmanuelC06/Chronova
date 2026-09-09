# Plan de trabajo — Chronova

Revisión del 9 de septiembre de 2026. Quedan unas ocho semanas para la sustentación.

El orden no es por dificultad ni por gusto: es por **qué bloquea a qué**, y por cuánto
cuesta equivocarse en cada cosa.

---

## Estado actual, en una línea

La aplicación funciona de punta a punta —registro, medicamentos, agenda, confirmación de
tomas, historial, vinculación con cuidadores, permisos, alarmas locales— con 194 pruebas
automatizadas y el dominio sin una sola dependencia externa. Lo que falta no es
funcionalidad nueva: son **las condiciones para poder ponerla delante de una persona
real**, y una función prometida que hoy no llega.

---

## 1. Alojamiento con HTTPS · **bloquea todo lo demás**

Hoy el servidor corre en tu computador y habla **HTTP sin cifrar**. Eso significa que
correos, contraseñas y datos de salud viajan en claro por la red local.

**Mientras esto siga así, la aplicación no puede usarse con datos reales de ninguna
persona.** No es una recomendación de estilo: son datos sensibles según el artículo 5 de
la Ley 1581 de 2012, y no hay forma de justificar transmitirlos sin cifrar.

Esto bloquea las pruebas de usabilidad (§4), que a su vez son el argumento más fuerte que
puedes llevar a la sustentación.

- **Qué hacer:** Render para el servidor, Neon para la base de datos (ya la tienes).
- **Costo:** unos 7 USD/mes. El plan gratuito de Render duerme el servidor a los 15
  minutos y **eso apaga la tarea que cierra las tomas vencidas**, que es justo el
  mecanismo central del proyecto. Para probar sirve; para sustentar, no.
- **Esfuerzo:** una tarde. Está documentado paso a paso en `docs/DESPLIEGUE.md`.
- **Ya resuelto:** el servidor pone la base de datos al día solo al arrancar, así que no
  hay que ejecutar migraciones a mano en la nube.

---

## 2. Avisos al cuidador (Firebase) · ~~pendiente~~ **HECHO el 9 de septiembre**

Funciona de punta a punta: el teléfono consigue su token, el servidor envía a través de
Expo, y la notificación llega. Verificado con `npm run push:probar` y con el aviso
recibido en el teléfono.

Es la **redundancia** del producto: lo que convierte «se le olvidó» en «alguien se
enteró», y la respuesta a la pregunta incómoda de la sustentación —*¿y si la alarma suena
y la persona no la atiende?*—.

Quedó un hueco pequeño y acotado, descrito abajo en §8.

---

## 3. Completar los documentos legales · **depende de otra persona, empieza ya**

Los tres documentos de `docs/legal/` están redactados pero tienen huecos que **solo puede
llenar un humano**, y uno de ellos exige preguntarle a la profesora.

| Hueco | Quién lo resuelve |
|---|---|
| Responsable del Tratamiento: nombre, identificación, domicilio | La profesora / la universidad |
| Correo para ejercer derechos | Tú, una vez se sepa quién responde |
| Región de Neon | **Ya resuelto: AWS `us-east-1`, Virginia, Estados Unidos** |
| Proveedor de alojamiento | Cuando se contrate (§1) |

Lo pongo primero en la lista de "empezar", aunque no sea lo más urgente, porque **depende
de la disponibilidad de otra persona** y eso no lo controlas tú.

Dos cosas que no se pueden saltar:

- **No publiques los documentos con un responsable inventado.** Un responsable falso es
  peor que no tener política: es una declaración incorrecta sobre quién responde por datos
  de salud ajenos.
- La base de datos está **fuera de Colombia**. Eso es una transferencia internacional
  (artículo 26 de la Ley 1581) y hay que declararla explícitamente en la autorización. El
  texto de registro ya la menciona; verifica que siga diciéndolo cuando cierres el
  documento.
- Los documentos los redacté yo y **no son asesoría legal**. Antes de ponerlos delante de
  usuarios reales, que los revise alguien con formación jurídica.

---

## 4. Pruebas de usabilidad con adultos mayores · **el argumento más fuerte que puedes tener**

Todo el proyecto se apoya en una afirmación: que la experiencia de uso es la causa
principal de abandono en este público. Ahora mismo esa afirmación es **una cita de la
revisión de literatura**. Si la conviertes en datos propios —aunque sean cinco personas—
deja de ser una cita y pasa a ser un hallazgo.

Ya tienes evidencia de que esto funciona: los dos mejores defectos de todo el proyecto
—que se podía confirmar una toma horas antes, y que el horario de 24 horas no se entiende—
no salieron de revisar código. Salieron de **usar la aplicación**.

- **Requiere primero:** §1 y §3. O, si no llegan a tiempo, datos ficticios y consentimiento
  informado por escrito.
- **Esfuerzo:** una tarde de preparación, una sesión por persona.
- **Prepara:** cinco tareas concretas («agrega tu pastilla de la presión», «mira si te
  falta alguna toma hoy») y anota dónde dudan, no lo que dicen. Y avísales que van a
  necesitar configurar el permiso de alarmas de su teléfono, porque lo van a necesitar.

---

## 5. Capturas para el Entregable 2 · **te toca a ti, y es rápido**

La sección 4.2 tiene ocho recuadros naranjas esperando: Hoy, Medicamentos, Historial y Mi
cuenta (paciente); Panel de pacientes y Ficha del paciente (cuidador); Registro; y Mis
datos y privacidad.

Mándamelas y las inserto, o pégalas tú encima de los recuadros. Con la app en 1.3.0 vale
la pena volver a tomarlas: la pantalla del cuidador ahora tiene pestañas y Mi cuenta tiene
la tarjeta de alarmas.

---

## 6. Cuenta de Google Play · **solo si vas a publicar; empieza con un mes de margen**

25 USD, pago único. La verificación de identidad tarda **de 2 a 5 días hábiles y bloquea
la publicación en cualquier canal, incluido el de pruebas internas**. Necesitas un
comprobante de domicilio de menos de 90 días.

Si el plan es solo sustentar con el teléfono en la mano, esto no hace falta.

---

## 7. Endurecer el registro de dispositivos · **bajo riesgo, arreglo barato**

Hoy, quien presente el token de notificaciones de otra persona se lo queda: el servidor
reasigna el aparato sin verificar nada. La víctima **deja de recibir sus avisos en
silencio**.

Lo dejo de séptimo a propósito, y conviene entender por qué: el token es una cadena
aleatoria larga, no se adivina, y **poseerlo es prácticamente prueba de poseer el
teléfono**. La reasignación además es deliberada y resuelve un caso real —una hija instala
la app en el teléfono viejo de su madre—. El riesgo real es bajo. Pero el fallo es
silencioso, y en una app de medicación eso pesa.

- **Esfuerzo:** menos de una hora.

---

## 8. Consultar los recibos de entrega · **hueco pequeño, consecuencia real**

Cuando el servidor manda un aviso, Expo responde «aceptado» — que significa *lo recibí*,
no *lo entregué*. La entrega real se confirma después, consultando los **recibos**. Este
proyecto no los consulta.

La consecuencia: si un teléfono deja de existir —la persona desinstala la app, cambia de
aparato— su token queda en la base de datos para siempre, y el servidor sigue creyendo
que avisó a alguien que ya no recibe nada. Hoy solo se limpian los tokens que Expo
rechaza *en el momento del envío*; los que fallan más tarde no se enteran.

Para un cuidador que depende de esos avisos, **«creo que le avisé» es peor que «no pude
avisarle»**.

- **Esfuerzo:** dos o tres horas. Hay que guardar los identificadores que devuelve Expo y
  consultarlos un rato después, en la tarea periódica que ya existe.

---

## Ya resuelto en esta revisión

- **La clave de firma de las sesiones.** La comprobación que impide usar la clave de
  ejemplo solo se activaba si `NODE_ENV` valía exactamente `production` — justo la variable
  que se olvida al desplegar. Con esa clave, que está publicada en `.env.example` dentro del
  repositorio, **cualquiera puede fabricar un token de sesión válido a nombre de cualquier
  paciente** y leer sus datos de salud: no hay que adivinar contraseñas, se firma y ya. Era
  el fallo más grave que podía tener el proyecto y se habría activado justo al desplegar.
  Ahora se rechaza siempre, y con base de datos real se exigen 32 caracteres como mínimo.
  Cuatro pruebas nuevas, vistas fallar contra el código anterior.

---

## El orden que yo seguiría

1. ~~Firebase~~ — **hecho el 9 de septiembre.**
2. **Escribirle a la profesora** por lo del Responsable del Tratamiento (§3). Es lo único
   que depende de otra persona, así que cuanto antes salga, mejor.
3. **Alojamiento** (§1). Desbloquea todo lo demás.
4. **Capturas** (§5) y cerrar el Entregable 2.
5. **Pruebas de usabilidad** (§4), en cuanto §1 y §3 estén.
6. Lo demás —los recibos (§8), el registro de dispositivos (§7), Google Play (§6)— según
   cómo vaya el calendario.
