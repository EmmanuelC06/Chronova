# Chronova

Aplicación móvil de adherencia al tratamiento farmacológico y detección temprana de complicaciones en adultos mayores y pacientes con enfermedades crónicas.

Universidad Católica Luis Amigó — Facultad de Ingenierías y Arquitectura
Medellín, Colombia · 2026

**Autores:** Julián Andrés Herrera Roncancio · Emmanuel Correa Valencia

---

## Qué hay aquí

```
chronova/
├── backend/     API en Node + TypeScript, arquitectura hexagonal, PostgreSQL
├── mobile/      App móvil en React Native (Expo) + TypeScript
└── docs/        Guía de instalación, arquitectura, API y diagramas UML
```

Chronova reemplaza al prototipo MedAlerta. Conserva su propósito y sus módulos, pero está reconstruida sobre una arquitectura que separa las reglas del negocio de la tecnología que las ejecuta.

---

## Arranque rápido (5 minutos, sin instalar base de datos)

Necesitas [Node.js 20 o superior](https://nodejs.org).

### 1. El servidor

```bash
cd backend
npm install
cp .env.example .env
```

Abre `backend/.env` y cambia la línea `JWT_SECRET` por cualquier texto largo inventado. Luego:

```bash
npm run dev
```

Deberías ver `Escuchando en http://localhost:4000`. Ábrelo en el navegador con `/api/salud` al final para comprobarlo.

Con `PERSISTENCE=memory` (el valor por defecto) **no necesitas instalar PostgreSQL**: los datos viven en la memoria del servidor y se borran al reiniciarlo. Es perfecto para desarrollar y para mostrar la app.

### 2. La app

En otra terminal:

```bash
cd mobile
npm install
npm start
```

Escanea el código QR con la aplicación **Expo Go** de tu teléfono.

> **Paso obligatorio para probar en un teléfono real:** abre `mobile/app.json` y pon en `extra.apiUrl` la IP de tu computador en la red wifi, conservando el `:4000`. Desde el celular, `localhost` significa "el celular mismo", no tu computador. Para averiguar tu IP: `ipconfig` en Windows, `ifconfig | grep inet` en Mac o Linux.

### 3. Datos de ejemplo (opcional)

```bash
cd backend
npm run db:seed
```

Crea una paciente con tres medicamentos y su hija como cuidadora. Las credenciales se imprimen en pantalla.

---

## Con base de datos real

Sirve cualquier PostgreSQL. La vía con menos fricción es una base gratuita en la nube: crea un proyecto en [Neon](https://neon.tech) o [Supabase](https://supabase.com), copia la connection string y ponla en `backend/.env`:

```
PERSISTENCE=postgres
DATABASE_URL=postgresql://usuario:clave@host/neondb?sslmode=require
DATABASE_SSL=true
```

Si prefieres una base local, tienes dos opciones: instalar PostgreSQL en tu máquina, o levantarlo con Docker (`docker compose up -d` dentro de `backend/`, solo si ya tienes Docker Desktop corriendo). En ambos casos `DATABASE_SSL=false`.

Luego, con cualquiera de las tres:

```bash
npm run db:migrate            # crea las tablas
npm run db:seed               # datos de ejemplo, opcional
npm run dev
```

Los tres caminos están explicados paso a paso, con sus errores típicos, en [docs/GUIA-DE-INICIO.md](docs/GUIA-DE-INICIO.md#parte-3-base-de-datos-real-postgresql).

---

## Comandos disponibles

**backend/**

| Comando | Qué hace |
|---|---|
| `npm run dev` | Arranca el servidor y se recarga solo al guardar cambios |
| `npm test` | Ejecuta las 146 pruebas automáticas |
| `npm run typecheck` | Revisa que no haya errores de tipos |
| `npm run build` | Compila para producción |
| `npm run db:migrate` | Crea las tablas en PostgreSQL |
| `npm run db:seed` | Carga datos de ejemplo |

**mobile/**

| Comando | Qué hace |
|---|---|
| `npm start` | Abre Expo con el código QR |
| `npm run android` | Abre directamente en un emulador Android |
| `npm run typecheck` | Revisa que no haya errores de tipos |

---

## Documentación

| Documento | Para qué sirve |
|---|---|
| [docs/GUIA-DE-INICIO.md](docs/GUIA-DE-INICIO.md) | Instalación paso a paso, explicada sin dar por sentado nada |
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Qué es la arquitectura hexagonal y cómo está aplicada aquí |
| [docs/API.md](docs/API.md) | Todos los endpoints con ejemplos listos para copiar |
| [docs/DEL-MVP-A-CHRONOVA.md](docs/DEL-MVP-A-CHRONOVA.md) | Qué cambió respecto a MedAlerta y por qué |
| [docs/diagramas/](docs/diagramas/) | Los 8 diagramas UML, en PNG, SVG y fuente editable |
| [docs/Chronova-Requerimientos.docx](docs/Chronova-Requerimientos.docx) | Actores, cronograma y los 34 requerimientos funcionales y 25 no funcionales, listo para el entregable |
| [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md) | Cómo alojar el servidor y repartir la app para que otros la prueben desde sus teléfonos |
| [docs/REVISION-DE-CODIGO.md](docs/REVISION-DE-CODIGO.md) | Revisión de defectos con escenarios reproducibles, y cuáles quedan pendientes |
| [docs/FLUJO-DE-TRABAJO-CON-CLAUDE.md](docs/FLUJO-DE-TRABAJO-CON-CLAUDE.md) | Subir el proyecto a GitHub y traer cambios sin credenciales |

---

## Módulos del entregable y dónde están implementados

| Módulo del documento | Dónde vive |
|---|---|
| Login | `backend/src/application/use-cases/auth/IniciarSesion.ts` |
| Formulario de registro | `.../auth/RegistrarPaciente.ts` y `RegistrarCuidador.ts` |
| Panel de supervisión | `.../cuidadores/ListarPacientesDelCuidador.ts` |
| Registro de medicamentos | `.../medicamentos/RegistrarMedicamento.ts` |
| Stock de medicamentos | `backend/src/domain/medicamento/Stock.ts` |
| Historial de tomas | `.../tomas/ConsultarHistorial.ts` |

---

## Estado del proyecto

- Backend completo, con 146 pruebas automáticas en verde.
- App móvil con las pantallas principales conectadas a la API.
- Las horas se manejan en la zona horaria de cada paciente, no en la del servidor. Verificado con la suite completa bajo seis relojes distintos, de UTC+14 a UTC−9.
- Notificaciones push al teléfono del cuidador, **verificadas de extremo a extremo sobre un Android real**: el servidor detecta la toma vencida, el aviso llega al teléfono y al tocarlo se abre la información de esa paciente. Con baja automática de los dispositivos donde se desinstaló la aplicación.
- El proyecto está preparado para generar un *development build* (`eas.json` y `expo-dev-client` incluidos). Es la vía recomendada para probar: evita el baile de versiones de Expo Go y es la única forma de recibir notificaciones push, que Expo Go no admite desde el SDK 53. Ver la [Parte 6 de la guía](docs/GUIA-DE-INICIO.md).
- El cuidador puede abrir a cada paciente y ver su agenda del día, su tratamiento y las tomas que se saltó; y tocar una notificación lo lleva directo a ese paciente. Se añadió sin modificar ningún archivo de `backend/src/`.
- El paciente decide permiso por permiso qué puede hacer cada cuidador —ver el tratamiento, recibir avisos, confirmar tomas por él, cambiar la medicación— y esos permisos se notan de verdad: con «cambiar la medicación» concedido, el cuidador puede agregar, editar, reabastecer y suspender medicamentos desde la ficha del paciente. Sin él, ve el tratamiento y no puede tocarlo. Editar conserva el historial de tomas.
- Recuperación de contraseña con un código de seis dígitos enviado por correo, que caduca, sirve una sola vez y admite cinco intentos. El envío está detrás de un puerto: por defecto escribe en la consola, así que el flujo completo se prueba sin contratar ningún servicio.
- La sesión se renueva sola antes de caducar, y cambiar la contraseña cierra de inmediato todas las sesiones abiertas.
- Interfaz rediseñada con una dirección propia: paleta clínica verificada contra la norma de contraste, tipografía **Atkinson Hyperlegible Next** —diseñada por el Braille Institute para lectores con baja visión— e iconos dibujados en lugar de emoji, que cada teléfono pintaba a su manera. Todo vive en `mobile/src/ui/tema.ts`.
- Pendiente: alojar el servidor con HTTPS, y pruebas de usabilidad con adultos mayores reales.
