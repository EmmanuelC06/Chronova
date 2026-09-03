# Diagramas UML de Chronova

Ocho diagramas generados **a partir del código real**, no de un boceto previo. Cada nombre de clase, método, columna y estado que aparece en ellos existe en el proyecto: se verificó comparando los diagramas contra `backend/src/`.

Eso importa para la sustentación. Si el profesor pregunta «¿dónde está esto en el código?», la respuesta siempre existe.

> **Última verificación contra el código: 3 de septiembre de 2026.** Los diagramas 03 y 08 se rehicieron ese día para incorporar `Dispositivo` y `SolicitudDeRecuperacion`, que se habían añadido al dominio después de dibujarlos. Esa desincronización es el riesgo real de esta carpeta: un diagrama desactualizado es peor que ninguno, porque se defiende con la misma confianza. Al añadir una entidad o una tabla, actualizar aquí en el mismo commit.

---

## Los archivos

Cada diagrama viene en tres formatos:

| Formato | Para qué |
|---|---|
| `.png` | Pegar directamente en el documento de Word |
| `.svg` | Imprimir o proyectar sin que se pixele |
| `fuentes/*.puml` | Editar el diagrama cuando el proyecto cambie |

---

## Qué muestra cada uno

### 01 · Casos de uso — Paciente
`01-casos-de-uso-paciente.png`

Los 17 casos de uso del actor principal, agrupados en cuatro bloques: acceso y configuración, gestión del tratamiento, seguimiento diario y control de acompañamiento.

Va separado del diagrama del cuidador a propósito. Un solo diagrama con los dos actores y 25 casos de uso resultaba ilegible: las líneas se cruzaban por toda la hoja. Dividirlo por actor es una práctica aceptada y aquí además refleja algo cierto del sistema — paciente y cuidador usan aplicaciones muy distintas dentro de la misma app.

### 02 · Casos de uso — Cuidador y Sistema
`02-casos-de-uso-cuidador.png`

El cuidador y el actor «Sistema», que representa la tarea programada del servidor.

Dos detalles que conviene poder explicar:

- `Solicitar acceso a un paciente` tiene una dependencia hacia el actor Paciente: el acceso no existe hasta que el paciente lo aprueba.
- `Cerrar tomas sin respuesta` incluye `Notificar al cuidador`. Es la relación `<<include>>` porque el aviso ocurre siempre que hay tomas cerradas, no es opcional.

### 03 · Diagrama de clases del dominio
`03-clases-dominio.png`

Las siete entidades, sus value objects, el servicio de dominio `ResumenDeAdherencia` y las enumeraciones.

Cómo leer las relaciones:

- **Composición** (rombo relleno): `Medicamento` contiene su `Dosis`, su `Stock` y su `Frecuencia`. Si el medicamento desaparece, esos objetos desaparecen con él porque no tienen sentido solos.
- **Agregación** (rombo vacío): `Paciente` agrega `Medicamento`. El medicamento tiene identidad propia y su propio ciclo de vida.

Los métodos en **negrita** son los que concentran las reglas más importantes: `horariosDelDia()`, `aplicaEn()`, `necesitaReabastecimiento`, `confirmar()`, `autorizar()`, `motivoParaRechazar()`.

Dos entidades merecen explicación aparte porque no son clínicas:

- **`Dispositivo`** es un teléfono concreto, no una persona. Por eso tanto `Paciente` como `Cuidador` apuntan a él, y por eso `reasignarA()` existe: si la hija instala la app en el teléfono viejo de su madre, el token es el mismo y la fila cambia de dueño en vez de duplicarse.
- **`SolicitudDeRecuperacion`** guarda las tres reglas que hacen segura una contraseña olvidada — caduca a los 30 minutos, se usa una sola vez y admite cinco intentos. Están en la entidad y no en el servidor web ni en la base de datos, que es exactamente el argumento de la arquitectura.

Una nota sobre el dibujo: la fuente lleva `left to right direction`, que hace que las relaciones fluyan de izquierda a derecha y, como efecto, que la imagen salga **alta y estrecha** en vez de ancha. Con cinco entidades la disposición por defecto funcionaba; con siete producía una franja de 4400 × 1240 px que no cabe legible en ninguna página. Ojo con eso: PlantUML recorta a 4096 px **sin avisar**, así que la versión ancha llegó a perder media nota sin dar ningún error.

### 04 · Diagrama de estados de la Toma
`04-estados-toma.png`

El ciclo de vida de una toma: `PENDIENTE → TOMADA | OMITIDA | POSPUESTA`.

Probablemente el diagrama más útil para explicar el aporte del proyecto. Muestra que existe una transición automática `PENDIENTE → OMITIDA` disparada por el sistema cuando vence el margen de gracia. Ahí está la diferencia con el MVP anterior: **el olvido queda registrado aunque el paciente no haga nada.** Sin ese estado no habría forma de medir adherencia real.

### 05 · Secuencia — Confirmar una toma
`05-secuencia-confirmar-toma.png`

El recorrido completo desde que el paciente toca «Ya la tomé» hasta que la app se actualiza, con las capas separadas en cajas.

