# Revisión de código — 2 de septiembre de 2026

Revisión completa del backend, la app móvil y la documentación, hecha antes de seguir añadiendo funcionalidades.

Cada defecto de esta lista fue **reproducido ejecutándolo**, no deducido leyendo. Los escenarios que aparecen son los que se ejecutaron de verdad, con su salida real.

Lo que está bien no se repite aquí; hay una sección al final con lo que se revisó y se confirmó correcto, para que no se toque por error.

---

## Estado

Los defectos marcados **[CORREGIDO]** se arreglaron con una prueba automatizada que los fija para que no vuelvan. La suite pasó de 104 a 166 pruebas.

| Corregidos | Pendientes |
|---|---|
| B-1, B-2, B-3, G-1, G-2, G-3, G-4, G-5, M-2, M-3, **M-4**, M-5, M-6, M-7, **M-8**, D-11, **D-13**, y las demás correcciones de documentación | G-6 y M-1 (seguridad, antes de desplegar) |

---

## Resumen

| Gravedad | Cantidad | Qué significa |
|---|---|---|
| Bloqueante | 3 | Rompen la promesa central del producto o corrompen el dato clínico |
| Grave | 6 | Un usuario real se topa con esto y no puede seguir |
| Medio | 7 | Molestan, confunden o debilitan una garantía declarada |
| Documentación | 13 | Afirmaciones del entregable que no resisten una comprobación |

---

# Bloqueantes

## B-1. Las alarmas dejan de sonar si el paciente no abre la app  **[CORREGIDO]**

**Dónde:** `mobile/app/(paciente)/hoy.tsx:47` y `mobile/src/infraestructura/notificaciones/AlarmasExpo.ts`

`sincronizar()` es el único sitio de toda la aplicación que programa alarmas locales — verificado: no se llama desde ningún otro archivo. Y programa **solo las tomas de hoy**, empezando por borrar todas las anteriores.

**Escenario:** Rosa abre Chronova el lunes a las 9:00. Se programan las alarmas del lunes. El lunes por la noche confirma la última. El martes no abre la app.

**A las 08:00 del martes no suena nada. Ni el miércoles. Ni nunca más.**

No queda ninguna notificación programada, y nada las vuelve a crear salvo que ella entre a la pestaña "Hoy" — que es justamente lo que la alarma existía para recordarle. El backend tampoco cubre el hueco: solo envía avisos de toma *perdida*, después del hecho.

Esto es el producto entero. Una app de adherencia que solo recuerda a quien ya se acordó de abrirla no cumple su objetivo, y falla precisamente con el usuario que más lo necesita.

**Arreglo:** programar varios días por adelantado (7 o 14) y re-sincronizar en cada arranque de la app, no solo al enfocar una pestaña.

---

## B-2. Suspender un medicamento hunde la adherencia a 0 % y alarma al cuidador  **[CORREGIDO]**

**Dónde:** `backend/src/application/use-cases/medicamentos/SuspenderMedicamento.ts:43-54`

El comentario dice "se eliminan las tomas futuras aún sin resolver", pero el código llama a `cerrarPorFaltaDeRespuesta()`, que las marca **OMITIDAS**. Una toma omitida cuenta en el denominador de la adherencia y no en el numerador. El repositorio ya tiene `eliminarPorMedicamento()`, que nadie usa.

**Escenario ejecutado:** Rosa abre la app a las 7:00; se materializan sus dos tomas del día. El médico le suspende el Losartán a esa misma hora, antes de que ninguna venciera. Salida real:

```json
{"totalProgramadas":2,"omitidas":2,"porcentaje":0,
 "nivel":"BAJA","requiereAtencionDelCuidador":true}
```

Rosa hizo todo bien —el tratamiento se suspendió— y el sistema la marca como paciente de riesgo, la sube al primer puesto del panel del cuidador y le mete dos incumplimientos falsos en su historial clínico, atribuidos al SISTEMA.

**Arreglo:** usar `eliminarPorMedicamento()` para las tomas futuras aún pendientes, como decía la intención original.

---

## B-3. Reinvitar a un cuidador después de revocarlo rompe el acceso para siempre  **[CORREGIDO]**

**Dónde:** `backend/src/application/use-cases/cuidadores/SolicitarVinculo.ts:65-84`

La guarda solo bloquea si el vínculo está PENDIENTE o ACEPTADO. Si está REVOCADO, se crea uno **nuevo con id nuevo**. Pero `buscarEntre()` —de la que depende todo `PoliticaDeAcceso`— devuelve el primero que encuentra, sin ordenar ni filtrar por estado.

**Escenario ejecutado:**

```
Rosa invita a Ana                    -> V1 ACEPTADO
Rosa revoca                          -> V1 REVOCADO
Rosa se arrepiente y vuelve a invitar-> V2 ACEPTADO (id distinto), API responde 201
Ana consulta los medicamentos        -> "No tienes acceso a la informacion de este paciente."
Rosa lista sus cuidadores            -> Ana aparece DOS veces
```

