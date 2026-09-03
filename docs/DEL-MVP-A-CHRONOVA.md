# De MedAlerta a Chronova

Qué cambió respecto al prototipo anterior y por qué. Sirve como justificación técnica del rediseño para la documentación del proyecto.

MedAlerta cumplió su función: demostró que la idea era viable y sirvió para entender el problema. Este documento no es una crítica al prototipo, sino el registro de lo que se aprendió construyéndolo.

---

## Resumen

| | MedAlerta (MVP) | Chronova |
|---|---|---|
| Organización | Lógica dentro de las rutas de Express | Tres capas: dominio, aplicación, infraestructura |
| Lenguaje | JavaScript | TypeScript en modo estricto |
| Servidor | Un `server.js` de 710 líneas | 88 archivos con una responsabilidad cada uno |
| Consultas SQL | Repartidas por todo el servidor | Concentradas en una sola carpeta |
| Pruebas | 15 scripts manuales de `curl` | 143 pruebas automáticas en < 2 s |
| Correr sin base de datos | Imposible | `PERSISTENCE=memory` |
| Adherencia | Log suelto sin estado | Entidad `Toma` con ciclo de vida y puntualidad |
| Consentimiento | El cuidador se agregaba pacientes solo | El paciente aprueba y puede revocar |
| Accesibilidad | Estilos fijos | Preferencias del paciente, guardadas en el servidor |
| Horarios | Hora del servidor | Zona horaria de cada paciente |
| Avisos al cuidador | No existían | Notificación push, con baja de dispositivos muertos |

---

## 1. El problema de fondo: la lógica vivía en las rutas

En MedAlerta, una regla de negocio como "descontar stock al registrar una dosis" estaba escrita dentro del manejador HTTP, mezclada con la consulta SQL y con el `res.json()`.

Eso trae tres consecuencias, todas verificables en el repositorio anterior:

**No se puede probar sin levantar todo.** Para comprobar que el descuento funciona hacía falta un servidor corriendo, una base de datos con datos y una petición HTTP real. Por eso las "pruebas" del MVP eran quince scripts que llamaban a `curl` y había que revisar a ojo.

**La misma regla se repite.** Al no tener un único sitio donde vive, la validación de un horario aparecía en la pantalla y otra vez en el servidor, con criterios ligeramente distintos.

**Cambiar de base de datos es reescribir la aplicación.** El documento del entregable menciona MySQL o MongoDB; el MVP quedó atado a PostgreSQL en cada línea.

En Chronova, esa misma regla vive en `Stock.descontar()`, tiene su propia prueba de tres líneas y funciona igual con PostgreSQL o con un arreglo en memoria.

---

## 2. La adherencia ahora se puede medir de verdad

Este es el cambio de mayor impacto para los objetivos del proyecto.

**Antes:** existía una tabla `dosis_log` donde se insertaba una fila cuando el paciente pulsaba un botón, con estado `atendida` o `no_atendida`.

El problema: si el paciente **no pulsaba nada**, no se insertaba nada. Y una toma olvidada es exactamente el evento que el proyecto quiere detectar. El olvido —el fenómeno central de la investigación— era invisible para el sistema.

**Ahora:** la agenda del día crea una entidad `Toma` por cada horario programado, en estado `PENDIENTE`, exista o no interacción del paciente. Cada toma recorre un ciclo de vida:

```
PENDIENTE ──confirmar()──▶ TOMADA
    │  │
    │  └──posponer()────▶ POSPUESTA ──confirmar()──▶ TOMADA
    │
    └──omitir()──────────▶ OMITIDA
```

Y una tarea automática cierra cada 15 minutos las que nadie respondió, marcándolas como omitidas con origen `SISTEMA`.

Consecuencias:

- La adherencia se calcula sobre una base real: `tomadas ÷ (tomadas + omitidas)`.
- Se distingue quién registró cada evento: el paciente, el cuidador o el sistema.
- Se mide la puntualidad, no solo el cumplimiento. Tomarse la pastilla de las 8:00 a las 14:00 cuenta como tomada, pero `CON_RETRASO`, que clínicamente no es lo mismo.
- Los cuidadores reciben aviso cuando una toma se pierde, sin depender de que el paciente haga nada.

Un detalle que se cuidó: la puntualidad se mide contra la hora **original** de la agenda, no contra la hora corrida por los aplazamientos. De lo contrario, posponer tres veces haría que toda toma apareciera puntual y la métrica perdería su valor.

---

## 3. El consentimiento del paciente

**Antes:** el endpoint `POST /api/cuidadores/pacientes` permitía a un cuidador autenticado agregarse a cualquier paciente por su id. Sin aprobación de nadie.

Son datos de salud. En un despliegue real eso es un problema legal, no solo de diseño.

**Ahora** existe la entidad `Vinculo`:

