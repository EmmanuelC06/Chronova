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
└── docs/        Guía de instalación, arquitectura y referencia de la API
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

> **Paso obligatorio para probar en un teléfono real:** abre `mobile/app.json` y cambia `"apiUrl": "http://192.168.1.10:4000"` por la IP de tu computador en la red wifi. Desde el celular, `localhost` significa "el celular mismo", no tu computador. Para averiguar tu IP: `ipconfig` en Windows, `ifconfig | grep inet` en Mac o Linux.

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
| `npm test` | Ejecuta las 70 pruebas automáticas |
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

- Backend completo, con 70 pruebas automáticas en verde.
- App móvil con las pantallas principales conectadas a la API.
- Pendiente: notificaciones push desde el servidor, exportación de informes en PDF para el médico, y pruebas de usabilidad con adultos mayores reales.
