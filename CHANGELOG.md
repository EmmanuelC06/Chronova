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

## [1.8.0] — 2026-10-12

### Añadido

- **Temas de interés en curiosidades.** El paciente marca hasta cuatro temas de una lista
  cerrada de seis (acordarse mejor, hablar con el médico, el sueño, la alimentación, moverse,
  el ánimo) y esos datos pasan a salir de primeros. Con ellos llegan cuatro tarjetas nuevas,
  cada una con su fuente a la vista: la recomendación de sueño a partir de los 65, por qué la
  sed deja de ser un buen aviso con la edad, lo que recomienda la OMS sobre moverse, y que
  sentirse solo es más común de lo que parece.

  **Se ordena, no se filtra.** Marcar «el sueño» no esconde el dato de moverse: lo baja. Es la
  diferencia entre una lista personalizada y una lista censurada, y la segunda vacía de
  sentido un módulo que existe para que la gente se tropiece con cosas. Quien no marca nada lo
  ve todo.

  El tope de cuatro no es técnico: marcarlos todos equivale a no elegir nada, y la frase del
  reporte tiene que caber en una línea legible.

- **El reporte dice qué le interesa leer**, debajo del mapa. Una línea: «Rosa marcó en la
  aplicación que le interesa leer sobre acordarse mejor, el sueño y el ánimo», con la
  aclaración de que es una preferencia que marcó por su cuenta y no una consulta ni un síntoma.

  **Dice lo que MARCÓ, no lo que abrió**, y esa fue la decisión de diseño de esta versión. La
  petición original era contar qué temas consultó más en el período. Contar aperturas es
  vigilar la lectura de una persona, y ponerlo en un documento que sale por WhatsApp a un
  tercero necesitaría su consentimiento explícito y poder apagarlo. Pero lo que lo descartó no
  fue eso: es que con tres o cuatro toques al mes, «el tema que más consultó» son dos o tres
  eventos, y de ahí no sale una afirmación. Es el mismo problema de comparaciones múltiples del
  mapa de riesgo. Lo que marcó, en cambio, lo decidió ella, lo puede cambiar cuando quiera, no
  depende de cuánto haya usado el teléfono, y le sirve igual al médico como tema de
  conversación.

- **`PATCH /api/auth/temas-de-interes`**, solo para pacientes, y `temasDeInteres` en el perfil
  y en la respuesta de analítica. Va también en la analítica, y no solo en el perfil, porque el
  reporte lo puede preparar el cuidador desde su teléfono: su propio perfil no sabe nada de los
  temas del paciente.

  **La lista de claves es cerrada**, y eso no es una comodidad de implementación. Un campo de
  texto libre aquí sería el sitio donde la gente escribiría el nombre de su enfermedad, y eso
  convertiría una preferencia de lectura en un dato de salud guardado sin que nadie lo hubiera
  decidido. Hay una prueba que lo fija.

  **Lo cambia solo su dueño**, al revés que las preferencias de accesibilidad, donde el cuidador
  también manda porque agrandar la letra es cosa de quien mira la pantalla. Aquí no: el reporte
  dice «marcó que le interesa», y esa frase solo es verdad si lo marcó la persona.

- Columna `temas_de_interes` en `pacientes`, aditiva (`ADD COLUMN IF NOT EXISTS`), con `[]` por
  defecto. Columna propia y no dentro de `preferencias` porque esa la comparten paciente y
  cuidador, y elegir temas solo tiene sentido para quien se toma la medicina.

### Corregido

- **Al llegar al tope de cuatro temas, tocar un quinto no hacía nada.** Un toque sin reacción no
  se lee como «he llegado al límite», se lee como que la aplicación se colgó, y la persona
  vuelve a tocar. Ahora contesta con un aviso que explica por qué. Y los temas que no se pueden
  marcar ya no se atenúan al 45%, que dejaba el texto por debajo de cualquier contraste legible
  en una aplicación cuyo público son adultos mayores.

### Nota sobre el alcance de los textos

Los temas de sueño, alimentación, movimiento y ánimo son **datos generales con fuente**, no
recomendaciones. Ninguna tarjeta dice qué hacer, ninguna nombra un medicamento ni una
enfermedad, y donde la decisión depende del tratamiento de cada quien la tarjeta lo dice y
remite al médico. La diferencia entre «conviene que bebas más agua» y «la sed deja de ser un
buen aviso con la edad» es la diferencia entre aconsejar y contar, y es la que mantiene a
Chronova donde está.

