# Guía de sustentación — arquitectura y estructura de Chronova

Material de estudio para responder preguntas técnicas sobre cómo está construido el
proyecto. **Todos los números de este documento salen de ejecutar comandos sobre el código
real**, no de estimaciones; al final de cada afirmación importante está el comando que la
comprueba, por si te lo piden en vivo.

---

## 1. La respuesta de treinta segundos

Si te preguntan «¿cómo está estructurado el proyecto?», esta es la respuesta corta. Apréndela
de memoria; lo demás son ampliaciones de esto.

> Chronova usa **arquitectura hexagonal**, también llamada de puertos y adaptadores. La idea
> es que las reglas del negocio —qué es una toma, cuándo se considera cumplida, quién puede
> ver los datos de un paciente— vivan en un centro que **no depende de nada externo**: ni de
> la base de datos, ni de Express, ni de la aplicación móvil. Todo lo de fuera se conecta a
> ese centro a través de **interfaces que el propio centro define**.
>
> La prueba de que funciona es que la aplicación entera **corre sin base de datos**: se
> cambia una variable de entorno y los mismos casos de uso trabajan contra repositorios en
> memoria. Por eso las 185 pruebas terminan en menos de seis segundos.

Y si te preguntan **por qué** esa arquitectura y no otra —que es la pregunta de verdad—:

> Porque el problema del proyecto no es técnico, es clínico: la adherencia al tratamiento.
> Las reglas que importan —qué cuenta como toma cumplida, cuándo el olvido se registra solo,
> qué puede ver un cuidador— son reglas de salud, no de programación. Ponerlas en un centro
> aislado significa que se pueden leer, probar y discutir con alguien que no sabe programar,
> y que cambiar de base de datos o de framework no las toca.

---

## 2. Las cinco capas

```
   ENTRADA            APLICACIÓN          DOMINIO
   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │ App móvil│─────▶│ Casos de │─────▶│ Entidades│
   │ API HTTP │      │   uso    │      │  Reglas  │
   │  Tarea   │      │ Política │      │   VOs    │
   └──────────┘      │ de acceso│      └──────────┘
                     └────┬─────┘            │
                          │ usa              │ declara
                          ▼                  ▼
                     ┌─────────────────────────┐
                     │        PUERTOS          │  (interfaces)
                     └────────────┬────────────┘
                                  │ implementan
                                  ▼
                     ┌─────────────────────────┐
                     │   ADAPTADORES DE SALIDA │
                     │ PostgreSQL · en memoria │
                     │ bcrypt · JWT · Expo     │
                     └─────────────────────────┘
```

| Capa | Qué contiene | Cifras reales |
|---|---|---|
| **Dominio** | Entidades, value objects, reglas de negocio | 39 archivos, 3.164 líneas, **7 entidades**, **7 value objects** |
| **Aplicación** | Casos de uso y `PoliticaDeAcceso` | **24 casos de uso** |
| **Puertos** | Interfaces que el centro define | **7** en `application/ports/` + **7** repositorios en el dominio |
| **Adaptadores de entrada** | API HTTP, app móvil, tarea programada | **23 endpoints** |
| **Adaptadores de salida** | PostgreSQL, memoria, bcrypt, JWT, Expo, correo | **10 adaptadores** |

Al describirlas, di siempre **qué decide cada una**:

- **El dominio decide** si una toma se puede confirmar, si una adherencia es baja, si un
  código de recuperación caducó.
- **La aplicación orquesta**: pide la entidad al repositorio, le manda hacer algo, la guarda.
  No decide reglas.
- **Los adaptadores traducen**: de JSON a objetos, de objetos a filas de una tabla. No
  deciden nada.

---

## 3. La regla de dependencia — el corazón del asunto

Esta es la pregunta que separa una respuesta memorizada de una entendida.

**Todas las flechas apuntan hacia adentro.** El dominio no conoce a nadie; la aplicación
conoce al dominio; los adaptadores conocen a la aplicación y al dominio. **Nunca al revés.**

Y aquí está la prueba, que puedes ofrecer que ejecuten:

```bash
grep -rn "^import" backend/src/domain/ | grep -v "from '\./" | grep -v "from '\.\./"
```

**Devuelve cero líneas.** En 39 archivos y 3.164 líneas de dominio no hay ni un solo
`import` de una librería externa. Compáralo con la capa de infraestructura, que importa
`express`, `pg`, `bcryptjs`, `jsonwebtoken`, `zod`, `cors`.

**Por qué importa, dicho sin jerga:** si mañana cambiamos PostgreSQL por otra base de datos,
o Express por otro framework, las reglas de qué es una toma cumplida **no se tocan**. Y al
revés: cuando cambiamos una regla clínica, no hay riesgo de romper la base de datos.

