# API de Chronova

Base: `http://localhost:4000`

Todas las respuestas son JSON. Salvo el registro y el inicio de sesión, todas las rutas requieren el encabezado:

```
Authorization: Bearer <token>
```

## La sesión: cuándo vale y cuándo deja de valer

Un token bien firmado **no es** por sí solo una sesión válida. En cada petición autenticada el servidor consulta además la cuenta, y rechaza el token si:

- la cuenta está **desactivada**, o
- el token se emitió **antes del último cambio de contraseña** de esa persona.

Lo segundo es lo que hace que recuperar la contraseña sirva de algo: cierra de inmediato todas las sesiones abiertas, incluida la de quien hubiera entrado sin permiso. Ambos casos responden `401` con código `NO_AUTENTICADO`; el mensaje distingue *"esta cuenta ya no está activa"* de *"tu contraseña cambió"*.

### Renovación automática — `X-Sesion-Renovada`

El token dura siete días (`JWT_EXPIRES_IN`). Cuando le quedan **menos de tres**, cualquier respuesta autenticada trae un token de recambio en esta cabecera:

```
X-Sesion-Renovada: eyJhbGciOi...
```

El cliente debe reemplazar el token guardado por ese. No hay ninguna ruta de refresco que llamar: si se ignora la cabecera, la sesión sencillamente caduca a los siete días.

La cabecera está declarada en `Access-Control-Expose-Headers`, sin lo cual un cliente web la recibiría y no podría leerla.

---

## Formato de los errores

Siempre la misma forma:

```json
{
  "error": {
    "codigo": "VALIDACION",
    "mensaje": "La hora \"25:00\" no existe: las horas van de 00 a 23.",
    "campo": "horarios"
  }
}
```

| Código | HTTP | Significa |
|---|---|---|
| `VALIDACION` | 400 | Un dato no cumple el formato esperado |
| `NO_AUTENTICADO` | 401 | Falta el token, expiró o es inválido |
| `NO_AUTORIZADO` | 403 | No tienes permiso sobre ese recurso |
| `NO_ENCONTRADO` | 404 | No existe |
| `CONFLICTO` | 409 | Choca con algo existente (correo repetido) |
| `REGLA_DE_NEGOCIO` | 422 | Una regla del dominio lo impide |
| `SIN_CONEXION` | — | Lo genera el cliente móvil, no el servidor |

El `mensaje` está escrito para mostrarse tal cual a la persona. La app no lo reescribe.

---

## Salud

### `GET /api/salud`

Sin autenticación. Comprueba que el servidor responde.

```json
{ "servicio": "Chronova API", "estado": "ok", "persistencia": "memory" }
```

---

## Autenticación

### `POST /api/auth/registro/paciente`

```json
{
  "nombre": "Rosa Elena Valencia",
  "email": "rosa@correo.com",
  "contrasena": "rosa123456",
  "telefono": "+573001112233",
  "fechaDeNacimiento": "1952-04-18",
  "zonaHoraria": "America/Bogota",
  "preferencias": { "tamanoDeLetra": "MUY_GRANDE", "minutosDeGracia": 90 }
}
```

`telefono`, `fechaDeNacimiento`, `zonaHoraria` y `preferencias` son opcionales.

**`zonaHoraria` merece atención**: es un identificador IANA (`America/Bogota`, `Europe/Madrid`) y es la pieza de la que depende que "las 8 de la mañana" signifique las 8 donde vive el paciente, y no donde está el servidor. La app la toma del propio teléfono. Si no se envía, se usa `America/Bogota`.

**201:**

```json
{
  "token": "eyJhbGciOi...",
  "usuario": { "id": "...", "nombre": "Rosa Elena Valencia", "email": "rosa@correo.com", "tipo": "PACIENTE" }
}
```

### `POST /api/auth/registro/cuidador`

Igual, pero con `rol` opcional (`"Hija"`, `"Enfermera"`) en vez de `fechaDeNacimiento`.