---

## [1.7.0] — 2026-10-12

Lo que pidió el profesor: analítica, un módulo de curiosidades y poder mandar el reporte por
WhatsApp. Las tres cosas salen del mismo cálculo y por eso llegan juntas.

### Añadido

- **Mapa de riesgo: cuándo se quedan las tomas, no cuántas.** El historial ya decía el
  porcentaje, y un porcentaje no se puede accionar: saber que vas al 72% no te dice qué
  cambiar. La analítica responde la otra pregunta. Reparte las tomas resueltas en 28 casillas
  (siete días por cuatro franjas: madrugada, mañana, tarde y noche) y señala las que se
  repiten como problemáticas.

  Lo importante de este cálculo es lo que **no** hace. Una casilla con una sola omisión daría
  100% de riesgo y encabezaría la lista, que es el error clásico de las medias sobre pocos
  datos; aquí cada casilla se suaviza contra la tasa general de la propia persona
  (`(omitidas + 4 × tasaGeneral) ÷ (observaciones + 4)`), así que solo se despega del promedio
  cuando acumula evidencia propia. Además hace falta un mínimo de cinco observaciones para
  afirmar algo de una casilla, y como mucho se muestran tres hallazgos: quien abre esto quiere
  saber qué cambiar esta semana, no leer quince líneas.

  El día y la franja se calculan **en la zona del paciente**. Las 8 de la noche en Bogotá son
  la 1 de la madrugada en UTC: calculándolo en UTC el mapa entero saldría corrido un día.

- **Módulo de curiosidades.** La parte motivacional de la aplicación, y la única. Arriba, lo
  que la persona lleva hecho: tomas confirmadas, mejor racha, racha actual, puntualidad, mejor
  día, mejor momento y cuánto lleva registrando. Las rachas se cuentan **por días limpios y no
  por tomas**, porque «doce tomas seguidas» no significa nada para quien toma tres al día y
  además premiaría a quien tiene más medicamentos.

  Se eligieron rachas y no puntos ni medallas por un motivo medido: en mayores de 65 años las
  rachas aumentan el uso de una aplicación y los premios lo **bajan**. A esta edad no motiva
  competir, motiva ver la propia historia.

  Abajo, cinco datos generales sobre memoria y hábitos, **con su fuente a la vista**. Son una
  lista fija escrita a mano, no texto generado en el momento: lo generado no se puede revisar
  antes de que alguien lo lea, y si un día hablara de una dosis o de una enfermedad la
  aplicación dejaría de ser de recordatorios. Ninguna tarjeta nombra un medicamento, ninguna
  dice qué hacer con un tratamiento y ninguna regaña.

- **Reporte para llevar al médico.** Un PDF de una página con el cumplimiento, los patrones
  encontrados y el mapa en forma de tabla, que se envía por el menú de compartir del teléfono:
  WhatsApp, correo o lo que la persona prefiera.

  **Por qué se comparte desde el teléfono y no lo manda el servidor.** La alternativa era la
  WhatsApp Business API. Exige cuenta de Meta Business verificada y plantillas aprobadas, que
  son semanas de trámite, y el número de prueba gratuito solo alcanza a unos pocos
  destinatarios registrados a mano. Pero lo que decidió no fue el trámite: esa vía haría pasar
  datos de salud por los servidores de Meta bajo la cuenta del proyecto, lo que convierte a
  Meta en un **encargado del tratamiento** que habría que declarar en la política, con
  transferencia internacional incluida. Compartiendo desde el teléfono no hay encargado nuevo
  y, sobre todo, **es el paciente quien decide a quién le enseña sus datos**, que es el mismo
  modelo de consentimiento sobre el que está construida toda la aplicación.

- **`GET /api/tomas/analitica`**, con los mismos permisos del historial (`puedeVerHistorial`).
  No se inventó un permiso nuevo: si alguien autorizó a su hija a ver su historial, la
  analítica de ese historial va incluida. Devuelve las tres cosas en una sola petición porque
  las tres salen del mismo conjunto de tomas, y partirlas en tres rutas sería leer la base de
  datos tres veces para lo mismo. Mira 90 días por defecto, no 30: con 30 días hay cuatro
  lunes, y con 90 hay trece, que ya permite distinguir un patrón de una mala racha.