### La inversión de dependencias, explicada sin el nombre

Lo normal sería que el caso de uso «guardar un paciente» dependiera de PostgreSQL. Aquí es
al revés: **el dominio declara la interfaz `RepositorioDePacientes`** —qué operaciones
necesita— y PostgreSQL viene después a cumplirla. El que manda es el centro, no la
herramienta.

Si preguntan por el nombre técnico: es el **principio de inversión de dependencias**, la D
de SOLID.

---

## 4. Puertos y adaptadores

Un **puerto** es una interfaz de TypeScript: dice *qué* hace falta, no *cómo*. Un
**adaptador** es una clase que la cumple.

| Puerto | Adaptadores que lo cumplen |
|---|---|
| Repositorios (7) | `…Postgres` y `…EnMemoria` |
| `CifradorDeContrasenas` | `CifradorBcrypt` |
| `ServicioDeTokens` | `ServicioDeTokensJwt` |
| `Reloj` | `RelojDelSistema` · `RelojFijo` (pruebas) |
| `GeneradorDeIds` | `GeneradorDeIdsUuid` · `GeneradorDeIdsSecuencial` (pruebas) |
| `Notificador` | `NotificadorExpoPush` · `NotificadorEnConsola` · `NotificadorCompuesto` |
| `EnviadorDeCorreo` | `CorreoResendHttp` · `CorreoEnConsola` |
| `GeneradorDeCodigos` | `GeneradorDeCodigosSeguro` · `GeneradorDeCodigosFijo` |

### Un detalle que impresiona, y que es cierto

**Los repositorios los declara el dominio; los otros seis puertos los declara la aplicación.**
No es un descuido: es una distinción con sentido.

- Guardar y recuperar un paciente es una necesidad **de la propia entidad** — el dominio no
  sabría existir sin poder persistirse.
- Mandar un correo o firmar un token son necesidades **del caso de uso**, no de la entidad.

La carpeta donde vive cada interfaz dice a quién le hace falta. Si te preguntan «¿por qué
unos están en `domain/` y otros en `application/ports/`?», esa es la respuesta.

### El composition root

**Hay un único archivo en todo el backend que sabe qué implementación concreta se conecta a
cada puerto: `contenedor.ts`.** Ahí, y solo ahí, se sabe que la persistencia es PostgreSQL,
que el cifrado es bcrypt y que los tokens son JWT.

Se llama **raíz de composición** (*composition root*), y es lo que hace que cambiar de base
de datos sea cambiar tres líneas de un archivo en lugar de buscar por todo el proyecto.

---

## 5. Las cinco pruebas que puedes ofrecer que ejecuten

Un jurado valora más una afirmación comprobable que una bien redactada. Estas cinco se
pueden correr delante de ellos.

### Prueba 1 — La aplicación corre sin base de datos

```bash
PERSISTENCE=memory npm run dev
```

Arranca entera. Registro, medicamentos, agenda, adherencia, cuidadores: todo funciona contra
repositorios en memoria. **Ni una línea del dominio ni de los casos de uso cambia.**

*Por qué es la prueba más fuerte:* si el dominio dependiera de PostgreSQL, esto sería
imposible. Que funcione demuestra que la dependencia va donde decimos que va.

### Prueba 2 — Cero dependencias externas en el dominio

```bash
grep -rn "^import" backend/src/domain/ | grep -v "from '\./" | grep -v "from '\.\./"
```

Cero resultados, sobre 39 archivos.

### Prueba 3 — 185 pruebas en menos de seis segundos

```bash
cd backend && npm test
```

Sin base de datos, sin servidor, sin red. **Esa velocidad es consecuencia de la
arquitectura, no de una optimización**: como el dominio no depende de nada, no hay nada que
levantar para probarlo.

### Prueba 4 — El mismo resultado bajo seis husos horarios

```bash
TZ=Pacific/Kiritimati npm test    # UTC+14
TZ=America/Bogota     npm test    # UTC−5
TZ=America/Anchorage  npm test    # UTC−9
```

185 pruebas en verde en los tres. Ver la sección 7, que es donde está la mejor historia
técnica del proyecto.

### Prueba 5 — Dos adaptadores cumpliendo el mismo puerto

`RepositorioDePacientesPostgres` y `RepositorioDePacientesEnMemoria` implementan la misma
interfaz. El caso de uso no distingue cuál está usando, y no puede: solo ve el puerto.

---

## 6. Los patrones de diseño que puedes nombrar

Nómbralos solo si estás seguro, y siempre acompañados de **dónde están y qué resuelven**.

