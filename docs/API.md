# API de Chronova

Base: `http://localhost:4000`

Todas las respuestas son JSON. Salvo el registro y el inicio de sesión, todas las rutas requieren el encabezado:

```
Authorization: Bearer <token>
```

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
  "preferencias": { "tamanoDeLetra": "MUY_GRANDE", "minutosDeGracia": 90 }
}
```

`telefono`, `fechaDeNacimiento` y `preferencias` son opcionales.

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

---

## Medicamentos

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

Solo los campos que cambian. Mismo formato que la creación.

### `DELETE /api/medicamentos/:id`

**Suspende, no borra.** El medicamento deja de generar agenda y de aparecer en la lista, pero el historial de tomas se conserva. Las tomas futuras aún pendientes se cierran.

### `POST /api/medicamentos/:id/stock`

```json
{ "unidades": 30, "nuevoUmbralDeAlerta": 5 }
```

Suma unidades al inventario. `nuevoUmbralDeAlerta` es opcional.

---

## Tomas

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