- **`npm run datos:demo`** en el backend. Siembra una cuenta de demostración
  (`demo@chronova.test`) con seis meses de historia y un patrón de olvido **conocido de
  antemano**: los domingos por la noche al 45%, el resto alrededor del 6%. Sirve para enseñar
  la pantalla en la sustentación, pero sobre todo sirve para **validar**: si el mapa señala
  esa casilla el modelo funciona, y si señala otra no funciona. Es la única forma honesta de
  comprobar esto sin pacientes reales, porque la verdad se conoce antes de calcular nada.

  La primera versión del sembrador falló, y el fallo valió la pena. Muestreaba la casilla con
  una moneda cargada al 45% sobre 120 días, salía al 22% por azar, y la analítica señalaba los
  viernes por la mañana, que habían sacado un 23% por casualidad. No era un fallo del modelo
  ni del generador: con veinte observaciones por casilla y veintiocho casillas, el ruido
  produce picos que compiten con la señal. Es el problema de las comparaciones múltiples, y es
  exactamente la razón de ser del suavizado y del mínimo de evidencia.

### Cambiado

- **Los textos de los hallazgos ya no hablan en segunda persona.** Decían «se te han quedado»,
  que suena bien cuando lo lee el propio paciente, y la misma frase viaja sin cambios a la
  pantalla del cuidador: allí le hablaba a la hija de las tomas de su madre como si fueran
  suyas. Ahora dicen «se han quedado 6 tomas de 13», que vale para los dos. Lo mismo en las
  etiquetas del mapa que lee el lector de pantalla. Queda una prueba que lo fija, porque es un
  fallo que no rompe nada y por eso puede volver sin que nadie lo note.

- **Las fechas de la analítica y del reporte se escriben en palabras**, «15 de abril de 2026»
  en vez de «2026-04-15». Se arman a mano y no con `toLocaleDateString` porque esa función
  depende de los datos de idioma del motor y en Android varía: el mismo reporte saldría en
  inglés en unos equipos.

- **`mobile/app.json` pasa de 1.3.2 a 1.7.0.** Llevaba cuatro versiones sin moverse: es
  justamente el despiste del que avisa la tabla del principio de este archivo.

### Hace falta un build nuevo

`expo-print` y `expo-sharing` son **módulos nativos**: no basta con `npm install` y recargar.
Hay que generar un development build nuevo con EAS para que el botón de reporte funcione en el
teléfono.

Y el teléfono que todavía no lo tenga **no se queda sin analítica**. Las dos librerías se
cargan solo cuando se pulsa el botón, no al abrir la pantalla. Con el import arriba, un
teléfono con una compilación anterior lanzaba `Cannot find native module 'ExpoPrint'` **antes
de dibujar nada**, y el enrutador acababa mostrando «Unmatched Route» como si la pantalla no
existiera: una capacidad opcional tumbaba la pantalla entera. Ahora el mapa y los hallazgos
funcionan igual, y en el sitio del botón aparece un aviso que explica qué falta.

---

## [1.6.1] — 2026-09-15

### Corregido

- **El servidor se caía entero cuando la base de datos cerraba una conexión.** El síntoma en
  la terminal era `Connection terminated unexpectedly` seguido de `Unhandled 'error' event`,
  y el proceso moría: ni try/catch, ni reintento, ni nada. Con Neon pasa solo, porque el plan
  gratuito suspende la base de datos cuando lleva unos minutos sin uso y su PgBouncer recicla
  conexiones por su cuenta.

  El pool ya tenía un `pool.on('error')`, y por eso el fallo costaba de ver: ese oyente cubre
  las conexiones **ociosas** dentro del pool, y esas sí se reponían solas. Pero una conexión
  **sacada** del pool con `connect()` es otra cosa: mientras está prestada, `pg` le quita al
  cliente el oyente del pool, y si la conexión se cae en ese rato el cliente emite `error` sin
  nadie escuchando. En Node eso termina el proceso.

  Chronova saca una conexión en exactamente dos sitios, los dos escribiendo tomas en una
  transacción, y uno de ellos corre al arrancar y cada quince minutos. De ahí que se cayera
  poco después de mostrar el banner.

  Comprobado poniendo las dos situaciones lado a lado: con la conexión ociosa el proceso
  sobrevive, con la conexión prestada muere. Ahora los dos sitios pasan por `enTransaccion`,
  que escucha al cliente mientras lo tiene prestado, no deja que el `ROLLBACK` de limpieza
  tape el error de verdad, y devuelve la conexión rota **destruida** en vez de reciclarla.
  Antes, un corte puntual dejaba una conexión inservible dentro del pool y el siguiente
  intento fallaba igual, hasta reiniciar.

  Verificado también contra PostgreSQL de verdad: se terminaron sus diez conexiones desde el
  servidor de base de datos y el proceso siguió vivo, respondiendo y escribiendo. Las cuatro
  pruebas de extremo a extremo siguen pasando sobre PostgreSQL real, que es lo que cubre los
  dos caminos reescritos.