| Patrón | Dónde | Qué resuelve |
|---|---|---|
| **Puertos y adaptadores** | Toda la arquitectura | Aislar las reglas de las herramientas |
| **Inversión de dependencias** (D de SOLID) | El dominio declara `RepositorioDe…` | Que mande el centro, no la base de datos |
| **Repositorio** | Los 7 `RepositorioDe…` | Guardar y recuperar entidades sin saber cómo |
| **Value Object** | `Email`, `Hora`, `FechaLocal`, `ZonaHoraria`, `Identificador`, `Telefono`, `AutorizacionDeDatos` | Que un dato inválido no pueda ni construirse |
| **Composite** | `NotificadorCompuesto` | Repartir un aviso entre varios destinos, cumpliendo la misma interfaz que sus partes |
| **Máquina de estados** | `Toma`: `PENDIENTE → TOMADA \| OMITIDA \| POSPUESTA` | Que no existan transiciones imposibles |
| **Composition root** | `contenedor.ts` | Un único lugar que decide qué se conecta a qué |

### Los value objects, si preguntan

Un `Email` no es un `string`: es una clase que **no se puede construir con un valor
inválido**. `Email.desde("no-es-un-correo")` lanza un error.

La consecuencia es fuerte: si una función recibe un `Email`, **no necesita validarlo**. Ya
es válido por construcción. Las validaciones dejan de estar repartidas por todo el código.

`Hora`, `FechaLocal` y `ZonaHoraria` son los que hacen posible la historia de la sección 7.

---

## 7. La mejor historia técnica del proyecto: las zonas horarias

Si tienes que elegir **un** detalle técnico para contar, que sea este. Muestra un problema
real, un diagnóstico y una corrección conceptual.

**El problema:** el dominio usaba objetos `Date` para representar días del calendario. Y un
`Date` no es un día: es un **instante**, que se lee distinto según la zona del proceso.

**La consecuencia:** con el servidor en UTC, la pastilla de las 08:00 de una paciente
colombiana se agendaba a las **03:00 de su madrugada**.

**La corrección no fue un parche**, y esto es lo que conviene subrayar: fue separar dos ideas
que estaban mezcladas.

- **`FechaLocal`** es un día del calendario: «2026-09-05». No tiene hora ni zona.
- **`Hora`** es una hora de pared: «08:00». No tiene día.
- **`ZonaHoraria`** es lo que convierte un día + una hora en un **instante**.

Todo el razonamiento de calendario ocurre **en la zona del paciente**, y solo al final se
traduce a instantes para guardar. Por eso «las 8 de la mañana» son las 8 donde vive la
paciente, no donde esté el servidor.

**Y por eso la zona horaria se guarda como nombre IANA (`America/Bogota`) y no como un
desfase fijo (`-05:00`):** el desfase cambia con el horario de verano. Colombia no lo tiene,
pero un desfase fijo sería una decisión que se rompe en cuanto la app cruce una frontera.

La prueba de que quedó bien resuelto es la Prueba 4: **la suite completa da el mismo
resultado bajo seis husos, de Kiritimati (UTC+14) a Anchorage (UTC−9)**.

---

## 8. Preguntas difíciles, con respuestas

### «¿No es demasiada arquitectura para un proyecto de universidad?»

Es una crítica legítima y conviene reconocerla antes de responder.

> Sí, para una aplicación de tres pantallas sería exagerado. Aquí se justifica por dos cosas
> concretas. La primera es que las reglas clínicas son el aporte del proyecto, no un
> accesorio: si estuvieran mezcladas con SQL y con Express, no se podrían leer ni discutir.
> La segunda es que **ya nos pagó**: las 185 pruebas corren en seis segundos porque no hay
> que levantar nada, y eso cambió cómo trabajamos — probar una regla cuesta segundos, no
> minutos.

### «¿Dónde está esta regla en el código?»

La tabla de trazabilidad del documento de requerimientos conecta cada RF con su archivo y su
prueba. Y el nombre de la carpeta suele bastar: todo está en español y con el mismo
vocabulario que los documentos — `Paciente`, `Cuidador`, `Toma`, `Vínculo`,
`SolicitudDeRecuperacion`.

### «¿Cómo garantizan que un cuidador no vea lo que no debe?»

> Hay **un único punto de control**: `PoliticaDeAcceso`. Todos los casos de uso que tocan
> datos de un paciente pasan por él, indicando qué permiso concreto necesitan.
>
> Y sé que funciona porque **encontramos el caso en que no se cumplía**: `ListarPacientesDelCuidador`
> era el único que leía datos clínicos sin pasar por ahí, y al retirar el permiso seguía
> mostrando la adherencia. Está corregido y hay cuatro pruebas que lo fijan.

Reconocer un defecto encontrado y corregido es más fuerte que afirmar perfección. Un jurado
que sospecha que no revisaste, pregunta más.

### «¿Cómo saben que funciona?»

