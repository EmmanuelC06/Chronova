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

### Corregido

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