- **`keepAlive` en el pool.** Sin él, una conexión sin tráfico la puede cortar en silencio
  cualquiera que esté en medio: el router de casa, el NAT del operador o el propio PgBouncer.

---

## [1.6.0] — 2026-09-15

Segundo bloque de la revisión de requisitos. Con esto, los tres requisitos funcionales que
estaban a medias pasan a cumplirse de punta a punta.

### Añadido

- **Cambiar la contraseña sin salir de la aplicación.** Hasta ahora la única forma era cerrar
  sesión, decir que se había olvidado, esperar un código de seis dígitos por correo y
  teclearlo. Para el público de Chronova eso no es un rodeo, es la razón por la que una
  contraseña no se cambia nunca. Está en *Mi cuenta*, en las dos aplicaciones.

  Se piden tres campos y no dos. La contraseña actual, porque sin ella un teléfono
  desbloqueado encima de una mesa es una cuenta secuestrada por quien pase por delante; y la
  nueva dos veces, porque va oculta y un dedo torcido deja a la persona fuera de su propia
  cuenta sin saber qué escribió. El cambio cierra las sesiones de los demás teléfonos, que es
  para lo que sirve, y devuelve un token nuevo para este: echar a alguien de su teléfono por
  haber hecho lo correcto enseña a no volver a hacerlo.
- **Elegir el período del historial** (RF-19): semana, mes o tres meses, en el historial del
  paciente y en el que ve el cuidador. El servidor aceptaba `desde` y `hasta` desde el
  principio y ninguna pantalla los enviaba. Son tres botones y no un calendario a propósito:
  elegir dos fechas en un calendario de teléfono es de las interacciones más difíciles que
  existen para una persona mayor, y las preguntas reales son «¿cómo voy esta semana?» y «¿qué
  le llevo al médico?».
- **Elegir cuándo empieza un tratamiento** (RF-06): hoy, mañana u otro día. Antes el
  formulario nunca enviaba `fechaInicio`, así que todo empezaba hoy y no había forma de
  registrar un tratamiento que ya venía de antes. Cuando se escribe una fecha a mano se
  muestra debajo en palabras («martes, 16 de septiembre de 2026»), que es lo que permite
  darse cuenta de una errata antes de guardarla.
- **El parentesco del cuidador** (RF-02): un campo opcional en el registro. El servidor lo
  aceptaba y la pantalla de cuenta ya lo mostraba, pero nadie lo pedía nunca, así que aquel
  bloque era código muerto. Sirve para que el paciente sepa quién le pide acompañarlo:
  «Ana Correa» dice bastante menos que «Ana Correa, su hija».

### Corregido

- **Un correo con dos cuentas dejaba una inalcanzable.** Chronova permite a propósito tener
  cuenta de paciente y de cuidadora con el mismo correo, y el inicio de sesión acepta un
  `tipo` justamente para eso, pero la app nunca lo enviaba: el servidor devolvía siempre la de
  paciente y la otra no se podía abrir nunca más, ni recuperando la contraseña.

  Ahora, cuando la contraseña abre las dos, el servidor responde `CUENTA_AMBIGUA` y la app
  pregunta con cuál entrar. Y solo entonces: si las contraseñas son distintas, la propia
  contraseña ya dice cuál es y no se pregunta nada. Quien tiene una sola cuenta, que es casi
  todo el mundo, no ve ningún cambio.