185 pruebas automatizadas, en menos de seis segundos, sin base de datos ni servidor, bajo
seis husos horarios. Veinte de ellas levantan el servidor HTTP real, porque hay defectos que
solo se ven haciendo la petición.

### «¿Por qué TypeScript y no Java o Python?»

> Porque el mismo lenguaje sirve para el servidor y para la aplicación móvil, y eso permitió
> **compartir el vocabulario del dominio entre las dos** sin traducciones. Y porque su
> sistema de tipos permite cosas como que `Paciente.registrar()` no compile si falta la
> autorización de tratamiento de datos: la regla la impone el compilador, no la memoria.

### «¿Qué harían distinto?»

Prepara una respuesta honesta; es una pregunta de madurez, no una trampa.

> La tarea que cierra las tomas vencidas está dentro del servidor web, como un temporizador.
> En un despliegue con varias instancias se ejecutaría varias veces en paralelo. Debería ser
> un trabajo aparte. Está documentado como tal en el propio código.
>
> Y las pruebas de la capa HTTP llegaron tarde: las escribimos después de encontrar defectos
> que las otras 165 no podían ver.

---

## 9. Vocabulario: qué decir y qué no

| En vez de… | Di… |
|---|---|
| «usamos hexagonal» | «las reglas del negocio no dependen de la base de datos, y se comprueba corriendo la app sin base de datos» |
| «está bien organizado» | «hay un único punto que decide qué implementación se conecta a cada interfaz: `contenedor.ts`» |
| «tiene muchas pruebas» | «185 pruebas en menos de seis segundos, sin base de datos, iguales bajo seis husos horarios» |
| «es escalable» | *(evítalo si no lo has medido)* «está preparado para cambiar de base de datos sin tocar las reglas» |
| «usamos buenas prácticas» | nombra una: «los value objects impiden construir un correo inválido» |

**Dos trampas que conviene evitar:**

- **No digas «es seguro» a secas.** Di qué está hecho: contraseñas con bcrypt, tokens
  firmados, consultas parametrizadas, un punto único de autorización. Y reconoce lo que
  falta: quedan dos defectos de seguridad abiertos a propósito, que solo importan cuando el
  servidor esté en internet.
- **No inventes un nombre de patrón.** Si no estás seguro de que algo es un *Factory*, no lo
  llames *Factory*. Describe lo que hace.

---

## 10. La estructura de carpetas, para señalarla en pantalla

```
backend/src/
├── domain/                 ← las reglas. CERO dependencias externas
│   ├── paciente/           Paciente, PreferenciasDeAccesibilidad, RepositorioDePacientes
│   ├── medicamento/        Medicamento, Dosis, Stock, Frecuencia
│   ├── toma/               Toma, ResumenDeAdherencia
│   ├── vinculo/            Vinculo (y sus permisos)
│   ├── cuidador/           Cuidador
│   ├── dispositivo/        Dispositivo, TokenDeDispositivo
│   ├── recuperacion/       SolicitudDeRecuperacion, CodigoDeRecuperacion
│   └── shared/             Email, Hora, FechaLocal, ZonaHoraria, Identificador…
│
├── application/
│   ├── use-cases/          24 casos de uso, agrupados por tema
│   ├── ports/              7 interfaces: Reloj, Notificador, Cifrador…
│   └── services/           PoliticaDeAcceso — el punto único de control
│
├── infrastructure/         ← aquí SÍ viven express, pg, bcrypt, jwt
│   ├── http/               rutas, DTOs de Zod, middlewares
│   ├── persistence/        postgres/ y in-memory/
│   ├── security/           bcrypt y JWT
│   ├── notificaciones/     Expo Push, consola, compuesto
│   └── correo/             Resend y consola
│
└── contenedor.ts           ← composition root: el único que sabe qué es qué
```

La aplicación móvil repite la misma idea a menor escala: `src/dominio/` (modelos y puertos),
`src/infraestructura/` (el cliente HTTP) y `src/ui/` (pantallas). **El mismo vocabulario en
las dos partes y en los documentos**, para que no haya que traducir nada mentalmente.

---

## 11. Cómo estudiar esto

1. **Aprende de memoria la sección 1.** Es la respuesta a la pregunta más probable.
2. **Entiende la sección 3** —la regla de dependencia— hasta poder explicarla con tus
   palabras. Si entiendes eso, lo demás se deduce.
3. **Ten lista una historia técnica.** La de las zonas horarias (sección 7) es la mejor:
   problema, diagnóstico y corrección conceptual.
4. **Prepara la respuesta a «¿qué harían distinto?»** Es la que más distingue.
5. **Corre las cinco pruebas de la sección 5 antes de la sustentación**, para que los
   números que digas sean los de ese día y no los de este documento.