- Si el cuidador solicita, el vínculo nace `PENDIENTE` y el paciente decide.
- Si el paciente invita, nace `ACEPTADO`, porque el consentimiento ya lo está dando el dueño de los datos.
- El paciente puede revocar en cualquier momento, y el acceso se corta de inmediato.
- Los permisos son granulares: ver historial, recibir alertas, registrar tomas, gestionar medicamentos. Una hija puede querer ver el seguimiento sin poder cambiar el tratamiento que formuló el médico.

Toda comprobación pasa por un único punto (`PoliticaDeAcceso`), para que no se pueda olvidar en un endpoint. Así es como se filtran los datos de salud en la práctica: no por un ataque, sino por un `if` que faltaba en una ruta.

---

## 4. Seguridad

| Aspecto | MedAlerta | Chronova |
|---|---|---|
| Contraseñas | Había un endpoint `/api/migrate-passwords` para arreglar hashes | bcrypt desde el registro, sin excepciones |
| Mensajes de login | Distinguían "usuario no existe" de "contraseña incorrecta" | Mensaje idéntico, y siempre se verifica un hash señuelo para que el tiempo de respuesta tampoco delate |
| Sesiones | Tabla de sesiones en base de datos | JWT firmado, con expiración |
| Validación de entrada | Comprobaciones sueltas | Zod en el borde + reglas del dominio |
| Errores no controlados | Podían dejar la petición colgada | Envoltura `asincrono()` y manejador central |

Sobre el último punto: Express 4 no captura las promesas rechazadas dentro de un `async` handler. Si la base de datos fallaba, la petición se quedaba abierta hasta el timeout y el cliente nunca recibía respuesta. Es un fallo silencioso y difícil de diagnosticar. La función `asincrono()` engancha el `.catch()` al manejador central de errores.

---

## 5. Modelo de datos

**Nombres.** El MVP usaba `"idPaciente"`, `"NomCuidador"`, `"Contrasenia"` — con mayúsculas, lo que en PostgreSQL obliga a poner comillas en cada consulta y es fuente constante de errores. Chronova usa `snake_case` en minúsculas: `paciente_id`, `nombre`, `contrasena_cifrada`.

**La dosis era texto libre.** `dosis VARCHAR(100)` guardaba cosas como "1 pastilla en la mañana". Imposible calcular consumo de inventario a partir de eso. Ahora son dos campos: cantidad y unidad, con una regla que sabe que "2 tabletas" descuenta 2 del frasco pero "500 mg" descuenta 1.

**El horario era uno solo.** `horario TIME NOT NULL`: un medicamento, una hora. Un paciente con Metformina tres veces al día tenía que crear tres medicamentos idénticos. Ahora `horarios TEXT[]` guarda todos los del mismo tratamiento.

**No había frecuencia.** Todo era diario. Los tratamientos reales incluyen "lunes, miércoles y viernes" o "cada tres días". Ahora la entidad `Frecuencia` lo resuelve y responde en un solo sitio a la pregunta "¿toca hoy?".

**Faltaban restricciones.** Chronova agrega `CHECK` en los estados, `UNIQUE (medicamento_id, programada_originalmente_para)` para que la agenda no se duplique aunque dos peticiones lleguen a la vez, e índices parciales para las consultas frecuentes.

---

## 6. Accesibilidad como parte del modelo, no del CSS

La revisión de literatura del proyecto (Borghouts et al., 2021; Yildirim y Ayyildiz, 2025) identifica la experiencia de usuario como el principal factor de abandono de las apps de salud entre adultos mayores. Si eso es cierto, la accesibilidad no puede ser una decisión de la hoja de estilos.

En Chronova, las preferencias son parte de la entidad `Paciente` y viven en el servidor:

- Tamaño de letra (normal, grande, muy grande) que escala **toda** la interfaz.
- Alertas sonoras y de vibración, por separado.
- Minutos de gracia antes de dar una toma por perdida: no es lo mismo un anticoagulante estricto que una vitamina.

Al estar en el servidor y no en el teléfono, viajan con el paciente a cualquier dispositivo donde inicie sesión.

En la interfaz, además:

- Texto base de 18 pt, no 14.
- Zonas tocables de 64 px de alto, frente a los 44 px que recomienda la guía estándar.
- Ningún estado se comunica solo con color: siempre color + icono + palabra, para que funcione con daltonismo y con cataratas.
- Acciones explícitas con botones grandes ("Ya la tomé", "En un rato", "No la tomé") en lugar de gestos ocultos como deslizar.
- Etiquetas de accesibilidad en todos los controles, para que TalkBack y VoiceOver puedan leer la app en voz alta.

---

## 7. Qué se conservó

No todo cambió. Del MVP se mantuvo:

- El propósito y los seis módulos del entregable.
- El stack Expo + Node + PostgreSQL, que ya conocen los autores.
- La idea de separar la app del paciente de la del cuidador.
- El vocabulario del proyecto en español (paciente, cuidador, medicamento, toma), ahora usado de forma consistente en el dominio, la base de datos, la API y las pantallas.

Ese último punto tiene más importancia de la que parece: cuando el nombre de una clase, el de una columna y el de la sección del documento académico coinciden, se acaban las traducciones mentales y con ellas una buena parte de los errores.