- **La resiliencia ante fallos de notificación era una casualidad, no una garantía**
  (RNF-21). Los casos de uso llamaban al notificador sin protección y se salvaban solo porque
  los adaptadores capturan sus propios errores. Ahora los cinco puntos de envío pasan por un
  único servicio que aísla el fallo, y hay dos pruebas con un notificador que lanza de verdad.

  Al escribirlas aparecieron **tres** puntos sin proteger y no dos: la revisión había visto
  los de las tomas y se le escaparon los dos del vínculo. Es la diferencia entre auditar
  leyendo y auditar ejecutando.

### Cambiado

- **El Entregable 1 se regeneró con las cifras reales.** RNF-12 deja de estar «Parcial» y
  pasa a verificado con los percentiles medidos; RNF-17 pasa de 166 pruebas a 205 más 4 de
  extremo a extremo; RNF-02 deja de afirmar un contraste que nadie había calculado y dice el
  resultado real de los 26 pares. Y tres criterios que decían «Verificado» sin serlo del todo
  (RNF-03, RNF-04 y RNF-18) ahora dicen exactamente qué falta. Un requisito que se declara
  cumplido sin estarlo es peor que uno que se declara a medias.

---

## [1.5.1] — 2026-09-15

Correcciones salidas de la revisión de requisitos (`docs/REVISION-DE-REQUISITOS.md`), que
comparó los 59 requisitos del Entregable 1 contra el código. Cumplen 55; los cuatro que no,
y los huecos que ningún requisito cubría, están en ese documento.

### Corregido

- **El panel del cuidador decía «Todavía no acompañas a nadie» cuando lo que fallaba era la
  red.** La lista arrancaba en `[]` en vez de `null`, así que un fallo de carga pintaba a la
  vez el aviso de error y el estado vacío, a un cuidador que sí acompaña a alguien. Es el
  mismo arreglo que ya llevaban `medicamentos.tsx`, `historial.tsx` y el perfil del paciente;
  esta pantalla se había quedado fuera, y es la primera que se ve al entrar como cuidador.
  Ahora distingue «no he podido preguntar» de «pregunté y no hay ninguno», y en el primer
  caso ofrece un botón de reintentar en lugar de obligar a tirar hacia abajo.
- **Los errores de formulario se pintaban arriba mientras el botón estaba abajo.** En el
  formulario de medicamento y en el registro, `setError` dejaba el mensaje a dos pantallazos
  por encima y la vista no se movía: el botón parecía muerto y la gente lo tocaba otra vez.
  Las dos pantallas usan ahora una función `avisar` que pone el mensaje **y** sube hasta él,
  de modo que no se pueda hacer una cosa sin la otra.
- **Si fallaba el último paso del restablecimiento, la app decía lo contrario de lo que había
  pasado.** `restablecerContrasena` y el inicio de sesión automático compartían un `try`: si
  la contraseña se cambiaba y el inicio de sesión fallaba por un corte de red, el mensaje
  decía «No pudimos cambiar tu contraseña». La persona lo reintentaba con un código ya
  consumido y se quedaba fuera de su cuenta creyendo que la contraseña vieja servía. Ahora
  son dos `try` separados: si falla el segundo, se va a la pantalla de ingreso con «Tu
  contraseña ya está cambiada, entra con la nueva».
- **Un par de colores incumplía el contraste mínimo de la norma.** `textoTenue` sobre
  `superficieSuave` daba 4.35:1, por debajo del 4.5:1 de WCAG 2.1 AA, y no era un par
  hipotético: es el estado «sin datos» del historial y del panel del cuidador, además a
  13 pt, donde no vale la excepción de texto grande. El gris pasa de `#67737D` a `#636F79`:
  ese par sube a 4.61:1 y los otros dos usos mejoran (4.87 sobre `fondo`, 5.15 sobre
  `superficie`) sin que ninguno empeore. Comprobado calculando los 26 pares en uso.
- Tildes que faltaban en el historial del cuidador: «Últimos días» y «período», incluida la
  etiqueta que lee TalkBack en voz alta.

---

## [1.5.0] — 2026-09-11

### Cambiado