### `POST /api/auth/sesion`

```json
{ "email": "rosa@correo.com", "contrasena": "rosa123456" }
```

`tipo` es opcional (`"PACIENTE"` o `"CUIDADOR"`). Solo hace falta si la misma persona tiene ambas cuentas con el mismo correo.

### `POST /api/auth/recuperacion`

Sin autenticación: quien la usa es justamente quien no puede entrar.

```json
{ "email": "rosa@correo.com" }
```

**200 siempre**, exista o no la cuenta:

```json
{
  "mensaje": "Si ese correo tiene una cuenta en Chronova, te enviamos un codigo para restablecer tu contrasena.",
  "minutosDeVigencia": 30
}
```

Esa respuesta invariable es deliberada. Si distinguiera entre un correo registrado y uno que no lo está, cualquiera podría averiguar quién usa Chronova probando correos — y saber que alguien usa una aplicación de adherencia farmacológica ya dice algo sobre su salud. Es la misma regla que sigue el inicio de sesión.

**El código no viaja en la respuesta.** Sale por correo. Con `CORREO=consola` (el valor por defecto) se imprime en la terminal del servidor, lo que permite probar el flujo completo sin contratar ningún servicio.

### `POST /api/auth/recuperacion/confirmar`

```json
{
  "email": "rosa@correo.com",
  "codigo": "482913",
  "nuevaContrasena": "una-clave-nueva-larga"
}
```

**200:** `{ "restablecida": true }`

Tres reglas lo protegen: el código **caduca a los 30 minutos**, sirve **una sola vez**, y admite **cinco intentos**. Pedir un código nuevo invalida el anterior.

El mensaje de error es el mismo para código equivocado, caducado, ya usado o correo inexistente — distinguirlos ayudaría más a quien prueba códigos ajenos que al dueño legítimo, que tiene el correo delante. La única excepción es agotar los intentos, donde sí conviene decirlo para que la persona sepa que debe pedir uno nuevo.

### `GET /api/auth/perfil`

Devuelve el perfil de quien tiene la sesión abierta, con la edad calculada y las preferencias si es paciente.

### `PATCH /api/auth/preferencias`

Solo pacientes. Solo se envían los campos que cambian:

```json
{ "tamanoDeLetra": "MUY_GRANDE", "alertasSonoras": false }
```

| Campo | Valores |
|---|---|
| `tamanoDeLetra` | `NORMAL` · `GRANDE` · `MUY_GRANDE` |
| `altoContraste` | booleano |
| `alertasSonoras` | booleano |
| `alertasVibracion` | booleano |
| `minutosDeGracia` | entero entre 15 y 720 |

### `POST /api/auth/dispositivos`

Registra este teléfono para recibir notificaciones. La app lo llama después de cada inicio de sesión, porque el token de Expo cambia si el usuario reinstala la aplicación o cambia de teléfono.

```json
{ "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]", "plataforma": "android" }
```

`plataforma`: `android` · `ios` · `web`.

Si el token ya estaba registrado a nombre de otra persona, se reasigna en lugar de duplicarse: el aparato es el mismo y enviarle dos veces produciría avisos repetidos.

### `DELETE /api/auth/dispositivos`

Da de baja el teléfono. La app lo llama al cerrar sesión, para que quien use ese teléfono después no siga viendo avisos sobre la salud de otra persona.

```json
{ "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]" }
```

Responde `{ "olvidado": true }` o `{ "olvidado": false }`. Devuelve lo mismo exista o no el token, para no revelar qué dispositivos están registrados.

---

## Medicamentos

> **Los cuatro devuelven la misma forma.** Crear, listar, actualizar y reabastecer responden con el mismo objeto, incluidos los tres campos derivados `descripcionDeDosis`, `descripcionDeFrecuencia` y `necesitaReabastecimiento`. No siempre fue así: durante un tiempo solo los traía `GET`, y los otros tres devolvían un objeto más pobre sin avisar. El cliente recibía algo al que le faltaban campos que su propio tipo declaraba, y eso solo se nota el día que alguien intenta leerlos.

