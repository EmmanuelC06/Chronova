# Arquitectura de Chronova

Este documento explica qué es la arquitectura hexagonal, por qué se eligió para Chronova y dónde está cada cosa. Está escrito para que se entienda sin experiencia previa en el patrón.

---

## 1. La idea en una frase

> Las reglas del negocio van en el centro y no dependen de nada. La tecnología (base de datos, servidor web, cifrado) va en el borde y se puede cambiar sin tocar el centro.

Esta arquitectura también se conoce como **puertos y adaptadores**, y es el nombre que mejor la describe.

---

## 2. La analogía del enchufe

Piensa en un computador portátil.

El portátil **no sabe** de dónde viene la electricidad. Puede venir de la red eléctrica, de una planta a gasolina o de un panel solar. Al portátil le da igual, porque no habla con la fuente de energía: habla con un **enchufe**, que es un contrato de forma y voltaje. Cualquier cosa que cumpla ese contrato sirve.

- El **portátil** es el dominio: la parte valiosa, la que hace el trabajo.
- El **enchufe** es el puerto: un contrato, no una implementación.
- La **red eléctrica o el panel solar** son los adaptadores: intercambiables.

En Chronova, el "portátil" son las reglas del tratamiento farmacológico: cuándo toca una toma, cómo se calcula la adherencia, quién puede ver los datos de quién. El "enchufe" son interfaces de TypeScript. El "panel solar" es PostgreSQL, que mañana podría ser MySQL sin que las reglas se enteren.

---

## 3. Las tres capas

```
                        ┌─────────────────────────────────────┐
   Quien entra          │        INFRAESTRUCTURA              │
   ───────────          │  (adaptadores de ENTRADA)           │
   App móvil ──────────▶│  API HTTP (Express)                 │
   Tareas programadas ─▶│  Rutas, middlewares, validación Zod │
                        └──────────────┬──────────────────────┘
                                       │ llama a
                                       ▼
                        ┌─────────────────────────────────────┐
                        │           APLICACIÓN                │
                        │  Casos de uso: RegistrarMedicamento,│
                        │  ObtenerAgendaDelDia, RegistrarToma │
                        │  Orquestan. No contienen reglas.    │
                        └──────────────┬──────────────────────┘
                                       │ usa
                                       ▼
                        ┌─────────────────────────────────────┐
                        │            DOMINIO                  │
                        │  Paciente · Cuidador · Medicamento  │
                        │  Toma · Vínculo · Stock · Dosis     │
                        │  Aquí viven TODAS las reglas.       │
                        │  Cero dependencias externas.        │
                        └──────────────┬──────────────────────┘
                                       │ define PUERTOS
                                       ▼
                        ┌─────────────────────────────────────┐
                        │        INFRAESTRUCTURA              │
                        │  (adaptadores de SALIDA)            │
                        │  PostgreSQL · En memoria            │
                        │  bcrypt · JWT · Reloj · Avisos      │
                        └─────────────────────────────────────┘
```

**La regla de oro:** las flechas de dependencia apuntan siempre hacia adentro. El dominio no importa nada de las otras capas. Nunca.

Puedes comprobarlo tú mismo. Abre cualquier archivo de `backend/src/domain/` y mira sus importaciones: solo hay otros archivos del propio dominio. No aparece `express`, ni `pg`, ni `bcrypt`, ni una sola librería externa.

---

## 4. Qué va en cada capa

### Dominio — `backend/src/domain/`

Las reglas que serían ciertas aunque Chronova fuera una libreta de papel.

| Archivo | Regla que protege |
|---|---|
| `medicamento/Frecuencia.ts` | ¿Toca este medicamento hoy? |
| `medicamento/Stock.ts` | El inventario nunca baja de cero; avisa al llegar al umbral |
| `medicamento/Medicamento.ts` | No puede haber horarios repetidos; un medicamento suspendido no genera agenda |
| `toma/Toma.ts` | Una toma no se puede registrar dos veces; máximo 3 aplazamientos |
| `toma/ResumenDeAdherencia.ts` | Adherencia = tomadas ÷ resueltas. Buena a partir del 80% |
| `vinculo/Vinculo.ts` | Un cuidador solo accede si el paciente aceptó |

Cada entidad tiene `crear()` (nace validada), `desdePlano()` (se reconstruye desde la base de datos) y `aPlano()` (se convierte en datos simples para guardar o enviar).

### Aplicación — `backend/src/application/`

Los **casos de uso**: cada acción que el sistema sabe hacer, una clase con un método `ejecutar()`.

Un caso de uso orquesta pero no decide. Por ejemplo, `RegistrarToma`:

1. Busca la toma.
2. Pide permiso a la política de acceso.
3. Le dice a la entidad `Toma` que se confirme (la entidad valida si puede).
4. Le dice al `Medicamento` que descuente inventario (la regla del descuento está en la entidad).
5. Guarda y avisa si el stock quedó bajo.

Ninguno de esos pasos contiene una regla de negocio: todas están dentro de las entidades.

Aquí también viven los **puertos**, en `application/ports/`:

| Puerto | Contrato | Por qué existe |
|---|---|---|
| `Reloj` | "dame la hora" | Para poder congelar el tiempo en las pruebas |
| `GeneradorDeIds` | "dame un id nuevo" | Para tener ids predecibles en las pruebas |
| `CifradorDeContrasenas` | "cifra / verifica" | Para cambiar bcrypt por otro sin tocar nada más |
| `ServicioDeTokens` | "emite / verifica sesión" | Para que el dominio no sepa qué es un JWT |
| `Notificador` | "avisa esto a esta persona" | Hoy es la consola, mañana notificaciones push |