- **La Política de Tratamiento de Datos pasa a la versión 2.0**, y con ella el aviso de
  privacidad y los términos. El cambio de fondo es quién figura como **Responsable del
  Tratamiento**: ya no está sin definir, y no es uno sino **tres**, que responden de forma
  conjunta. La **Universidad Católica Luis Amigó** (NIT 890.985.189-9), que aprueba el
  proyecto, fija sus lineamientos y supervisa, y **Emmanuel Correa Valencia** y **Julián
  Andrés Herrera Roncancio**, que deciden qué recoge el sistema y cómo se protege. Es lo que
  la institución les confirmó al equipo, y encaja con la definición legal: es Responsable
  quien decide sobre la base de datos, y cuando deciden varios, responden varios.

  La §1.3 de la política reparte las obligaciones entre los tres, porque la corresponsabilidad
  no está regulada en detalle en Colombia y lo que la ley no reparte hay que repartirlo por
  escrito. Los tres comparten un solo canal de contacto, el de la oficina de protección de
  datos de la universidad, para que el titular no tenga que averiguar a cuál escribirle.

  No es un retoque de redacción: cambia a quién le otorga la autorización el titular. Por eso
  sube la versión completa y no la menor, y por eso a quien hubiera aceptado la 1.0 la
  aplicación le pedirá autorizar de nuevo. El mecanismo ya existía; esta es la primera vez que
  se usa.

- **Los tres documentos legales se reordenaron para seguir el contenido mínimo que exige el
  artículo 2.2.2.25.3.1 del Decreto 1074 de 2015**, numeral por numeral, con una tabla de
  correspondencia al comienzo. Ese es el «formato específico» que pide la norma: no impone
  plantilla ni diseño, impone contenido, y faltaban tres de los seis puntos.

### Añadido

- **Procedimiento de consultas y reclamos con sus plazos** en la política (10 y 15 días
  hábiles, con sus prórrogas), que era el numeral 5 que faltaba, y el **período de vigencia de
  la base de datos**, que era el numeral 6.
- **`docs/legal/QUE-PEDIRLE-A-LA-UNIVERSIDAD.md`**: la lista corta de lo que todavía depende
  de la institución (el acto formal por el que asume esta base de datos, si el equipo es parte
  interna o Encargado, si la base se registra en el RNBD) con el porqué de cada punto.
- **El Responsable aparece dentro de la app**, no solo en el documento largo: en el aviso de
  privacidad de la pantalla de registro, en el texto de la casilla de autorización y en *Mis
  datos y privacidad*, con un botón que abre el correo de la oficina de protección de datos.
  El numeral 1 del artículo 2.2.2.25.3.2 lo exige donde la persona autoriza, no en un enlace.

### Corregido

- **Los botones «Leer la política completa» y «Leer los términos» abrían una página en
  blanco.** Apuntaban a `chronova.app`, un dominio que no existe todavía, así que el
  navegador se abría sobre nada. El arreglo no fue corregir la dirección sino quitarla: los
  dos documentos viven ahora **dentro de la app** (`src/dominio/textosLegales.ts`, pantalla
  `app/legal.tsx`), se leen sin conexión y quedan congelados en la versión que cada persona
  aceptó. Un documento legal que solo existe si hay internet, si el dominio está contratado
  y si el navegador abre, no es un documento al que el titular tenga acceso, y el numeral 4
  del artículo 2.2.2.25.3.2 exige que ese acceso exista.

  Los dos son alcanzables además desde la pantalla de registro, que es donde se firma.
- **El correo de contacto se salía de la tarjeta.** `protecciondedatos@amigo.edu.co` son
  treinta caracteres sin un solo espacio donde partirlo. Con la letra en «muy grande», que
  es justo la que pondría alguien que ve mal, se desbordaba 110 px y quedaba cortado, o sea
  inservible como forma de ejercer derechos. Ahora la etiqueta va encima del valor, el valor
  se parte por la arroba y por los puntos, y el correo salió de dentro de los párrafos.
  Comprobado en los dos documentos con la escala de letra más grande de las tres.
- Tildes que faltaban en la pantalla de privacidad y en la cuenta del cuidador
  («autorización», «política», «versión», «aquí», «qué»).

---

## [1.4.0] — 2026-09-09

### Añadido

