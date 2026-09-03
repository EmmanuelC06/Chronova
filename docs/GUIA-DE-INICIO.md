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
  "apiUrl": "http://TU_IP_AQUI:4000"
}
```

Sustituye la IP que haya por la que acabas de averiguar. Deja el `:4000`.

> Después de cambiarla hay que **reiniciar Expo**: `app.json` solo se lee al arrancar. Y si añadiste archivos nuevos, `npx expo start -c` para limpiar la caché.

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

Deben pasar 143 pruebas. Si alguna falla, algo se rompió al modificar el código.

```bash
npm run typecheck
```

No debe imprimir nada. Si imprime errores, hay problemas de tipos en el código.

---

## Parte 5: notificaciones push (opcional)

Conviene separar dos cosas que suenan igual pero no lo son:

- **Alarmas locales.** Las programa el propio teléfono a partir de la agenda del día. Son las del paciente ("es hora de tu Losartán") y **funcionan sin configurar nada**, incluso sin internet. Son las importantes: un recordatorio de medicamento no puede depender de la cobertura.
- **Notificaciones push.** Las envía el servidor cuando pasa algo que ese teléfono no puede saber solo, sobre todo "el paciente al que acompañas no confirmó una toma". Son para el cuidador, y sí necesitan configuración.

Esta parte trata solo de las segundas. Si no la haces, la app funciona igual: el aviso queda registrado en la consola del servidor en lugar de llegar al teléfono.

### 5.1 Obtener el identificador del proyecto

Crea una cuenta gratuita en [expo.dev](https://expo.dev). Luego:

```bash
npm install -g eas-cli
cd chronova/mobile
eas init
```

El comando pide iniciar sesión y escribe el `projectId` dentro de `mobile/app.json`, en `extra.eas.projectId`.

> Si responde `Project already linked` seguido de `Invalid UUID appId`, es que el campo `extra.eas.projectId` ya existe con un valor que no es un identificador real. Bórralo de `app.json` y vuelve a ejecutar `eas init`.

### 5.2 Activar el envío en el servidor

En `backend/.env`:

```
NOTIFICACIONES=push
```

Los tres valores posibles son `consola` (solo imprime, es el de por defecto), `push` (solo envía) y `ambos` (hace las dos cosas, útil mientras pruebas).

### 5.3 La limitación que hay que conocer

**Desde el SDK 53, la app Expo Go no admite notificaciones push remotas.** Este proyecto usa SDK 53, así que aunque completes los dos pasos anteriores, abrir Chronova dentro de Expo Go no va a obtener un token.

Eso no rompe nada: la app escribe un aviso en la consola, devuelve `null` y sigue funcionando con sus alarmas locales. Pero el cuidador no recibirá nada en el teléfono.

Para que lleguen de verdad hace falta un **development build**. Tiene su propia sección, la Parte 6, porque además resuelve otro problema.

### 5.4 Comprobar sin teléfono

No hace falta un celular para verificar que el envío funciona. Con `NOTIFICACIONES=ambos`, cualquier aviso queda impreso en la consola del servidor con su destinatario, su título y su cuerpo, y a continuación el resultado del envío real.

Es la forma de comprobar el comportamiento que más importa: **si el servicio de Expo no responde, el aviso se pierde pero la operación no falla**. Las tomas vencidas se cierran igual. Eso está cubierto por las pruebas automatizadas de `backend/tests/use-cases/notificaciones.test.ts`, que sustituyen el servicio de Expo por un cliente falso para poder provocar caídas y desinstalaciones a voluntad.

---

## Parte 6: el development build

### 6.1 Qué es, y qué no es

Es **la misma aplicación, el mismo código**. Lo único que cambia es el envase: en vez de correr dentro de Expo Go, corre dentro de una app tuya, llamada Chronova, con tu ícono. No hay nada que reescribir.

Resuelve dos problemas de golpe:

- **Se acaba el baile de versiones.** Cada versión de Expo Go trae dentro *una sola* versión del SDK, y la que hay en la tienda no es la que usa este proyecto. Por eso hay que instalar una Expo Go antigua en cada teléfono de prueba, y en un iPhone físico eso ni siquiera se puede. Con un build propio, la versión la fijas tú y no cambia debajo de ti.
- **Funcionan las notificaciones push**, que en Expo Go no funcionan y no van a funcionar (ver 5.3).

Es también el paso que hace falta para poner la app en manos de adultos mayores reales, que es la evidencia que le falta al proyecto.

### 6.2 Preparación

Necesitas una cuenta gratuita en [expo.dev](https://expo.dev) y el `projectId` ya configurado (Parte 5.1). El resto ya está en el repositorio: `eas.json` con los perfiles y el paquete `expo-dev-client`.

```bash
cd chronova/mobile
npm install
```

### 6.3 Generar el APK

```bash
eas build --profile development --platform android
```

Corre en los servidores de Expo, en su capa gratuita. Tarda entre 15 y 40 minutos, y puedes cerrar la terminal: al terminar llega un correo con el enlace. También puedes seguirlo en [expo.dev](https://expo.dev), en la pestaña Builds de tu proyecto.

Cuando acabe, abre ese enlace **desde el teléfono** y descarga el APK. Android va a pedirte permitir la instalación de aplicaciones de origen desconocido: es normal, es tu propia app sin firmar por la Play Store.

### 6.4 Usarlo

A partir de aquí, en vez de `npm start`:

```bash
npx expo start --dev-client
```

Abres la app Chronova en el teléfono (no Expo Go) y se conecta al servidor de desarrollo igual que antes. El código sigue recargándose al guardar.

**Solo hay que volver a generar el APK cuando cambian las dependencias nativas** —añadir una librería nueva, subir de SDK—, no cuando cambias pantallas o lógica. Eso se sigue recargando al instante.

### 6.5 Probar las notificaciones push de verdad

Este es el momento en que se comprueba lo que Expo Go nunca pudo hacer.

**Preparar el servidor.** En `backend/.env`:

```
NOTIFICACIONES=ambos
```

`ambos` envía al teléfono **y** escribe en la consola, así que si algo no llega puedes ver en qué punto se perdió. Reinicia el servidor.

**Un truco para probar con un solo teléfono.** Expo Go y el development build son dos aplicaciones distintas: puedes tener las dos instaladas a la vez. Entra como **cuidadora** en Chronova (el build propio) y como **paciente** en Expo Go. Así una misma persona puede provocar el aviso desde un lado y verlo llegar del otro.

**La prueba más rápida — el aviso de vínculo:**

1. En Chronova (build propio) inicia sesión como la cuidadora. Acepta el permiso de notificaciones cuando lo pida: ese es el momento en que el teléfono se registra en el servidor.
2. En Expo Go, como paciente, ve a *Mi cuenta* e invita a esa cuidadora.
3. El aviso *"Te agregaron como cuidador"* debe llegar al teléfono en segundos.

**La prueba que importa — la toma perdida:**

1. Como paciente, en *Mi cuenta*, baja el margen de gracia a **1 hora**.
2. Asegúrate de que hay una toma de hoy cuya hora ya pasó y que no confirmaste.
3. Reinicia el servidor. Diez segundos después corre el cierre automático, y la cuidadora recibe *"Rosa no confirmó una toma de su tratamiento"*.
4. Tócala: la aplicación debe abrirse directamente en el detalle de esa paciente.

En la consola del servidor verás la línea del aviso y, a continuación, el resultado del envío. Si el aviso aparece pero no llega al teléfono, el problema está entre el servidor y Expo; si no aparece siquiera, es que no había ninguna toma vencida.

### 6.6 Los tres perfiles de `eas.json`

| Perfil | Qué produce | Para qué |
|---|---|---|
| `development` | APK con el cliente de desarrollo | El día a día. Necesita el servidor de Metro corriendo |
| `preview` | APK autónomo | Enseñar la app sin tener que arrancar nada. Útil para la sustentación |
| `production` | App bundle (.aab) | El formato que pide Google Play. Solo si algún día publicas |

Una diferencia importante entre los dos primeros: el `development` lee la IP del servidor cada vez que arranca Metro, así que si cambias de wifi basta con editar `app.json` y reiniciar. El `preview` la lleva **incrustada** en el APK, y si cambia hay que volver a compilarlo.

Para la sustentación, eso significa que el `preview` es cómodo pero frágil: si la red del salón es distinta a la de tu casa, la app no encontrará el servidor. Genéralo el mismo día y con la IP correcta, o lleva el `development` y una terminal abierta.


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
