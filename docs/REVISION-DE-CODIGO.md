# Revisión de código — 2 de septiembre de 2026

Revisión completa del backend, la app móvil y la documentación, hecha antes de seguir añadiendo funcionalidades.

Cada defecto de esta lista fue **reproducido ejecutándolo**, no deducido leyendo. Los escenarios que aparecen son los que se ejecutaron de verdad, con su salida real.

Lo que está bien no se repite aquí; hay una sección al final con lo que se revisó y se confirmó correcto, para que no se toque por error.

---

## Estado

Los defectos marcados **[CORREGIDO]** se arreglaron el mismo día, con una prueba automatizada que los fija para que no vuelvan. La suite pasó de 104 a 128 pruebas.

| Corregidos | Pendientes |
|---|---|
| B-1, B-2, B-3, G-1, G-2, G-3, G-4, G-5, M-2, M-3, M-5, M-6, M-7, y las trece correcciones de documentación | G-6 y M-1 (seguridad, antes de desplegar), M-4 y **M-8** (sesiones: renovarlas y poder cerrarlas) |

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

**Dónde:** `backend/src/infrastructure/http/routes/autenticacion.ts:87-98`

La ruta acepta cualquier token de Expo y lo reasigna a quien llama, sin comprobar que lo posea.

**Escenario reproducido:** un cuidador registra el token de la paciente. Misma fila, dueño distinto. A partir de ahí, Rosa **deja de recibir sus recordatorios en silencio**, sin ningún error visible, y el atacante empieza a recibir avisos con información de salud: *"Rosa Elena no confirmó 2 tomas de su tratamiento"*.

Los tokens de Expo no son secretos: viajan a cualquier servidor con el que hable la app y aparecen en registros de red y en informes de fallo.

La reasignación es intencionada (una hija reutiliza el teléfono de su madre), pero ese caso legítimo requiere **poseer el aparato**, y la API no comprueba nada.

---

# Medios

## M-1. El `JWT_SECRET` de ejemplo pasa el guardarraíl salvo con `NODE_ENV` exacto

`backend/src/config/entorno.ts:32,46`. El valor por defecto es `development` y la comprobación exige `production` literal.

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

`mobile/app/(cuidador)/paciente/[id].tsx` e `historial.tsx`: `toLocaleString` sin `timeZone`, aunque el servidor envía `zonaHoraria` en la respuesta y el modelo ya lo declara.

**Escenario:** Julián en Madrid, Rosa en Medellín. Rosa se salta la dosis del lunes a las 20:00; Julián lee *"martes, 03:00"* y llama a su madre por una dosis de madrugada que nunca existió. El backend se arregló en su momento; la vista no.

## M-4. Token vencido = callejón sin salida

Ninguna pantalla comprueba el 401. Al octavo día, todas las acciones fallan con un error genérico y la única salida es encontrar "Cerrar sesión" al final de "Mi cuenta" — un botón que dice lo contrario de lo que el usuario quiere.

## M-5. Un fallo de red en la pantalla de detalle dice "el vínculo se revocó"  **[CORREGIDO]**

`paciente/[id].tsx:159-171`. Si falla la carga, `paciente` queda en `null` y se muestra *"No encontramos a este paciente. Puede que el vínculo se haya revocado"* — un mensaje **falso y alarmante**. Esa rama no muestra el error real ni tiene forma de reintentar.

## M-6. TalkBack no lee nada del estado de la tarjeta del paciente  **[CORREGIDO]**

Al envolver la tarjeta en un `Pressable` con `accessibilityLabel`, todo su contenido interior deja de ser accesible. Un cuidador con baja visión oye *"Ver el tratamiento de Rosa, botón"* y nada más: ni el 42 %, ni "Adherencia baja", ni "Revisar". El panel entero deja de responder la pregunta para la que existe.

Es un defecto que introduje ayer al hacer la tarjeta pulsable.

## M-7. Zonas táctiles por debajo de los 64 px que el propio proyecto exige  **[CORREGIDO]**

`tema.ts` fija 64 px y lo justifica por temblor y artritis. Se incumple en: los botones de día de la semana (44 px) y las fichas de `medicamento/nuevo.tsx` (48 px), y la fila del interruptor en `perfil.tsx` (56 px). Los botones de día además comunican su estado **solo con color**, contra la regla del propio tema.

---

## M-8. Cambiar la contraseña no cierra las sesiones ya abiertas