### `GET /api/medicamentos`

Parámetros opcionales: `pacienteId` (para cuidadores), `incluirSuspendidos=true`.

```json
{
  "medicamentos": [
    {
      "id": "...",
      "nombre": "Losartan",
      "dosis": { "cantidad": 1, "unidad": "tableta" },
      "descripcionDeDosis": "1 tableta",
      "frecuencia": { "tipo": "DIARIA", "diasDeLaSemana": [], "intervaloEnDias": 1 },
      "descripcionDeFrecuencia": "Todos los dias",
      "horarios": ["08:00", "20:00"],
      "stock": { "unidadesDisponibles": 24, "umbralDeAlerta": 6 },
      "necesitaReabastecimiento": false,
      "activo": true
    }
  ]
}
```

### `POST /api/medicamentos`

```json
{
  "nombre": "Losartan",
  "dosis": { "cantidad": 1, "unidad": "tableta" },
  "frecuencia": { "tipo": "DIARIA" },
  "horarios": ["08:00", "20:00"],
  "fechaInicio": "2026-08-31",
  "instrucciones": "Tomar con un vaso lleno de agua",
  "stock": { "unidadesDisponibles": 30, "umbralDeAlerta": 5 }
}
```

Si el paciente actúa sobre sí mismo, `pacienteId` se toma del token. Un cuidador debe enviarlo y tener el permiso `puedeGestionarMedicamentos`.

**Unidades válidas:** `mg` · `g` · `ml` · `tableta` · `capsula` · `gota` · `inyeccion` · `sobre` · `puff` · `unidad`

**Frecuencias:**

```json
{ "tipo": "DIARIA" }
{ "tipo": "DIAS_DE_LA_SEMANA", "diasDeLaSemana": [1, 3, 5] }
{ "tipo": "CADA_N_DIAS", "intervaloEnDias": 3 }
```

Los días van de 0 (domingo) a 6 (sábado).

### `PATCH /api/medicamentos/:id`

Solo los campos que cambian. Se aceptan `nombre`, `dosis`, `frecuencia`, `horarios`, `fechaFin` e `instrucciones`; **no** `fechaInicio` ni `pacienteId`, y el inventario tiene su propio endpoint (`/stock`).

Si el cambio afecta a *cuándo* se toma —`horarios`, `frecuencia` o `fechaFin`— se retiran además las tomas futuras que ya se habían generado con el horario anterior, y la agenda las vuelve a crear a partir del nuevo. Las que ya ocurrieron no se tocan, aunque nadie las haya confirmado: que el paciente no se tomara su medicina esta mañana es un dato clínico y no deja de ser cierto porque por la tarde cambie el horario.

### `DELETE /api/medicamentos/:id`

**Suspende, no borra.** El medicamento deja de generar agenda y de aparecer en la lista, pero el historial de tomas se conserva.

Las tomas futuras que aún estaban pendientes se **retiran**, no se marcan como omitidas. La diferencia importa: una toma omitida es un incumplimiento, y suspender un tratamiento no es incumplirlo. Marcarlas dejaba a un paciente al que le suspendían la medicación por la mañana con 0 % de adherencia y una alerta enviada a su cuidador.

### `POST /api/medicamentos/:id/stock`

```json
{ "unidades": 30, "nuevoUmbralDeAlerta": 5 }
```

Suma unidades al inventario. `nuevoUmbralDeAlerta` es opcional.

---

## Tomas