El acceso queda roto de forma permanente: por más veces que Rosa invite, siempre gana V1.

**Y en PostgreSQL es peor.** El esquema declara `UNIQUE (cuidador_id, paciente_id)` y el adaptador solo tiene `ON CONFLICT (id)`. El INSERT viola la restricción, el error no es de dominio y sale como **HTTP 500**: la paciente sencillamente no puede volver a dar acceso a su hija.

Las pruebas no lo ven porque corren en memoria, donde no existe esa restricción.

**Arreglo:** reactivar el vínculo existente en vez de crear otro; y hacer que el adaptador de Postgres arbitre por `(cuidador_id, paciente_id)`.

---

# Graves

## G-1. El panel del cuidador depende del huso horario del servidor  **[CORREGIDO]**

**Dónde:** `backend/src/application/use-cases/cuidadores/ListarPacientesDelCuidador.ts:71-74`

Es el **único** sitio que quedó usando `aMedianoche`/`sumarDias` de `domain/shared/fechas.ts`, que operan sobre la zona del proceso. Todo lo demás migró a `FechaLocal` + `ZonaHoraria` justamente para evitar esto. Y ni siquiera consulta la zona del paciente, aunque ya la tiene cargada.

**Escenario ejecutado**, mismo código, mismo reloj, misma paciente en Bogotá:

```
TZ=UTC              -> {"pendientes":1}
TZ=America/Bogota   -> {"pendientes":2}
```

La toma de las 20:00 entra o no según el reloj del servidor. Peor: entra o sale según la hora en que el cuidador consulte, así que el porcentaje del panel cambia solo, sin que el paciente haga nada.

**Esto contradice directamente el RNF-15 del entregable**, que afirma que el comportamiento no depende del huso del servidor. La afirmación es cierta para el resto del sistema; este es el resto que quedó.

---

## G-2. Cambiar el horario de un medicamento deja tomas huérfanas  **[CORREGIDO]**

**Dónde:** `ActualizarMedicamento.ts:49` junto con `ObtenerAgendaDelDia.calcularTomasFaltantes`

La agenda indexa por `medicamentoId@horaOriginal`. Al cambiar un horario, la casilla vieja sigue ocupada y la nueva se crea aparte. Nadie retira la vieja.

**Escenario ejecutado:** Rosa tiene Losartán a las 08:00 y 20:00. Mueve la toma de la mañana a las 09:00. Vuelve a abrir la agenda:

```
["08:00", "09:00", "20:00"]   <- tres tomas para un medicamento de dos
```

Cumple su tratamiento entero y termina el día con **66,7 % de adherencia**, más una notificación de "toma perdida" a su cuidadora por una toma que ella misma canceló.

Lo mismo al cambiar la frecuencia o adelantar la `fechaFin`.

---

## G-3. El servidor muere cuando PostgreSQL cierra una conexión ociosa  **[CORREGIDO]**

**Dónde:** `backend/src/infrastructure/persistence/postgres/pool.ts`

`crearPool` nunca registra `pool.on('error', ...)`. `pg-pool` reemite en el Pool los errores de los clientes ociosos, y un `EventEmitter` sin oyente de `'error'` **tumba el proceso de Node**.

**Escenario:** el pool siempre tiene conexiones ociosas. El servidor de base de datos cierra una — reinicio de mantenimiento, failover de Neon, un NAT que corta TCP inactivo. El proceso termina con código 1 y el servicio queda caído hasta que alguien lo levante a mano.

Para una API de recordatorios de medicación, un reinicio rutinario de la base de datos es un apagón.

**Arreglo:** una línea. `pool.on('error', (e) => console.error('[pg] error en cliente ocioso', e))`.

---

## G-4. Un fallo de red al arrancar borra la sesión y expulsa al usuario  **[CORREGIDO]**

**Dónde:** `mobile/src/ui/contexto/SesionContexto.tsx:128-140`

El `catch` no distingue entre un token inválido y un fallo de conexión, y en ambos casos borra la sesión guardada. La clase `ErrorDeApi` tiene un getter `exigeVolverAIniciarSesion` creado exactamente para esto, y **no se usa en ningún archivo del proyecto**.

**Escenario:** Rosa abre la app sin señal. A los 15 segundos, la sesión guardada se borra y aparece la pantalla de ingreso. Tiene que teclear correo y contraseña otra vez, en un teléfono, a los 74 años. Lo mismo cada vez que el servidor se reinicie.

---

## G-5. "Reabastecer" no hace nada en Android  **[CORREGIDO]**

**Dónde:** `mobile/app/(paciente)/medicamentos.tsx:62-84`

