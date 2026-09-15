# Qué falta pedirle a la universidad, y por qué

Este documento existe para una sola cosa: que a la reunión con la profesora o con la
oficina de protección de datos lleven una lista corta y concreta, y salgan de ahí con todo
lo que hace falta para publicar los documentos legales.

No es un trámite. Chronova trata **datos de salud**, que la Ley 1581 de 2012 clasifica como
sensibles, y hasta que esta lista no esté cerrada la aplicación no puede usarse con
información de personas reales.

---

## Lo que ya está resuelto y no hay que preguntar

Esto se encontró en fuentes oficiales y ya está escrito en los documentos. Conviene llevarlo
para que la conversación empiece un paso más adelante:

| Dato | Valor | De dónde salió |
|---|---|---|
| Razón social | Universidad Católica Luis Amigó | Política institucional publicada |
| NIT | 890.985.189-9 | Política institucional publicada |
| Dirección y domicilio | Transversal 51A #67B 90, Medellín | Política institucional publicada |
| Teléfono | +57 (604) 448 7666 | Política institucional publicada |
| Correo para derechos | protecciondedatos@amigo.edu.co | Política institucional publicada |
| Norma que adopta la política institucional | Resolución No. 18 de 2023 | Política institucional publicada |
| Quiénes figuran como Responsables | La universidad **y los dos desarrolladores** | Lo que la institución les confirmó, compatible con la Guía de la SIC |
| Canal de contacto de los tres | protecciondedatos@amigo.edu.co · +57 (604) 448 7666 | Decisión del equipo, **pendiente de que la universidad la acepte** |

**El "formato en específico" del que les hablaron tiene dos capas, y las dos están
cubiertas:**

1. **La que exige la ley.** El artículo 2.2.2.25.3.1 del Decreto 1074 de 2015 fija el
   contenido mínimo de toda política de tratamiento: seis puntos. No impone plantilla ni
   diseño, impone contenido. La política de Chronova ya está reordenada numeral por numeral
   y lleva una tabla al comienzo que muestra la correspondencia.
2. **La de la universidad.** La institución tiene su propia política (Resolución 18 de 2023)
   y publica tres formatos propios: el de finalidades, el de acceso a derechos y el
   procedimiento de acceso del titular. La política de Chronova los referencia y declara que
   en caso de contradicción **prevalece la institucional**.

---

## Lo que sí hay que pedir

### 1. El acto formal por el que la universidad asume esta base de datos

**Qué pedir:** constancia de que la universidad acepta figurar como Responsable del
Tratamiento de la base de datos de Chronova, junto a los dos desarrolladores, y bajo qué
figura (aprobación del proyecto, inclusión en el inventario institucional de bases de datos,
aval del comité que corresponda).

**Por qué:** que los datos de la universidad estén publicados no significa que la
universidad haya asumido *esta* base de datos. Nombrarla como Responsable sin ese acto sería
atribuirle una obligación que no ha aceptado. Es la diferencia entre citar un dato público y
comprometer a un tercero.

### 2. Que acepten ser el canal de contacto de los tres

**Qué preguntar:** *«Los tres figuramos como Responsables, pero publicar un solo correo de
contacto le evita al usuario tener que adivinar a cuál escribirle. ¿Podemos publicar
protecciondedatos@amigo.edu.co y el teléfono de la universidad como canal común?»*

**Por qué:** ese buzón es de ellos. Publicarlo como punto de contacto de los tres les mete
trabajo en la bandeja, así que no es una decisión que el equipo pueda tomar por su cuenta.
Si dicen que no, hace falta crear un correo del proyecto y publicarlo junto al de la
universidad.

### 3. Cómo se reparten las peticiones entre los tres

**Qué acordar:** *«Cuando llegue una petición, ¿nos la trasladan el mismo día para
ejecutarla en la base de datos? Necesitamos un plazo interno, porque los 10 y 15 días
hábiles corren desde que la petición llega, no desde que llega a quien puede resolverla.»*

**Por qué:** quien recibe la petición es la oficina; quien puede corregir o borrar un dato
en el sistema es el equipo. Con tres responsables, el riesgo no es que nadie responda, es
que cada uno suponga que respondió otro. Conviene dejarlo por escrito, aunque sea en un
correo.

### 4. Si hay que registrar la base de datos en el RNBD

**Qué preguntar:** *«¿La universidad incluye esta base de datos en su registro ante el RNBD,
o queda fuera por ser un proyecto académico?»*

**Por qué:** la obligación de registrar bases de datos en el Registro Nacional de Bases de
Datos recae sobre personas jurídicas y entidades públicas, no sobre personas naturales. Que
ustedes dos sean Responsables no les crea esa obligación, porque son personas naturales;
pero la universidad sí es persona jurídica, así que en su lado la pregunta es real. No es
una decisión del equipo, pero sí algo que el equipo tiene que preguntar.

### 5. Los datos que faltan porque todavía no existen

Estos no dependen de la universidad sino de decisiones del proyecto, pero conviene llevarlos
a la reunión porque afectan al documento:

| Hueco | Se resuelve cuando |
|---|---|
| Proveedor de alojamiento y país de sus servidores | Se contrate el hosting con HTTPS (§1 del plan de trabajo) |
| Proveedor de correo para el código de recuperación | Se decida cuál se usa |
| Fecha de entrada en vigencia de la política | Se publique, después de la revisión jurídica |
| URL pública de la política y de los términos | Exista el sitio donde se publiquen. Dentro de la app ya se leen completas, sin depender de eso |

### 6. La revisión jurídica

**Qué pedir:** que la oficina de protección de datos revise los tres documentos antes de
publicarlos.

**Por qué:** los redactó una herramienta de IA a partir de la norma y del código real de la
aplicación. Describen con exactitud lo que Chronova hace, pero **no son asesoría jurídica**.
Tratándose de datos de salud, esa revisión no es opcional.

---

## Qué pasa con quien ya aceptó la versión 1.0

Cambió quién figura como Responsable. Eso no es un retoque de redacción: cambia a quién le
otorgó la autorización el titular. Por eso la política subió de **1.0 a 2.0**, y la
aplicación detecta sola que la versión guardada junto a una cuenta es anterior a la vigente
y le pide a esa persona que vuelva a autorizar.

En la práctica hoy no afecta a nadie, porque todavía no hay usuarios reales. Que el
mecanismo funcione antes de que los haya es justamente el punto.

---

## Fuentes

- [Política de tratamiento de datos personales de la Universidad Católica Luis Amigó](https://www.funlam.edu.co/modules/generalinternet/item.php?itemid=521)
  (Resolución No. 18 de 2023)
- [Guía sobre el tratamiento de datos personales en el contexto universitario, SIC (2026)](https://www.universidad.edu.co/wp-content/uploads/2026/08/Guia_Datos_personalesenIES.pdf)
- [Ley 1581 de 2012](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981)
- Decreto 1074 de 2015, artículos 2.2.2.25.3.1, 2.2.2.25.3.2 y 2.2.2.25.5.2
