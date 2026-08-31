# Diagramas UML de Chronova

Ocho diagramas generados **a partir del código real**, no de un boceto previo. Cada nombre de clase, método, columna y estado que aparece en ellos existe en el proyecto: se verificó comparando los diagramas contra `backend/src/`.

Eso importa para la sustentación. Si el profesor pregunta «¿dónde está esto en el código?», la respuesta siempre existe.

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

Las cinco entidades, sus value objects, el servicio de dominio `ResumenDeAdherencia` y las enumeraciones.

Cómo leer las relaciones:

- **Composición** (rombo relleno): `Medicamento` contiene su `Dosis`, su `Stock` y su `Frecuencia`. Si el medicamento desaparece, esos objetos desaparecen con él porque no tienen sentido solos.
- **Agregación** (rombo vacío): `Paciente` agrega `Medicamento`. El medicamento tiene identidad propia y su propio ciclo de vida.

Los métodos en **negrita** son los que concentran las reglas más importantes: `horariosDelDia()`, `aplicaEn()`, `necesitaReabastecimiento`, `confirmar()`, `autorizar()`.

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

Las cinco tablas con sus tipos, claves y restricciones, en notación pata de gallo.

Las notas documentan las decisiones de diseño que conviene poder justificar: por qué `horarios` es un arreglo, por qué la dosis se guarda separada en cantidad y unidad, y qué hace la restricción `UNIQUE (medicamento_id, programada_originalmente_para)`.

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
plantuml -tpng fuentes/*.puml
plantuml -tsvg fuentes/*.puml
```

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
| 03 Clases del dominio | 2133 × 1228 | Horizontal, página completa |
| 04 Estados de la Toma | 1618 × 657 | Horizontal, apaisado |
| 05 Secuencia — Confirmar toma | 1932 × 1486 | Página completa |
| 06 Secuencia — Agenda del día | 1654 × 1085 | Horizontal |
| 07 Componentes | 1569 × 1112 | Horizontal |
| 08 Entidad-relación | 1276 × 1127 | Vertical u horizontal |