`Alert.prompt` es un **método estático** de la clase `Alert`: existe siempre, en las dos plataformas. Su cuerpo entero está dentro de un `if (Platform.OS === 'ios')`. Por tanto `if (Alert.prompt)` es siempre verdadero, en Android la llamada no hace nada, y el `return` impide que se llegue al camino alternativo que sí funciona.

**Escenario:** el paciente compra una caja nueva, entra a Medicamentos y toca "Reabastecer". No pasa nada. Ni diálogo, ni error. El stock sigue igual y la app le seguirá diciendo "conviene comprar más" indefinidamente.

**Arreglo:** `if (Platform.OS === 'ios')` en lugar de `if (Alert.prompt)`.

---

## G-6. Cualquiera puede robar el dispositivo push de otra persona

**Dónde:** `backend/src/infrastructure/http/routes/autenticacion.ts`, ruta `POST /dispositivos`

La ruta acepta cualquier token de Expo y lo reasigna a quien llama, sin comprobar que lo posea.

**Escenario reproducido:** un cuidador registra el token de la paciente. Misma fila, dueño distinto. A partir de ahí, Rosa **deja de recibir sus recordatorios en silencio**, sin ningún error visible, y el atacante empieza a recibir avisos con información de salud: *"Rosa Elena no confirmó 2 tomas de su tratamiento"*.

Los tokens de Expo no son secretos: viajan a cualquier servidor con el que hable la app y aparecen en registros de red y en informes de fallo.

La reasignación es intencionada (una hija reutiliza el teléfono de su madre), pero ese caso legítimo requiere **poseer el aparato**, y la API no comprueba nada.

---

# Medios

## M-1. El `JWT_SECRET` de ejemplo pasa el guardarraíl salvo con `NODE_ENV` exacto

`backend/src/config/entorno.ts`, en la comprobación de `JWT_SECRET`. El valor por defecto es `development` y la comprobación exige `production` literal.

| NODE_ENV | Clave de ejemplo | Resultado |
|---|---|---|
| `production` | sí | rechazado (correcto) |
| `prod`, `PRODUCTION`, sin definir | sí | **arranca** |

Reproducido de extremo a extremo: firmando un token con la clave que está en el repositorio, `GET /api/auth/perfil` devuelve 200 con los datos de la paciente. Además la comprobación es por subcadena, así que `JWT_SECRET=chronova-secret-2026` también la esquiva.

## M-2. Confirmar una toma antes de tiempo cuenta como puntual  **[CORREGIDO]**

`ResumenDeAdherencia.ts:42-45`. `Toma.puntualidad` distingue correctamente ADELANTADA, pero el resumen mete todo lo que no sea CON_RETRASO en `tomadasATiempo`. Y `minutosDeDesfase` aplica `Math.abs`, así que pierde el signo.

**Escenario ejecutado:** Rosa abre la app a las 7:00 y confirma por error la toma de las 20:00.

```json
{"puntualidad":"ADELANTADA","minutosDeDesfase":780}
{"tomadasATiempo":1,"porcentajeDePuntualidad":100}
```

Una toma confirmada **13 horas antes** se reporta como 100 % de puntualidad, y descuenta stock. Como el proyecto declara la puntualidad como métrica clínica, esto la invalida en el caso más fácil de provocar con el pulgar.

## M-3. El cuidador ve las horas en su zona, no en la del paciente  **[CORREGIDO]**

`mobile/app/(cuidador)/paciente/[id]/` e `historial.tsx`: `toLocaleString` sin `timeZone`, aunque el servidor envía `zonaHoraria` en la respuesta y el modelo ya lo declara.

**Escenario:** Julián en Madrid, Rosa en Medellín. Rosa se salta la dosis del lunes a las 20:00; Julián lee *"martes, 03:00"* y llama a su madre por una dosis de madrugada que nunca existió. El backend se arregló en su momento; la vista no.

## M-4. Token vencido = callejón sin salida  **[CORREGIDO]**

Ninguna pantalla comprueba el 401. Al octavo día, todas las acciones fallan con un error genérico y la única salida es encontrar "Cerrar sesión" al final de "Mi cuenta" — un botón que dice lo contrario de lo que el usuario quiere.

**Cómo se arregló.** No se añadió una pantalla de "tu sesión expiró": se hizo que no llegue a expirar. Cuando al token le quedan menos de tres días, el servidor emite uno nuevo y lo devuelve en la cabecera `X-Sesion-Renovada`; el cliente HTTP de la app la lee en el único punto por donde pasan todas las peticiones y reemplaza el guardado. La persona no ve nada, que es el objetivo.

Esto **solo era seguro después de M-8**. Alargar indefinidamente unas sesiones que no se podían cortar habría sido empeorar el problema, no resolverlo. Por eso los dos se hicieron juntos y en ese orden.

## M-5. Un fallo de red en la pantalla de detalle dice "el vínculo se revocó"  **[CORREGIDO]**