Los puertos de persistencia (`RepositorioDeMedicamentos`, etc.) están en el dominio, porque es el dominio quien define qué necesita.

### Infraestructura — `backend/src/infrastructure/`

Todo lo que se puede reemplazar.

| Carpeta | Qué contiene |
|---|---|
| `persistence/postgres/` | Todas las consultas SQL del proyecto. Absolutamente todas. |
| `persistence/in-memory/` | Los mismos repositorios, con arreglos en memoria |
| `security/` | bcrypt y JWT |
| `system/` | Reloj del sistema, generador de UUID, notificador |
| `http/` | Express: rutas, middlewares, validación, traducción de errores |

---

## 5. Por qué esto importa: tres pruebas concretas

### Prueba 1: la aplicación corre sin base de datos

Con `PERSISTENCE=memory` en el `.env`, Chronova funciona completa sin instalar PostgreSQL. Registro, medicamentos, agenda, adherencia, cuidadores: todo.

Eso solo es posible porque el dominio nunca supo que existía una base de datos. El cambio ocurre en **una línea** del archivo `contenedor.ts`.

### Prueba 2: las pruebas corren en milisegundos

Las 70 pruebas de `backend/tests/` ejercitan la aplicación entera —incluidos los casos de uso completos— y terminan en menos de dos segundos, sin base de datos, sin servidor y sin red.

Con la arquitectura del MVP anterior, donde la lógica vivía dentro de las rutas de Express y hablaba directamente con PostgreSQL, cada prueba habría necesitado una base de datos levantada, datos sembrados y limpieza posterior. En la práctica, eso significa que nadie escribe pruebas.

### Prueba 3: el tiempo se puede manipular

Para probar "¿qué pasa si el paciente no confirma la toma en dos horas?" no hay que esperar dos horas: se inyecta un `RelojFijo` y se mueve. Mira `backend/tests/use-cases/casosDeUso.test.ts`, la prueba del cierre automático.

---

## 6. El punto donde todo se conecta

`backend/src/contenedor.ts` es el **composition root**: el único archivo del backend que sabe qué implementación concreta se usa para cada puerto.

```typescript
if (entorno.persistencia === 'postgres') {
  repositorios = { medicamentos: new RepositorioDeMedicamentosPostgres(pool), ... };
} else {
  repositorios = { medicamentos: new RepositorioDeMedicamentosEnMemoria(), ... };
}
```

Migrar a MySQL sería: escribir `RepositorioDeMedicamentosMySql` cumpliendo la misma interfaz, y agregar una rama a este `if`. Ni el dominio ni los casos de uso ni las rutas cambian una sola línea.

---

## 7. La app móvil sigue la misma idea

`mobile/src/` está organizado igual:

| Carpeta | Qué es |
|---|---|
| `dominio/` | Los tipos y los puertos (`ApiDeChronova`, `AlmacenDeSesion`, `ProgramadorDeAlarmas`) |
| `infraestructura/` | El cliente HTTP, AsyncStorage, las alarmas de Expo |
| `ui/` | El sistema de diseño y los componentes |
| `ui/contexto/SesionContexto.tsx` | El composition root de la app |

Las pantallas de `mobile/app/` nunca llaman a `fetch` directamente. Piden `api` al contexto y usan el puerto. Si mañana la comunicación fuera por WebSocket o GraphQL, solo cambiaría `ClienteChronova.ts`.

---

## 8. Dónde poner cada cosa nueva

Cuando agregues una funcionalidad, esta tabla te dice dónde va:

| Lo que quieres agregar | Dónde va |
|---|---|
| Una regla nueva ("no más de 8 medicamentos activos") | Entidad del dominio |
| Un concepto nuevo con reglas propias (una cita médica) | Nueva carpeta en `domain/` |
| Una acción nueva del sistema ("exportar informe") | Nuevo caso de uso en `application/use-cases/` |
| Una consulta SQL | Solo en `infrastructure/persistence/postgres/` |
| Un endpoint nuevo | `infrastructure/http/routes/` + su esquema Zod |
| Una pantalla nueva | `mobile/app/` |

**Señal de alarma:** si te encuentras escribiendo `if` con reglas de negocio dentro de un archivo de `routes/`, esa lógica está en el lugar equivocado. Su sitio es un caso de uso o una entidad.

---

## 9. Las dos validaciones (y por qué no sobra ninguna)

Chronova valida los datos dos veces, a propósito:

1. **Zod, en el borde HTTP** (`http/dtos/esquemas.ts`): comprueba la *forma*. ¿Vino el campo? ¿Es texto? ¿El número es entero? Da mensajes rápidos y precisos al usuario.

2. **El dominio**: comprueba el *significado*. ¿Esa hora existe? ¿La fecha de fin es posterior al inicio? ¿Este horario está repetido?

¿Por qué las dos? Si solo se validara en HTTP, cualquier otro punto de entrada —una tarea programada, el script de datos de ejemplo, un futuro adaptador— se saltaría las reglas. Si solo se validara en el dominio, los mensajes llegarían tarde y peor explicados.

Cada capa valida lo que le corresponde. Esa duplicación aparente es en realidad defensa en profundidad.
