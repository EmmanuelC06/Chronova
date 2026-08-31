# Guía de inicio

Paso a paso, sin dar nada por sentado. Si algo falla, al final hay una sección de problemas comunes.

---

## Antes de empezar

Necesitas **Node.js versión 20 o superior**. Para comprobar si ya lo tienes, abre una terminal y escribe:

```bash
node --version
```

Si responde algo como `v20.11.0` o `v22.3.0`, ya está. Si dice "comando no encontrado" o sale una versión menor a 20, descárgalo de [nodejs.org](https://nodejs.org) (opción LTS).

> **Cómo abrir una terminal:** en Windows, busca "PowerShell" en el menú inicio. En Mac, busca "Terminal" en Spotlight. En Linux, `Ctrl + Alt + T`.

---

## Parte 1: el servidor

### 1.1 Instalar

Abre una terminal, entra a la carpeta del proyecto y luego a `backend`:

```bash
cd chronova/backend
npm install
```

Tarda uno o dos minutos. Descarga las librerías que el proyecto necesita.

### 1.2 Configurar

```bash
cp .env.example .env
```

En Windows con PowerShell, si `cp` no funciona:

```powershell
Copy-Item .env.example .env
```

Abre el archivo `.env` con cualquier editor de texto y cambia esta línea:

```
JWT_SECRET=cambia-esta-clave-por-una-larga-y-secreta
```

Por cualquier texto largo que inventes, por ejemplo:

```
JWT_SECRET=chronova-2026-universidad-catolica-luis-amigo-clave-secreta
```

Esa clave es la que firma las sesiones de los usuarios. El servidor se niega a arrancar si es demasiado corta, a propósito.

### 1.3 Arrancar

```bash
npm run dev
```

Deberías ver:

```
  Chronova API
  Escuchando en   http://localhost:4000
  Persistencia    memory
```

**Deja esta terminal abierta.** Mientras esté corriendo, el servidor está encendido. Para apagarlo, `Ctrl + C`.

### 1.4 Comprobar

Abre en el navegador: [http://localhost:4000/api/salud](http://localhost:4000/api/salud)

Debe responder algo como:

```json
{"servicio":"Chronova API","estado":"ok","persistencia":"memory"}
```

Si ves eso, el backend funciona.

### 1.5 Datos de ejemplo (opcional pero recomendado)

En **otra** terminal (deja la del servidor corriendo):

```bash
cd chronova/backend
npm run db:seed
```

> Con `PERSISTENCE=memory`, el seed crea los datos en un proceso aparte que termina enseguida, así que **no** quedan disponibles en el servidor que está corriendo. Para tener datos de ejemplo persistentes, sigue la Parte 3 (PostgreSQL). Para probar rápido, simplemente registra una cuenta desde la app.

---

## Parte 2: la app móvil

### 2.1 Averiguar la IP de tu computador

Este paso es el que más confunde y el que más falla, así que va con detalle.

Tu teléfono y tu computador son dos máquinas distintas. Cuando la app del teléfono pide datos a `localhost`, se los está pidiendo **al propio teléfono**, donde no hay ningún servidor. Hay que decirle la dirección real del computador en la red wifi.

**Windows:**

```bash
ipconfig
```

Busca "Dirección IPv4" en el adaptador de wifi. Algo como `192.168.1.15`.

**Mac o Linux:**

```bash
ifconfig | grep "inet "
```

Busca la que empieza por `192.168.` o `10.0.`.

### 2.2 Configurar la app

Abre `mobile/app.json` y busca:

```json
"extra": {
  "apiUrl": "http://192.168.1.10:4000"
}
```

Cambia `192.168.1.10` por la IP que acabas de averiguar. Deja el `:4000`.

### 2.3 Instalar y arrancar

```bash
cd chronova/mobile
npm install
npm start
```

Aparecerá un código QR en la terminal.

### 2.4 Abrir en el teléfono

1. Instala **Expo Go** desde Play Store o App Store.
2. Asegúrate de que el teléfono y el computador estén **en la misma red wifi**.
3. Android: abre Expo Go y escanea el QR desde ahí. iPhone: escanea el QR con la cámara normal.

La app abre en la pantalla de ingreso. Toca "Crear una cuenta", elige "Sigo un tratamiento", y ya puedes agregar medicamentos.

---

## Parte 3: base de datos real (PostgreSQL)

Con `memory` los datos se borran cada vez que reinicias el servidor. Para que persistan hay tres caminos. **Elige uno solo.**

> Nada de esto es obligatorio para desarrollar. Con `PERSISTENCE=memory` la aplicación funciona completa. Lo único que ganas aquí es que los datos sobrevivan al reiniciar.

### Opción A: PostgreSQL en la nube — recomendada, no instalas nada

[Neon](https://neon.tech) ofrece PostgreSQL gratis y basta con copiar una línea. Es la opción con menos fricción, y además es la misma configuración que usarás cuando despliegues.

1. Entra a [neon.tech](https://neon.tech) y crea una cuenta (puedes entrar con GitHub).
2. Crea un proyecto llamado `chronova`.
3. Copia la **connection string** que te muestra. Se ve así:

   ```
   postgresql://usuario:clave@ep-algo-123.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

4. En `backend/.env`:

   ```
   PERSISTENCE=postgres
   DATABASE_URL=pega-aqui-la-cadena-de-neon
   DATABASE_SSL=true
   ```

Ventaja adicional para un proyecto en pareja: ambos integrantes pueden conectarse a la misma base de datos desde sus computadores. [Supabase](https://supabase.com) funciona igual si prefieres esa.

### Opción B: PostgreSQL instalado en tu computador

Descarga el instalador de [postgresql.org/download/windows](https://www.postgresql.org/download/windows/) (o el de tu sistema). Durante la instalación te pide una contraseña para el usuario `postgres`: **anótala**, la vas a necesitar enseguida.

Al terminar, abre pgAdmin (viene incluido) y crea una base de datos llamada `chronova`. Luego en `backend/.env`:

```
PERSISTENCE=postgres
DATABASE_URL=postgresql://postgres:TU_CONTRASEÑA@localhost:5432/chronova
DATABASE_SSL=false
```

Si tu contraseña tiene caracteres como `@`, `#` o `/`, hay que codificarlos. Lo más simple es usar una contraseña solo de letras y números.

### Opción C: con Docker

Solo si ya tienes Docker Desktop instalado y funcionando.

```bash
cd chronova/backend
docker compose up -d
```

Y en `.env` basta con `PERSISTENCE=postgres`: el resto de valores por defecto ya coinciden con lo que levanta `docker-compose.yml`.

> **Si sale este error:**
>
> ```
> unable to get image 'postgres:16-alpine': error during connect:
> open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified
> ```
>
> Docker está instalado pero **el motor no está corriendo**. Abre Docker Desktop desde el menú inicio y espera a que el ícono de la ballena indique *Engine running*; luego repite el comando. Si `docker --version` responde que el comando no se reconoce, Docker no está instalado: usa la opción A, que es más rápida que instalarlo.

### Después, con cualquiera de las tres

Ejecuta:

```bash
npm run db:migrate    # crea las tablas
npm run db:seed       # datos de ejemplo (ahora sí quedan guardados)
npm run dev
```

El seed imprime las credenciales de prueba:

```
Paciente     rosa@chronova.test / rosa12345
Cuidadora    ana@chronova.test  / ana123456
```

Inicia sesión con la paciente para ver la agenda con tres medicamentos, o con la cuidadora para ver el panel de seguimiento.

---

## Parte 4: comprobar que todo está bien

```bash
cd chronova/backend
npm test
```

Deben pasar 71 pruebas. Si alguna falla, algo se rompió al modificar el código.

```bash
npm run typecheck
```

No debe imprimir nada. Si imprime errores, hay problemas de tipos en el código.

---

## Problemas comunes

### "No pudimos conectarnos con el servidor" en la app

Es casi siempre el paso 2.1. En orden:

1. ¿El servidor está corriendo? Debe haber una terminal con `npm run dev` activa.
2. ¿La IP en `app.json` es la correcta? Vuelve a mirarla: cambia cuando te conectas a otra wifi.
3. ¿El teléfono está en la **misma** wifi que el computador? Con datos móviles no funciona.
4. ¿El firewall bloquea el puerto 4000? En Windows suele preguntar la primera vez; hay que aceptar.

Comprueba desde el navegador del **teléfono**: entra a `http://TU_IP:4000/api/salud`. Si ahí no carga, el problema es de red, no de la app.

### "JWT_SECRET debe tener al menos 16 caracteres"

No editaste el `.env`, o lo guardaste con otro nombre. Verifica que el archivo se llame exactamente `.env`, sin `.txt` al final (Windows lo agrega solo si no tienes activadas las extensiones visibles).

### "PERSISTENCE=postgres requiere que definas DATABASE_URL"

Pusiste `postgres` pero la línea `DATABASE_URL` está vacía o comentada.

### "ECONNREFUSED" al hacer `db:migrate`

PostgreSQL no está aceptando conexiones. Con Docker, verifica que el contenedor esté arriba (`docker ps`). Con PostgreSQL instalado en Windows, revisa que el servicio `postgresql-x64-16` esté iniciado en Servicios. Con Neon, revisa que copiaste la cadena completa, incluyendo `?sslmode=require`.

### "open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified"

Es un error de Docker, no de Chronova: el motor no está corriendo. Abre Docker Desktop y espera a que diga *Engine running*. Si Docker no está instalado, usa la opción A de la Parte 3 (Neon), que toma menos tiempo que instalarlo.

### "password authentication failed for user postgres"

La contraseña en `DATABASE_URL` no coincide con la que pusiste al instalar PostgreSQL. Si tiene caracteres especiales (`@`, `#`, `/`, `:`), son los que rompen la cadena de conexión: lo más simple es cambiarla por una de solo letras y números desde pgAdmin.

### `npm install` falla

Revisa la versión de Node (`node --version`, debe ser 20+). Si persiste, borra `node_modules` y `package-lock.json` y vuelve a intentar.

### La app arranca pero se ve en blanco

Sacude el teléfono para abrir el menú de Expo y toca "Reload". Si sigue, cierra Expo Go y vuelve a escanear el QR.

---

## Cómo probar la API sin la app

Útil para verificar el backend por separado:

```bash
# Crear un paciente
curl -X POST http://localhost:4000/api/auth/registro/paciente \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Rosa Valencia","email":"rosa@prueba.com","contrasena":"rosa123456"}'
```

Copia el `token` de la respuesta y úsalo:

```bash
curl http://localhost:4000/api/tomas/agenda \
  -H "Authorization: Bearer PEGA_AQUI_EL_TOKEN"
```

En `docs/API.md` están todos los endpoints con ejemplos.