`paciente/[id]/_layout.tsx`. Si falla la carga, `paciente` queda en `null` y se muestra *"No encontramos a este paciente. Puede que el vínculo se haya revocado"* — un mensaje **falso y alarmante**. Esa rama no muestra el error real ni tiene forma de reintentar.

## M-6. TalkBack no lee nada del estado de la tarjeta del paciente  **[CORREGIDO]**

Al envolver la tarjeta en un `Pressable` con `accessibilityLabel`, todo su contenido interior deja de ser accesible. Un cuidador con baja visión oye *"Ver el tratamiento de Rosa, botón"* y nada más: ni el 42 %, ni "Adherencia baja", ni "Revisar". El panel entero deja de responder la pregunta para la que existe.

Es un defecto que introduje ayer al hacer la tarjeta pulsable.

## M-7. Zonas táctiles por debajo de los 64 px que el propio proyecto exige  **[CORREGIDO]**

`tema.ts` fija 64 px y lo justifica por temblor y artritis. Se incumple en: los botones de día de la semana (44 px) y las fichas de `medicamento/nuevo.tsx` (48 px), y la fila del interruptor en `perfil.tsx` (56 px). Los botones de día además comunican su estado **solo con color**, contra la regla del propio tema.

---

## M-8. Cambiar la contraseña no cierra las sesiones ya abiertas  **[CORREGIDO]**

*Hallazgo posterior a la revisión, encontrado al construir la recuperación de contraseña.*

**Dónde:** `backend/src/infrastructure/http/middlewares/autenticacion.ts`

El middleware valida la firma y la caducidad del token, y nada más. No consulta al usuario, así que:

- Si alguien te robó la cuenta y tú recuperas la contraseña, **su token sigue valiendo** hasta siete días. Cambiar la clave debería dejarlo fuera de inmediato, y no lo hace.
- Una cuenta **desactivada** (`activo: false`) conserva el acceso el mismo tiempo. `IniciarSesion` sí comprueba `activo`; el middleware no.

**Cómo se arregló.** No guardando sesiones —eso obligaría a una tabla que crece sin parar y a limpiarla— sino guardando **una sola fecha por cuenta**: `sesiones_validas_desde`. El token lleva dentro la fecha que tenía la cuenta cuando se emitió; si al llegar una petición no coincide con la guardada, el token no vale. Cambiar la contraseña mueve esa fecha, y con ella caen todas las sesiones abiertas a la vez.

La comprobación se hace en un caso de uso nuevo, `VerificarSesion`, y no en el middleware. El middleware solo lee la cabecera y escribe la respuesta; la regla —cuenta activa, token posterior al último cambio, renovación si toca— vive en la capa de aplicación, donde se puede probar sin levantar un servidor. Las quince pruebas de `tests/use-cases/sesiones.test.ts` no tocan Express.

Dos detalles que costaron y conviene poder explicar:

- **Se compara por igualdad exacta, no por "el token es más viejo que el cambio".** La marca de emisión de un JWT (`iat`) va en **segundos**. Al restablecer la contraseña la app entra acto seguido, dentro del mismo segundo: con una comparación por fecha, el token recién emitido habría parecido anterior al cambio y habría quedado inválido al nacer. Hay una prueba dedicada a ese caso.
- **Cuesta una consulta a la base de datos por petición.** No hay forma de revocar sesiones sin consultar algo; es el precio de poder cerrarlas. La consulta es por clave primaria, la más barata que existe.

**Efecto secundario al desplegar:** los tokens antiguos no llevan la marca nueva, así que todo el mundo tendrá que iniciar sesión una vez más. Es esperado y ocurre una sola vez.

---

# Documentación: afirmaciones que no resisten una comprobación

Son las más urgentes en términos de entrega, porque se refutan en la sustentación con un comando.