> **Cuando quien consulta es un cuidador.** `GET /api/medicamentos`, `GET /api/tomas/agenda` y `GET /api/tomas/historial` aceptan `pacienteId` y exigen el permiso `puedeVerHistorial`; `POST /api/tomas/:id/registro` exige `puedeRegistrarTomas`. Sin vínculo aceptado responden `403 NO_AUTORIZADO` con el mismo mensaje exista o no ese paciente, para no revelar quién está registrado. Son las tres consultas que alimentan la pantalla de detalle del paciente en la app.
>
> **Y cuando además lo modifica.** `POST /api/medicamentos` (con `pacienteId`), `PATCH /api/medicamentos/:id`, `DELETE /api/medicamentos/:id` y `POST /api/medicamentos/:id/stock` exigen `puedeGestionarMedicamentos`, que **viene desactivado por defecto** al crear un vínculo: cambiar la medicación de otra persona es la acción más delicada que permite el sistema y el paciente tiene que concederla a propósito. Retirarla corta esas cuatro de inmediato y no afecta a las demás.

### `GET /api/tomas/agenda`

Parámetros opcionales: `fecha` (`AAAA-MM-DD`, por defecto hoy) y `pacienteId`.

Esta llamada **crea las tomas del día si aún no existen**, y es idempotente: llamarla diez veces no las duplica.

```json
{
  "fecha": "2026-08-31",
  "elementos": [
    {
      "tomaId": "...",
      "nombreDelMedicamento": "Losartan",
      "dosis": "1 tableta",
      "instrucciones": "Tomar con agua",
      "horaProgramada": "08:00",
      "programadaPara": "2026-08-31T08:00:00.000Z",
      "estado": "PENDIENTE",
      "vecesPospuesta": 0,
      "puedeConfirmarse": true,
      "necesitaReabastecimiento": false
    }
  ],
  "resumen": {
    "totalProgramadas": 2, "tomadas": 0, "omitidas": 0, "pendientes": 2,
    "porcentaje": 0, "nivel": "SIN_DATOS",
    "mensaje": "Todavia no hay tomas registradas en este periodo."
  }
}
```

### `POST /api/tomas/:id/registro`

```json
{ "accion": "CONFIRMAR", "observaciones": "Tomada con el desayuno" }
{ "accion": "OMITIR", "observaciones": "Se me acabo el medicamento" }
{ "accion": "POSPONER", "minutos": 30 }
```

`CONFIRMAR` descuenta inventario. `POSPONER` admite entre 5 y 180 minutos, máximo 3 veces por toma.

**Respuesta:**

```json
{
  "toma": { "estado": "TOMADA", "resueltaEn": "2026-08-31T08:12:00.000Z", "..." : "..." },
  "avisoDeStock": "Te quedan 3 unidades de Losartan."
}
```

`avisoDeStock` es `null` si el inventario está bien.

### `GET /api/tomas/historial`

Parámetros opcionales: `desde`, `hasta` (`AAAA-MM-DD`, por defecto los últimos 30 días), `medicamentoId`, `pacienteId`.

```json
{
  "desde": "2026-08-01",
  "hasta": "2026-08-31",
  "registros": [
    {
      "tomaId": "...",
      "nombreDelMedicamento": "Losartan",
      "programadaPara": "2026-08-31T08:00:00.000Z",
      "estado": "TOMADA",
      "resueltaEn": "2026-08-31T09:45:00.000Z",
      "puntualidad": "CON_RETRASO",
      "minutosDeDesfase": 105,
      "registradaPor": "PACIENTE",
      "observaciones": null
    }
  ],
  "resumen": { "porcentaje": 87.5, "nivel": "BUENA", "..." : "..." },
  "porDia": [{ "fecha": "2026-08-30", "tomadas": 2, "omitidas": 0, "porcentaje": 100 }]
}
```

**Cómo se calcula la adherencia:** `tomadas ÷ (tomadas + omitidas)`. Las tomas aún pendientes no cuentan, porque todavía se pueden confirmar. Los niveles siguen el umbral clínico habitual: `BUENA` ≥ 80%, `REGULAR` ≥ 50%, `BAJA` por debajo.

La puntualidad se mide contra la hora **original** de la agenda, no contra la hora corrida por los aplazamientos.

