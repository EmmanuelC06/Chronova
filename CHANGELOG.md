# Registro de cambios — Chronova

Todos los cambios que se notan desde fuera, en orden inverso.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las versiones
siguen [versionado semántico](https://semver.org/lang/es/): `MAYOR.MENOR.PARCHE`.

## Cómo se numera

| Parte | Cuándo sube | Ejemplo en Chronova |
|---|---|---|
| **MAYOR** | Un cambio que rompe lo anterior: la app vieja deja de funcionar con el servidor nuevo | Cambiar el formato del token, o retirar un endpoint |
| **MENOR** | Funcionalidad nueva que no rompe nada | La autorización de tratamiento de datos, las pestañas del cuidador |
| **PARCHE** | Corrección de un defecto, sin funcionalidad nueva | Que el historial deje de decir «no tienes medicamentos» cuando falla la red |

Tres números que hay que mover a la vez, y que es fácil olvidar:

- **`version`** en `mobile/app.json` — la que ve el usuario, y la que muestra la tienda.
- **`android.versionCode`** en `mobile/app.json` — un entero que **sube de uno en uno con
  cada subida a Google Play**. Play rechaza un `.aab` cuyo `versionCode` no sea mayor que
  el anterior, y ese es un error que aparece justo cuando hay prisa. No se reutiliza nunca,
  ni aunque se retire la versión.
- **`ios.buildNumber`** — el equivalente en Apple.

La **política de tratamiento de datos tiene su propia versión**, y no sigue a la de la app:
va en `docs/legal/` y en `mobile/src/dominio/politicaDeDatos.ts`, y las dos tienen que
coincidir. Sube cuando cambia el texto de forma sustancial, porque de ella depende poder
probar qué aceptó cada persona.

---

## [1.3.0] — 2026-09-08

### Añadido

- **Tarjeta «Mis alarmas», en Mi cuenta.** Dice cuántas alarmas tiene puestas el TELÉFONO
  —preguntándoselo al sistema operativo, no repitiendo lo que la aplicación cree haber
  programado— y a qué hora suena la próxima.

  Existe porque cuando una alarma de medicación no suena, la persona no tiene forma de saber
  si el fallo está en la aplicación o en su teléfono, y son cosas que se arreglan en sitios
  opuestos: si la alarma no existe hay algo que corregir en el código; si existe y no sonó, el
  teléfono la está reteniendo y eso se cambia en los ajustes del sistema. Sin esa distinción
  lo único que quedaba era esperar a la siguiente toma a ver si sonaba, y con un medicamento
  de verdad esa espera es la dosis. Lleva además un acceso directo a los ajustes del teléfono.
- La consola dice cuántas alarmas quedaron programadas y cuándo suena la próxima.
- **`docs/NOTIFICACIONES.md`** gana una sección sobre por qué una alarma puede llegar con
  minutos de retraso: el permiso de alarmas exactas que Android 14 deniega de fábrica, el
  ahorro de batería, y por qué el diseño lo absorbe —la ventana de ±60 minutos y los minutos
  de gracia—. Incluye qué responder si el tema sale en la sustentación.

### Corregido

- **Un fallo puntual al programar alarmas podía dejar la aplicación sin programar ninguna
  más.** La cola encadena promesas, y una promesa rechazada contamina todo lo que se encadene
  después: si una sincronización fallaba, la cola quedaba envenenada y todas las siguientes se
  saltaban en silencio durante el resto de la ejecución. Medido: tras un fallo puntual se
  completaba 1 de 3 sincronizaciones; ahora se completan las 3.
- **Los fallos al programar alarmas se tragaban en silencio.** Un recordatorio que no suena y
  tampoco avisa de que no va a sonar es peor que no tener recordatorios.

---

## [1.2.1] — 2026-09-08

### Corregido

- **Llegaban cinco o seis avisos por la misma toma.** Reprogramar las alarmas consiste en
  borrarlas todas y volver a crearlas una por una, y cada paso es una llamada al sistema
  operativo: entre el borrado y la última alarma pasa un rato. Si en ese rato entraba una
  segunda sincronización, las dos se entrelazaban —la segunda borraba lo que la primera
  llevaba puesto, la primera seguía su bucle, la segunda ponía su tanda completa— y la misma
  pastilla quedaba con varias alarmas. Bastaban tres disparadores normales: abrir la
  aplicación, cambiar una preferencia y confirmar una toma. Ahora las sincronizaciones se
  encolan, nunca corren dos a la vez, y si llegan varias mientras una está en marcha se hace
  **una sola** con los datos más frescos.
- **Cambiar una preferencia relanzaba el arranque de la aplicación entera**: volver a leer la
  sesión, volver a pedir el perfil y volver a programar todas las alarmas. Era una de las
  fuentes de esas sincronizaciones simultáneas.
- **Cerrar sesión mientras se estaban programando alarmas podía dejarlas puestas.** El borrado
  ocurría, y la sincronización que venía en camino las volvía a crear justo después: avisos
  sobre la medicación de otra persona en un teléfono que ya cambió de manos. El borrado pasa
  ahora por la misma cola y descarta lo que hubiera pendiente.
- **La aplicación ya no depende de una IP escrita a mano.** En desarrollo pregunta a Expo desde
  qué máquina se descargó el código, que es la misma donde corre el servidor. Esa dirección la
  reparte el router y cambia sola —al cambiar de red, al reiniciar el router, o porque caducó la
  asignación—, y cada vez que cambiaba la app quedaba llamando a un sitio vacío. El síntoma no
  ayudaba: la petición no fallaba, se quedaba esperando quince segundos. Parecía un servidor
  lento y era un número viejo. Pasó tres veces.
- **Los errores de conexión ahora dicen a qué dirección se intentó llamar.** Sin ese dato, una IP
  desactualizada y una caída real del servidor daban exactamente el mismo mensaje.
- **Las alarmas piden su propio permiso de notificaciones.** Antes lo pedía, de paso, el registro
  para avisos remotos: la función principal de la aplicación dependía sin decirlo de otra que
  hoy ya falla. Funcionaba de casualidad.
- **El aviso de que no hay avisos remotos se decía en cada intento.** Ahora se dice una vez, y
  explica qué deja de funcionar —los avisos al cuidador— y qué no —las alarmas de las tomas—.
- **El arranque tolera que la base de datos esté despertando.** El plan gratuito de Neon la
  suspende tras unos minutos de inactividad; sin reintentos, ese tropiezo momentáneo impedía
  arrancar el servidor entero. Cambiar «no arranca si no puede escribir» por «no arranca porque
  estaba dormida» no habría sido ninguna mejora.

### Añadido

- **`docs/NOTIFICACIONES.md`**: la diferencia entre alarmas locales y avisos remotos, qué
  significa el aviso de Firebase en la consola, y los pasos para habilitar las notificaciones
  al cuidador en Android. Las credenciales de Firebase quedaron en `.gitignore`.

---

## [1.2.0] — 2026-09-06

### Añadido

- **Pestaña «Mi cuenta» para el cuidador.** Hasta ahora el cuidador solo podía cerrar sesión,
  y para llegar al botón tenía que bajar por toda la lista de pacientes. No podía agrandar la
  letra, ni abrir la política de privacidad, ni ver la constancia de la autorización que él
  mismo otorgó al registrarse —y el artículo 8 de la Ley 1581 de 2012 le da ese derecho tanto
  como al paciente—.
- **El cuidador puede ajustar el tamaño de la letra**, y se le guarda en su cuenta, no en el
  teléfono. El cuidador suele ser el hijo o la hija, pero «hija» de alguien de noventa años
  quiere decir sesenta y cinco: dar por hecho que solo el paciente tiene la vista cansada era
  una suposición sin fundamento. Las preferencias de accesibilidad dejaron de vivir dentro del
  paciente y pasaron a `domain/shared/`, que es donde les corresponde.

### Corregido

- **El servidor arrancaba contra una base de datos a la que no podía escribir.** Se añadieron
  columnas al esquema y aplicarlas dependía de que alguien se acordara de ejecutar
  `npm run db:migrate`. Como no se ejecutó, el servidor levantó, `/api/salud` respondió «ok»,
  y todo lo que solo lee siguió funcionando. El fallo salió por el punto más alejado de la
  causa: cambiar el tamaño de la letra no hacía nada. **Ahora el esquema se pone al día antes
  de aceptar la primera petición, y si no puede, el servidor no arranca.** Un servidor que no
  puede guardar no está «ok».
- **Los mensajes de error de las preferencias decían siempre «Revisa tu conexión».** Con la
  base de datos desactualizada, lo que llegaba a quien probaba la aplicación era que mirara el
  wifi. Ahora se muestra el motivo que da el servidor.

---

## [1.1.0] — 2026-09-05

### Añadido

- **Autorización de tratamiento de datos personales.** Casilla explícita en el registro,
  sin marcar por defecto, que menciona los datos de salud y la transferencia fuera del
  país. El servidor no crea la cuenta sin ella, y no solo el formulario: la regla está en
  el caso de uso, donde no se puede rodear llamando a la API directamente.
- **Constancia de la autorización.** Se guarda la versión del documento aceptado y el
  instante exacto, porque el artículo 8 de la Ley 1581 de 2012 da derecho a pedir prueba
  de lo que se autorizó. Consultable desde la propia app.
- **Pantalla «Mis datos y privacidad»**, alcanzable desde el registro —antes de aceptar
  nada— y desde Mi cuenta.
- **Documentos legales** en `docs/legal/`: política de tratamiento, términos y condiciones
  y aviso de privacidad, versionados y con fecha de vigencia.
- **Pruebas de la API por HTTP** (`backend/tests/http/`), que levantan el servidor real.
  Las anteriores llamaban a los casos de uso directamente y no veían la capa HTTP.
- Pestañas Hoy / Tratamiento / Historial en la ficha del paciente, para el cuidador.
- Sistema de diseño con la tipografía Atkinson Hyperlegible Next, iconos dibujados y la
  paleta de la marca. Icono de aplicación, pantalla de inicio e icono de notificaciones.
- Cierre de sesiones abiertas al cambiar la contraseña, y renovación silenciosa del token.
- Recuperación de contraseña mediante un código enviado al correo.

### Cambiado

- **Las horas se muestran en formato de 12 horas con a. m. / p. m.** El reloj de 24 horas
  no es de uso corriente en Colombia, y menos entre adultos mayores: «16:30» obliga a una
  resta mental que mucha gente no hace, y en una app de medicación una hora que no se
  entiende a la primera es una dosis que se toma tarde. El cambio alcanza también a la
  **entrada**: se escribe «8:30» y se toca «a. m.» o «p. m.», sin traducir nada. Internamente
  y en la API las horas siguen siendo `"20:00"`, que es inequívoco y no depende del idioma.

### Corregido

- **Se podía confirmar una toma cuya hora aún no había llegado.** A las nueve de la mañana
  la agenda ofrecía el botón «Ya la tomé» también para la dosis de las ocho de la noche.
  Contaba como cumplida al 100% aunque no como puntual, y —lo que más pesa— esa noche ya no
  sonaba el recordatorio, porque la dosis constaba como resuelta. Una dosis perdida en
  silencio. Ahora la ventana se abre 60 minutos antes de la hora y la tarjeta explica
  desde cuándo estará disponible. Llegar tarde se sigue pudiendo siempre.
- **El panel del cuidador ignoraba `puedeVerHistorial`.** Al retirar el permiso, tres
  endpoints respondían 403 y el panel seguía mostrando adherencia, medicamentos y última
  actividad. Era el único caso de uso que leía datos clínicos sin pasar por
  `PoliticaDeAcceso`.
- **Consultar un día pasado fabricaba incumplimientos.** Pedir la agenda de una fecha
  anterior creaba sus tomas, que la tarea periódica cerraba como omitidas. Mirar el
  calendario hacia atrás hundía la adherencia con faltas que nunca ocurrieron.
- La ficha del cuidador se quedaba en blanco si fallaba la red.
- Las pantallas de medicamentos e historial decían «aún no tienes nada» cuando lo que
  fallaba era la carga.
- La lista de quién puede ver los datos de salud fallaba en silencio.
- Todos los `500` que devolvía la API eran en realidad errores del cliente: JSON mal
  formado, cuerpo demasiado grande, parámetros de la URL repetidos.
- El filtro del historial por medicamento devolvía una lista vacía si el identificador
  venía en mayúsculas.
- La puntualidad se mostraba como porcentaje junto a la adherencia, y parecía
  contradecirla; ahora es un conteo («3 de 4») que deja el denominador a la vista.

---

## [1.0.0] — 2026-08

Primera versión completa: registro y autenticación, gestión de medicamentos, agenda diaria
de tomas, historial de adherencia, vinculación con cuidadores por permisos, notificaciones
push y alarmas locales.