| # | Dónde | Qué dice | Qué es cierto |
|---|---|---|---|
| D-1 | ARQUITECTURA, Prueba 4 | «Ni una sola línea del dominio ni de los casos de uso cambió» | **Falso.** El commit añadió `domain/dispositivo/` (4 archivos), dos casos de uso y modificó `domain/index.ts`. Lo cierto: no se modificó ninguna entidad ni caso de uso **ya existente** |
| D-2 | ARQUITECTURA, Prueba 4 | «y una línea en `contenedor.ts`» | `contenedor.ts` cambió **51 líneas** |
| D-3 | ARQUITECTURA, Prueba 1 | «El cambio ocurre en una línea de `contenedor.ts`» | La línea que cambia el usuario es del `.env`; en `contenedor.ts` es un `if/else` de ~20 líneas ya escrito |
| D-4 | ARQUITECTURA §4 | «Cada entidad tiene `crear()`» | Solo `Medicamento`. Las demás: `registrar()`, `programar()`, `solicitar()` |
| D-5 | ARQUITECTURA §4, tabla | `system/` contiene «el notificador» | Se movió a `infrastructure/notificaciones/`, carpeta que la tabla no menciona |
| D-6 | Requerimientos, Trazabilidad | «salvo AlarmasExpo» son de dominio y casos de uso | Faltan dos excepciones: `NotificadorExpoPush` (infraestructura) y `NavegacionPorNotificaciones` (app móvil) |
| D-7 | RNF-02 | «**Todo** par de texto y fondo cumple 4.5:1» | Cinco pares de la paleta quedan entre 4.20 y 4.44. Los que **usa la interfaz** sí cumplen: decirlo así |
| D-8 | RNF-09 | «expiración **máxima** de siete días» | `7d` es el valor **por defecto**; no hay tope |
| D-9 | RNF-21 | «las **cuatro** tomas vencidas se cerraron igual» | Cierto, pero salió de una ejecución manual que no está en el repositorio. Ninguna prueba lo reproduce |
| D-10 | RNF-13 y RNF-12 | «25 peticiones simultáneas», «20-75 ms» | Mismo problema: no hay script en el repositorio que lo reproduzca. La prueba automática usa 2 peticiones |
| D-11 **[CORREGIDO]** | Diagramas 03 y 08 | «las cinco entidades», «las cinco tablas» | Eran **siete y siete**: faltaban `Dispositivo` y `SolicitudDeRecuperacion`, y las tablas `dispositivos` y `recuperaciones`. Ambos diagramas se rehicieron con las dos entidades, sus value objects (`TokenDeDispositivo`, `CodigoDeRecuperacion`), las enumeraciones `TipoDePropietario` y `MotivoDeRechazo`, y las dos tablas dibujadas con línea punteada para dejar claro que **no** llevan clave foránea. El diagrama de clases pasó a `left to right direction`, que lo vuelve alto y estrecho en vez de ancho: con siete entidades medía 4400 px de ancho y PlantUML recorta en silencio lo que pasa de 4096, de modo que la primera versión perdió media nota sin dar error. De paso, los ocho `.puml` llevan ahora en su primera línea el mismo nombre del archivo, que es lo que evita que una regeneración deje la imagen nueva al lado de la vieja |
| D-12 **[CORREGIDO]** | API.md | `POST /registro/paciente` | No documentaba el parámetro **`zonaHoraria`**, del que depende toda la Prueba 5 y el RNF-15. Ya está documentado, con su valor por defecto y la explicación de por qué el identificador IANA no es intercambiable por un desfase fijo |
| D-13 **[CORREGIDO]** | Requerimientos | «Los treinta y dos están implementados» | RF-08 (editar medicamento) y RF-25 (cambiar permisos) existían en el backend y **no eran alcanzables desde la app**. RF-25 se cerró con la lista de permisos del perfil del paciente. RF-08 quedó a medias hasta hoy: el paciente podía editar su medicación, pero el cuidador no, aunque el paciente le hubiera concedido `puedeGestionarMedicamentos` y el servidor lo respetara en las tres operaciones. Ahora la pantalla del cuidador honra ese permiso: agregar, editar, reabastecer y suspender |
| D-14 **[CORREGIDO]** | Diagramas 01, 02 y 07 | Los tres se presentaban como el mapa completo del sistema | Les faltaba funcionalidad que ya existía en el código, que es la peor forma de estar mal: lo dibujado era cierto, así que nada delataba el hueco. Al 01 le faltaban `Recuperar el acceso con un código` y `Registrar este teléfono para los avisos`; al 02, esos mismos y el bloque entero de gestión del tratamiento por parte del cuidador —cuatro casos de uso que el servidor ya respetaba—; al 07, las entidades `Dispositivo` y `SolicitudDeRecuperacion`, los puertos `EnviadorDeCorreo` y `GeneradorDeCodigos` y los adaptadores de notificación y correo. Los tres se rehicieron y se miraron uno por uno: aparecieron dos defectos que solo se ven en la imagen —dos casos de uso del 01 habían quedado sin línea al actor, y una nota del 02 cruzaba la hoja entera— que ninguna revisión del texto fuente habría detectado. De paso, los ocho pasaron a la paleta de la marca (`#185A66`) y el 07 a líneas en ángulo recto |

Menores del mismo tipo: RNF-07 dice «bcrypt» y la dependencia es `bcryptjs`; RNF-01 dice «el texto base» y hay tamaños de 14 y 16 (es cierto para el texto de cuerpo); DEL-MVP dice «~45 archivos» y son 88; README y la guía citan la IP `192.168.1.10`, que ya no es la del `app.json`.

---

# Lo que se revisó y está bien

Para que no se toque por error, y porque también es parte del resultado de la revisión:

- **Inyección SQL: cero.** Las 41 consultas usan parámetros. La única interpolación es un formateador de fecha.
- **Columnas DATE y husos horarios en persistencia:** correcto. Se ejecutó el flujo completo contra memoria y contra PostgreSQL 16 bajo cuatro husos: salida idéntica en los cuatro, sin desplazamiento de fechas.
- **Transacciones e idempotencia de la agenda:** `BEGIN`/`COMMIT`/`ROLLBACK` con `release()` en `finally`, y el `ON CONFLICT ... DO NOTHING` es el arbitraje correcto.
- **Autenticación y autorización:** los ocho casos de uso que tocan datos del paciente llaman a `PoliticaDeAcceso` con el permiso correcto. Verificado sin token (401), tipo equivocado (403) y cuidador sin vínculo (403).
- **RNF-16 (cero dependencias externas en el dominio):** comprobado archivo por archivo en los 38 del dominio. Cierto.
- **RNF-18 (todo el SQL en un archivo):** cierto para las consultas. Matiz honesto: el DDL vive en `esquema.sql`.
- **RNF-15 (seis husos):** 166 pruebas en verde bajo los seis, de Kiritimati (UTC+14) a Anchorage (UTC−9). Cierto, y vuelto a comprobar tras la segunda revisión.
- **Prueba 6 de ARQUITECTURA:** cierta y verificable con `git show`. En ese commit no cambió ningún archivo de `backend/src/`.
- **Notificador de Expo:** nunca lanza, reparte en lotes de 100, da de baja los tokens muertos, y el compuesto aísla cada destino.
- **API.md:** los 23 endpoints documentados existen con ese método y esa ruta, y no falta ninguno.
- **No hay bucles de renderizado** en la app, ni rutas inexistentes, ni redirecciones circulares.
- **Sin divisiones por cero** en los cálculos de adherencia.

---

# Segunda revisión — 3 de septiembre

Una revisión general de todas las funcionalidades, ya con el proyecto completo. Se hizo **ejecutando**, no leyendo: con el servidor levantado en memoria y peticiones reales. Todo lo que sigue viene con la respuesta HTTP que lo demostró.

El hallazgo de fondo no es ninguno de los defectos por separado, sino por qué ninguno se había visto: **las 146 pruebas de entonces llamaban a los casos de uso directamente y no pasaban ni una vez por la capa HTTP.** El enrutado, la lectura de los parámetros de la URL, el parseo del cuerpo y la traducción de errores a códigos no los tocaba nadie. Ahí estaban casi todos.

## Lo que se corrigió

