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

Con `memory` los datos se borran cada vez que reinicias el servidor. Para que persistan:

### Opción A: con Docker (más fácil)

```bash
cd chronova/backend
docker compose up -d
```

Levanta PostgreSQL configurado y listo.

### Opción B: PostgreSQL instalado en tu máquina

Crea una base de datos llamada `chronova` y ajusta `DATABASE_URL` en el `.env` con tu usuario y contraseña.

### Después, con cualquiera de las dos

Cambia en `.env`:

```
PERSISTENCE=postgres
```

Y ejecuta:

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

Deben pasar 70 pruebas. Si alguna falla, algo se rompió al modificar el código.

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

PostgreSQL no está corriendo. Con Docker: `docker compose up -d` y espera unos segundos.

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