- **Pruebas de extremo a extremo** (`backend/tests/e2e/`). Cuatro recorridos completos contra
  un servidor que corre en otro proceso y un PostgreSQL de verdad, comprobando al final las
  filas en la base de datos. Se diferencian de las 194 anteriores en que no hay ningún doble:
  ni repositorio en memoria, ni reloj fijo, ni servidor simulado.

  Es lo único que puede ver que el esquema SQL y las entidades encajan —un repositorio en
  memoria acepta cualquier objeto; una tabla con una columna que falta, no—, que los tipos de
  PostgreSQL van y vuelven bien (TIMESTAMPTZ, JSONB, SMALLINT[], TEXT[]) y que la concurrencia
  real sobre la misma fila se resuelve. Van en `npm run test:e2e`, aparte de `npm test`, para
  que el proyecto siga pudiendo probarse en una máquina recién clonada sin encender nada.
- **Medición de rendimiento** (`npm run rendimiento`). Percentiles y peticiones por segundo de
  los siete endpoints del camino crítico, con carga sostenida y peticiones simultáneas. Reporta
  percentiles y no la media, porque la media esconde justo lo que se nota: si una de cada veinte
  peticiones tarda tres segundos, la media apenas se mueve.

  Primer hallazgo: el panel del cuidador es el que peor escala —167 ms con diez pacientes,
  frente a 21 ms de la lista de medicamentos— porque calcula la adherencia de cada paciente por
  separado. Anotado en el trabajo futuro.
- **Entregable 3 (Capítulo 3: Desarrollo)**, con su generador `docs/generar-entregable3.js`.
  Incluye los tres manuales completos —instalación, usuario y técnico— y las cifras medidas,
  no estimadas. El generador avisa si una línea de código pasa de 84 caracteres, porque Word
  la parte y la segunda mitad pierde la sangría.

### Corregido

- La primera versión de la medición de rendimiento calentaba omitiendo diez tomas y luego medía
  omitir esas mismas, que ya estaban resueltas. Salían nueve errores y «2,3 ms de tiempo de
  respuesta», que era lo que tarda el servidor en decir que no. Un número rápido y mentiroso.

---

## [1.3.2] — 2026-09-09

### Añadido

- **Los avisos remotos al cuidador ya funcionan.** Android exige que todo mensaje de un
  servidor a un teléfono pase por Firebase Cloud Messaging, y el proyecto no tenía
  credenciales: el teléfono nunca conseguía su token y el servidor no tenía a quién avisar.
  Configurado y verificado de punta a punta.
- **`npm run push:probar`**, en el backend. El aviso al cuidador solo se dispara cuando una
  toma vence, y eso tarda horas; depurar con un ciclo de espera de tres horas no es depurar,
  es adivinar. El script recorre el mismo camino que el servidor real y responde tres
  preguntas en orden —¿hay teléfonos registrados?, ¿Expo acepta el mensaje?, ¿llegó?—, cada
  una descartando una causa. Los tokens se imprimen enmascarados.
- **`docs/PLAN-DE-TRABAJO.md`**: lo que queda, ordenado por qué bloquea a qué.

### Cambiado

- **`google-services.json` entra al repositorio.** EAS Build solo sube al servidor los
  archivos que git tiene registrados, así que tenerlo en `.gitignore` hacía fallar la
  compilación —y en el peor caso la habría dejado pasar sin configuración de Firebase, sin
  ningún error que lo explicara—. No es un secreto: no lleva clave privada, y la clave de API
  que contiene viaja dentro del APK de todas formas. La clave de la cuenta de servicio, esa
  sí secreta, sigue fuera.
- Se quitan `versionCode` y `buildNumber` de `app.json`: `eas.json` usa `appVersionSource`
  remoto, así que EAS lleva la cuenta y lo que diga `app.json` se ignora.

---

## [1.3.1] — 2026-09-09

### Corregido

- **La clave con la que se firman las sesiones podía ser la de ejemplo.** La comprobación
  que lo impedía solo se activaba si `NODE_ENV` valía exactamente `production`, que es justo
  la variable que se olvida al desplegar en una plataforma en la nube. Con la clave de
  ejemplo —publicada en `.env.example`, dentro del repositorio— cualquiera puede **fabricar
  un token de sesión válido a nombre de cualquier paciente** y leer sus datos de salud: no
  hay que adivinar ninguna contraseña, se firma y el servidor lo da por bueno. Ahora se
  rechaza siempre, y con base de datos real se exigen 32 caracteres como mínimo, porque una
  clave corta se puede probar por fuerza bruta fuera de línea a partir de un solo token.

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