| # | Qué pasaba | Cómo se comprobó |
|---|---|---|
| R-1 **[CORREGIDO]** | **El panel del cuidador ignoraba `puedeVerHistorial`.** Cuando la paciente apagaba «ver mi tratamiento», `/medicamentos`, `/tomas/agenda` y `/tomas/historial` respondían 403 y `GET /api/cuidadores/pacientes` seguía devolviendo su adherencia, cuántos medicamentos toma y cuándo confirmó la última. Era el único caso de uso que leía datos clínicos **sin pasar por `PoliticaDeAcceso`** — exactamente lo que esa clase existe para evitar, según su propio comentario. La paciente creía haber cortado el acceso, tres pantallas se lo confirmaban, y el cuidador la seguía viendo | Retirando el permiso por la API y comparando las cuatro respuestas. La fila sigue viniendo, con `datosClinicosVisibles: false` y los campos clínicos vacíos: ocultarla entera haría creer al cuidador que el vínculo desapareció |
| R-2 **[CORREGIDO]** | **Consultar el calendario hacia atrás fabricaba incumplimientos.** Pedir la agenda de un día pasado *materializaba* sus tomas en PENDIENTE con fecha vencida, y la tarea de los quince minutos las cerraba a continuación como OMITIDA por el SISTEMA. Un paciente sin ningún registro pasaba a tener seis faltas y 0% de adherencia por el solo hecho de mirar tres días atrás — y disparaba el aviso «no confirmó una toma» a sus cuidadores | Ejecutado: `0 registros` → mirar tres días pasados → `{"tomasCerradas":6}` → `6 omitidas, 0%, adherencia BAJA`. Ahora un día pasado **solo se lee**. La app nunca pedía fechas pasadas, así que no llegó a ocurrir en la práctica; habría empezado a ocurrir con la API en internet |
| R-3 **[CORREGIDO]** | **Todos los 500 que devolvía la API eran errores 400 del cliente.** `express.json()` lanza con su código ya puesto y el manejador lo ignoraba: JSON mal formado → 500, cuerpo de más de 256 kB → 500. Además cada uno imprimía una traza completa en el log, tapando los fallos de verdad | Ahora 400 y 413. La rama solo acepta códigos por debajo de 500: un 5xx de una librería sí es un fallo nuestro y se registra como tal |
| R-4 **[CORREGIDO]** | **Los parámetros de la URL no se validaban.** Las rutas hacían `peticion.query.fecha as string`, pero `as` es una promesa al compilador, no una comprobación: Express entrega un **array** si el parámetro se repite y un **objeto** si lleva corchetes, y el dominio llamaba `.trim()` sobre eso. `?fecha=a&fecha=b` → 500, `?pacienteId[a]=1` → 500 | Tres esquemas de Zod nuevos para las consultas. También `?dias=100000` en el panel, que se aceptaba y lanzaba una consulta descomunal por cada paciente: ahora tope de 365 |
| R-5 **[CORREGIDO]** | **El filtro del historial por medicamento fallaba en silencio.** El id se comparaba en crudo, sin pasar por `Identificador`, que normaliza a minúsculas. Un UUID escrito en mayúsculas —igual de válido— devolvía **200 con la lista vacía**: sin error, y el paciente leyendo que no se había tomado ninguna dosis | La prueba que lo fija usa ids UUID de verdad a propósito. Con el generador secuencial de las demás pruebas —ids de solo dígitos— una prueba de mayúsculas pasa siempre, esté el defecto o no |
| R-6 **[CORREGIDO]** | **La ficha del cuidador se quedaba en blanco si fallaba la red.** El contexto guardaba el mensaje de error pero no bloqueaba nada; el layout montaba las tres pestañas igual y la primera hacía `if (!paciente) return null`. El cuidador tocaba la tarjeta de su madre y veía una pantalla vacía con una barra de pestañas: sin aviso, sin rueda y sin forma de reintentar | Motivo de bloqueo nuevo, `FALLO_DE_CARGA`. Si ya había datos cargados no se bloquea: un refresco fallido deja lo anterior en pantalla con el aviso encima, en vez de perder lo que se estaba leyendo |
| R-7 **[CORREGIDO]** | El aviso de bloqueo decía **«Baja para reintentar»** y el gesto no estaba conectado | Prometer una salida que no existe es peor que no ofrecerla. Ahora el gesto funciona en los dos casos que pueden resolverse solos, y no se ofrece en los que no |
| R-8 **[CORREGIDO]** | **Errores de carga disfrazados de «no tienes nada».** Si fallaba la carga, la lista de medicamentos del paciente decía *«Aún no tienes medicamentos»* y el historial *«Todavía no hay historial»*. Para un adulto mayor que depende de esa lista es un mensaje falso, alarmante, y parece que la app le borró el tratamiento | Se distingue «no pudimos preguntar» de «no hay nada», y las dos pantallas ganaron el gesto de recarga. `hoy.tsx` ya lo hacía bien: el patrón correcto existía y estas dos se habían quedado atrás |
| R-9 **[CORREGIDO]** | **La lista de quién ve los datos de salud fallaba en silencio.** El `catch` decía *«es información secundaria: no vale la pena romper la pantalla»*. No lo es: es la lista de quién tiene acceso al tratamiento. Vacía por un fallo de red se lee como «no le has dado acceso a nadie», y puede haber dos cuidadores viéndolo todo | Ahora la sección dice que no pudo comprobarse, sin romper el resto de la pantalla — las preferencias de accesibilidad tienen que seguir siendo alcanzables aunque no haya red |

Las veinte pruebas de `tests/http/` se escribieron para estos defectos y **se comprobó que fallan con el código anterior**: se revirtió cada arreglo, se vio la prueba en rojo y se volvió a aplicar. Una prueba de regresión que nunca se vio fallar no demuestra nada.

## Lo que se revisó y está bien

- **Ningún caso de uso huérfano.** Los 24 están instanciados en `contenedor.ts` y alcanzados por un endpoint. `CerrarTomasVencidas` lo parece y no lo es: se dispara desde `main.ts` cada quince minutos.
- **Ningún cuerpo sin validar.** Los `POST` y `PATCH` pasan todos por un esquema de Zod que cubre los campos que el caso de uso lee, y Zod descarta las claves desconocidas.
- **`ActualizarMedicamento`, `SuspenderMedicamento` y `ReabastecerStock`** resuelven el `pacienteId` **desde el medicamento**, no desde el cuerpo de la petición. No se pueden engañar.
- **Los permisos del cuidador se comprueban antes de mostrar**, no reaccionando a un 403 del servidor. Está por encima de lo habitual.
- **Ni un solo `TODO`, `FIXME` ni botón sin `onPress`** en todo el proyecto. Lo que falta son caminos, no andamios.

## Lo que sigue abierto

Nada de esto rompe nada hoy; es funcionalidad a medias, y conviene tenerla escrita para no defender el proyecto como si estuviera terminado:

| Qué | Estado |
|---|---|
| **RF-02**, «registro de cuidador indicando su rol» | La pantalla de registro nunca envía `rol`. `cuidador.rol` es siempre nulo y dos líneas del perfil del paciente muestran una rama que no puede cumplirse |
| **RF-19**, «historial en un período determinado» | El backend acepta `desde` y `hasta`; la app siempre pide 30 días, y no dice qué periodo cubre el porcentaje que muestra |
| Medicamentos «cada N días» | El backend lo soporta entero; el formulario solo conoce «todos los días» y «algunos días». Si existe uno, **editarlo lo convierte en semanal sin avisar** |
| Zona horaria | `Paciente.cambiarZonaHoraria()` existe y ningún endpoint la llama. Solo se fija al registrarse, y de ella dependen todos los horarios |
| Baja de cuenta | `desactivar()` existe y solo lo llaman las pruebas. `VerificarSesion` sabe rechazar cuentas inactivas, pero nada puede desactivar una |
| Reactivar un medicamento | El método existe; suspender es hoy un viaje sin retorno |
| Avisos por adherencia baja | `Vinculo` documenta el permiso como «avisos cuando la adherencia baja **o** se pierde una toma». Solo está la segunda mitad |
| `altoContraste` | Declarado en el modelo, en la API y en el contexto. Sin interruptor que lo encienda y sin nada que lo consuma |
| Marca «Sí/No» de los días | `#E2E8EC` sobre blanco: **1.24:1**, cuando `tema.ts` afirma que ninguno baja de 4.5:1 |
| El cuidador elige los permisos que pide | Si la solicitud la inicia él, los permisos que envía se guardan tal cual y «Aceptar» los concede de golpe. Contradice `permisosPorDefecto()`, que existe para ser conservador |
| Enumeración de correos | `POST /vinculos` responde 404 con un correo que no existe y 201 con uno que sí. En una app de salud, saber que alguien está registrado ya es un dato |

---

---

# Tratamiento de datos y versionado — 5 de septiembre

Chronova trata **datos de salud**, que el artículo 5 de la Ley 1581 de 2012 clasifica como **sensibles**. Para ellos el artículo 6 exige autorización **explícita**, y el artículo 8 literal b) le da al titular derecho a **pedir prueba de lo que autorizó**. Hasta ahora la aplicación no pedía ninguna autorización ni guardaba constancia de nada.

| Qué se hizo | Dónde |
|---|---|
| **Documentos legales**, versionados y con fecha de vigencia: política de tratamiento, términos y condiciones y aviso de privacidad | `docs/legal/` |
| **Casilla de autorización en el registro**, sin marcar por defecto, que menciona explícitamente los datos de salud y la salida del país | `mobile/app/(auth)/registro.tsx` |
| **La regla vive en el caso de uso, no en el formulario.** Un formulario es una sugerencia: cualquiera puede llamar a la API directamente. Sin `aceptaPoliticaDeDatos: true` el servidor no crea la cuenta | `application/services/politicaDeDatos.ts` |
| **Constancia de qué versión se aceptó y cuándo**, como value object del dominio y dos columnas nuevas | `domain/shared/AutorizacionDeDatos.ts` |
| **Pantalla «Mis datos y privacidad»**, alcanzable desde el registro —antes de aceptar— y desde Mi cuenta | `mobile/app/privacidad.tsx` |
| **Versionado semántico**, `versionCode` de Android y `CHANGELOG.md` | raíz del proyecto |

Tres decisiones que conviene poder defender:

- **La casilla nace sin marcar.** Una casilla premarcada no es autorización expresa, es una suposición con forma de consentimiento.
- **Se guarda la versión que el cliente declara haber mostrado, no la que el servidor considera vigente.** Lo que hay que poder probar es el texto que la persona tuvo delante.
- **Las cuentas anteriores quedan marcadas como «no consta»**, sin inventarles una fecha. Es preferible que la aplicación admita que no lo sabe a fabricar una autorización que nadie otorgó.

**Lo que sigue pendiente y no es código:** decidir quién figura como Responsable del Tratamiento —los autores o la universidad—, completar los campos entre corchetes de los documentos, y que **alguien con formación jurídica los revise antes de publicarlos**. Están redactados a partir de la ley y del código real, pero quien los redactó no es abogado.

---

# Qué queda

Los ocho puntos del orden que proponía esta revisión se ejecutaron, en ese orden. Lo único que sigue abierto es el último, y sigue abierto **a propósito**:

**G-6 y M-1 son los dos defectos de seguridad, y solo importan cuando el servidor esté en internet.** Hoy corre en una red local, donde el atacante tendría que estar sentado en la misma wifi. En cuanto haya una URL pública dejan de ser teóricos, así que van junto con el alojamiento y no antes.

De la segunda revisión queda la tabla de arriba: funcionalidad a medias, ninguna de la cual rompe nada. Lo urgente de aquella —la fuga del panel, el historial que se fabricaba solo y las tres pantallas que mentían al usuario— está corregido y fijado con pruebas.