Sirve para demostrar la arquitectura en movimiento: se ve cómo el adaptador HTTP solo valida forma, cómo el caso de uso orquesta, y cómo las decisiones reales las toman las entidades del dominio. Incluye los dos caminos de error (sin permiso, toma ya registrada) y el descuento de inventario.

### 06 · Secuencia — Generar la agenda del día
`06-secuencia-agenda-del-dia.png`

Cómo un patrón («una pastilla a las 8:00 todos los días») se convierte en tomas concretas que el paciente puede confirmar.

Documenta también la resolución del problema de concurrencia: qué pasa cuando dos peticiones piden la agenda del mismo día a la vez. Es un buen ejemplo para mostrar que el sistema se probó bajo condiciones reales.

### 07 · Componentes — Arquitectura hexagonal
`07-componentes-hexagonal.png`

Las cinco capas y cómo se conectan mediante puertos e interfaces.

Es el diagrama que responde «¿por qué hexagonal?». Se ve que hay **dos adaptadores distintos cumpliendo el mismo puerto de repositorios** (PostgreSQL y en memoria), y que la aplicación funciona con cualquiera de los dos sin cambiar una línea del dominio.

### 08 · Modelo entidad-relación
`08-entidad-relacion.png`

Las siete tablas con sus tipos, claves y restricciones, en notación pata de gallo.

Las notas documentan las decisiones de diseño que conviene poder justificar: por qué `horarios` es un arreglo, por qué la dosis se guarda separada en cantidad y unidad, y qué hace la restricción `UNIQUE (medicamento_id, programada_originalmente_para)`.

**Atención a las líneas punteadas de `dispositivos` y `recuperaciones`: no son claves foráneas.** Ambas tablas tienen una columna que apunta a `pacientes` *o* a `cuidadores` según otra columna, y PostgreSQL no admite una foránea con dos destinos posibles. Es un compromiso consciente: se pierde la integridad referencial de esas dos columnas —la cuida la aplicación— y a cambio no hacen falta cuatro tablas casi idénticas. Conviene tenerlo preparado, porque es justo el tipo de cosa que un jurado pregunta.

---

## Cómo regenerarlos si el código cambia

Los diagramas están escritos en [PlantUML](https://plantuml.com), que es texto plano. Eso permite versionarlos en Git y ver en un `diff` qué cambió, cosa imposible con una imagen hecha a mano.

**La forma más simple, sin instalar nada:** entra a [plantuml.com/plantuml](https://www.plantuml.com/plantuml/uml/), pega el contenido de cualquier archivo `.puml` y descarga la imagen.

**En tu computador:**

```bash
# Windows con Chocolatey
choco install plantuml

# Mac
brew install plantuml

# Linux
sudo apt install plantuml
```

Y luego, desde `docs/diagramas/`:

```bash
plantuml -DPLANTUML_LIMIT_SIZE=16384 -tpng -o .. fuentes/*.puml
plantuml -DPLANTUML_LIMIT_SIZE=16384 -tsvg -o .. fuentes/*.puml
```

Dos detalles del comando que ahorran un rato de confusión:

- **`-o ..`** manda las imágenes a `docs/diagramas/` en vez de dejarlas dentro de `fuentes/`.
- **`PLANTUML_LIMIT_SIZE`** sube el límite de 4096 px que PlantUML aplica por defecto. Al superarlo no falla: recorta la imagen en silencio, y lo normal es descubrirlo cuando falta media nota en el documento ya entregado.

Y una convención que conviene respetar: la primera línea de cada `.puml` dice `@startuml 03-clases-dominio`, con el **mismo nombre del archivo**. PlantUML usa ese nombre —no el del archivo— para la imagen que genera. Si no coinciden, el comando parece funcionar pero deja un archivo nuevo al lado del viejo y uno sigue mirando la versión antigua sin enterarse.

**En VS Code:** la extensión *PlantUML* de jebbs muestra una vista previa mientras editas (`Alt + D`).

---

## Para pegarlos en el documento de Word

Los PNG están generados a buena resolución. En Word conviene insertarlos con *Insertar → Imagen → Este dispositivo* y no arrastrarlos, para que no pierdan calidad.

Si alguno se ve pequeño al imprimir, usa el `.svg`: Word lo escala sin pixelarse.

Tamaños aproximados, por si necesitas planear la maquetación:

| Diagrama | Proporción | Orientación sugerida |
|---|---|---|
| 01 Casos de uso — Paciente | 904 × 1350 | Vertical |
| 02 Casos de uso — Cuidador | 1266 × 825 | Horizontal |
| 03 Clases del dominio | 1560 × 2716 | Vertical, página completa |
| 04 Estados de la Toma | 1618 × 657 | Horizontal, apaisado |
| 05 Secuencia — Confirmar toma | 1932 × 1486 | Página completa |
| 06 Secuencia — Agenda del día | 1654 × 1085 | Horizontal |
| 07 Componentes | 1569 × 1112 | Horizontal |
| 08 Entidad-relación | 2612 × 1218 | Horizontal, página completa |