*Hallazgo posterior a la revisión, encontrado al construir la recuperación de contraseña.*

**Dónde:** `backend/src/infrastructure/http/middlewares/autenticacion.ts`

El middleware valida la firma y la caducidad del token, y nada más. No consulta al usuario, así que:

- Si alguien te robó la cuenta y tú recuperas la contraseña, **su token sigue valiendo** hasta siete días. Cambiar la clave debería dejarlo fuera de inmediato, y no lo hace.
- Una cuenta **desactivada** (`activo: false`) conserva el acceso el mismo tiempo. `IniciarSesion` sí comprueba `activo`; el middleware no.

Arreglarlo bien exige una consulta al usuario en cada petición —para comparar la fecha de emisión del token contra la del último cambio de contraseña— y eso toca la misma infraestructura de sesiones que la renovación pendiente (M-4).

**Se dejó fuera a propósito** de la recuperación de contraseña, para que ese cambio se pudiera revisar solo. Va junto con M-4.

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
| D-12 | API.md | `POST /registro/paciente` | No documenta el parámetro **`zonaHoraria`**, del que depende toda la Prueba 5 y el RNF-15 |
| D-13 | Requerimientos | «Los treinta y dos están implementados» | RF-08 (editar medicamento) y RF-25 (cambiar permisos) existen en el backend pero **no son alcanzables desde la app**. El README ya lo admite; el documento no, y se contradicen |

Menores del mismo tipo: RNF-07 dice «bcrypt» y la dependencia es `bcryptjs`; RNF-01 dice «el texto base» y hay tamaños de 14 y 16 (es cierto para el texto de cuerpo); DEL-MVP dice «~45 archivos» y son 88; README y la guía citan la IP `192.168.1.10`, que ya no es la del `app.json`.

---

# Lo que se revisó y está bien

Para que no se toque por error, y porque también es parte del resultado de la revisión:

- **Inyección SQL: cero.** Las 36 consultas usan parámetros. La única interpolación es un formateador de fecha.
- **Columnas DATE y husos horarios en persistencia:** correcto. Se ejecutó el flujo completo contra memoria y contra PostgreSQL 16 bajo cuatro husos: salida idéntica en los cuatro, sin desplazamiento de fechas.
- **Transacciones e idempotencia de la agenda:** `BEGIN`/`COMMIT`/`ROLLBACK` con `release()` en `finally`, y el `ON CONFLICT ... DO NOTHING` es el arbitraje correcto.
- **Autenticación y autorización:** los nueve casos de uso que tocan datos del paciente llaman a `PoliticaDeAcceso` con el permiso correcto. Verificado sin token (401), tipo equivocado (403) y cuidador sin vínculo (403).
- **RNF-16 (cero dependencias externas en el dominio):** comprobado archivo por archivo en los 40 del dominio. Cierto.
- **RNF-18 (todo el SQL en un archivo):** cierto para las consultas. Matiz honesto: el DDL vive en `esquema.sql`.
- **RNF-15 (seis husos):** 128 pruebas en verde bajo los seis. Cierto.
- **Prueba 6 de ARQUITECTURA:** cierta y verificable con `git show`. En ese commit no cambió ningún archivo de `backend/src/`.
- **Notificador de Expo:** nunca lanza, reparte en lotes de 100, da de baja los tokens muertos, y el compuesto aísla cada destino.
- **API.md:** los 21 endpoints documentados existen con ese método y esa ruta, y no falta ninguno.
- **No hay bucles de renderizado** en la app, ni rutas inexistentes, ni redirecciones circulares.
- **Sin divisiones por cero** en los cálculos de adherencia.

---

# Orden sugerido

1. **B-1** (las alarmas) — es el producto.
2. **B-2** y **G-2** (suspender y cambiar horario) — corrompen la métrica que el proyecto existe para mejorar.
3. **D-1 a D-6** (la documentación falsa) — barato, y es lo que se refuta en la sustentación.
4. **B-3**, **G-3**, **G-5** — cada uno es un arreglo pequeño y cierra un callejón sin salida.
5. **G-1** — coherencia con el RNF-15 ya declarado.
6. **G-4**, **M-4** (sesión) — junto con la recuperación de contraseña, que sigue pendiente.
7. **M-6**, **M-7** (accesibilidad) — encajan bien con el trabajo de diseño cuando se retome.
8. **G-6**, **M-1** (seguridad) — antes de cualquier despliegue real, no antes de la sustentación.