---

## Vínculos cuidador-paciente

### `POST /api/vinculos`

Lo puede iniciar cualquiera de las dos partes:

```json
{
  "emailDeLaOtraParte": "ana@correo.com",
  "parentesco": "Hija",
  "permisos": { "puedeRegistrarTomas": true }
}
```

| Quién lo inicia | Estado resultante |
|---|---|
| El **paciente** invita a su cuidador | `ACEPTADO` — el consentimiento ya lo está dando el dueño de los datos |
| El **cuidador** solicita acceso | `PENDIENTE` — hasta que el paciente apruebe |

**Permisos** (por defecto solo los dos primeros están activos):

| Permiso | Qué habilita |
|---|---|
| `puedeVerHistorial` | Ver medicamentos, agenda e historial |
| `recibeAlertas` | Recibir avisos de tomas perdidas |
| `puedeRegistrarTomas` | Confirmar u omitir tomas en nombre del paciente |
| `puedeGestionarMedicamentos` | Crear, editar y suspender medicamentos |

### `POST /api/vinculos/:id/respuesta`

**Solo el paciente.** Es su información de salud.

```json
{ "respuesta": "ACEPTAR" }
```

Valores: `ACEPTAR` · `RECHAZAR` · `REVOCAR`. Revocar corta el acceso de inmediato y está disponible siempre.

### `PATCH /api/vinculos/:id/permisos`

Solo el paciente. Solo los permisos que cambian.

### `GET /api/cuidadores/pacientes`

Solo cuidadores. Parámetro opcional `dias` (por defecto 7).

```json
{
  "pacientes": [
    {
      "pacienteId": "...",
      "nombre": "Rosa Elena Valencia",
      "estadoDelVinculo": "ACEPTADO",
      "adherencia": { "porcentaje": 45.5, "nivel": "BAJA", "tomadas": 5, "omitidas": 6, "pendientes": 2 },
      "requiereAtencion": true,
      "medicamentosActivos": 3,
      "medicamentosConStockBajo": 1,
      "ultimaActividad": "2026-08-31T09:45:00.000Z"
    }
  ]
}
```

La lista viene **ordenada**: primero quien requiere atención, luego por adherencia ascendente. Un vínculo `PENDIENTE` aparece en la lista pero sin ningún dato clínico.

### `GET /api/pacientes/cuidadores`

Solo pacientes. Quién lo acompaña y con qué permisos. Las solicitudes pendientes salen primero.

---

## Tarea automática

Cada 15 minutos el servidor cierra las tomas que nadie respondió, respetando los `minutosDeGracia` de cada paciente, y avisa a los cuidadores con `recibeAlertas`.

No es un endpoint: se ejecuta desde `main.ts`. En un despliegue de producción convendría sacarlo a un proceso aparte (un cron) para que no se duplique si hay varias instancias del servidor.

## Notificaciones

Los avisos salen por el puerto `Notificador`, y la variable `NOTIFICACIONES` decide a dónde:

| Valor | Qué hace |
|---|---|
| `consola` | Solo los registra en el log del servidor. Es el valor por defecto y basta para desarrollar |
| `push` | Los envía como notificación al teléfono, vía Expo |
| `ambos` | Las dos cosas |

Con `push` o `ambos` conviene definir también `EXPO_ACCESS_TOKEN`, que se crea en el panel de Expo e impide que un tercero envíe notificaciones haciéndose pasar por Chronova.

Dos comportamientos del adaptador que conviene conocer:

- **Nunca interrumpe la operación en curso.** Si Expo está caído, la toma se registra igual y el aviso se pierde. Verificado con el servicio inaccesible: las tomas vencidas se cerraron correctamente y el fallo solo quedó en el log.
- **Da de baja los tokens muertos.** Cuando alguien desinstala la app, Expo responde `DeviceNotRegistered` y el token se elimina, en lugar de reintentar indefinidamente.
