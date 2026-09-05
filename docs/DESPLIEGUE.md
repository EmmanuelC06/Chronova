# Cómo poner Chronova en manos de otras personas

Este documento responde a una pregunta concreta: **el día de la sustentación, ¿cómo prueban la app los profesores y auditores desde sus propios teléfonos?**

Hoy no se puede, y hay una sola razón de fondo. Vale la pena entenderla antes de mirar los pasos.

---

## 1. El problema real: el servidor vive en tu computador

Ahora mismo `mobile/app.json` apunta a algo como `http://192.168.1.6:4000`. Esa dirección es **tu portátil dentro de tu wifi**. De ahí salen las tres limitaciones:

1. **Todos tienen que estar en la misma red que tú.** La wifi de una sala de sustentación no sirve: aunque se conecten a ella, tu IP cambia y hay que reconfigurar la app.
2. **Tu computador tiene que estar encendido** y con el servidor corriendo. Si se suspende a mitad de la demostración, la app deja de funcionar para todos.
3. **Y una que todavía no te ha dado la cara:** Android **bloquea las conexiones HTTP sin cifrar en las compilaciones de producción**. Funciona en el build de desarrollo porque ahí se permite a propósito; un APK `preview` apuntando a `http://192.168...` sencillamente no conectaría, sin un error que lo explique.

Esa tercera es la que convierte "alojar el servidor" en un requisito y no en un lujo: al alojarlo obtienes HTTPS, y con HTTPS el problema desaparece.

**La buena noticia:** la base de datos ya está en la nube (Neon). La mitad del camino está hecha.

---

## 2. Paso uno: alojar el backend

El objetivo es que `apiUrl` deje de ser tu portátil y pase a ser una dirección fija tipo `https://chronova-api.onrender.com`, que funcione desde cualquier red del mundo y no dependa de ningún equipo tuyo.

### Qué hace falta

El proyecto ya está preparado: `npm run build` compila y `npm start` arranca. Solo hay que darle un sitio donde vivir y estas variables de entorno:

```
NODE_ENV=production
PERSISTENCE=postgres
DATABASE_URL=<la cadena de Neon que ya usas>
DATABASE_SSL=true
JWT_SECRET=<una clave larga, DISTINTA de la de desarrollo>
NOTIFICACIONES=push
```

### Tres formas de usar la nube, y por qué solo dos sirven

Conviene deshacer una confusión frecuente: **«alojar el servidor» y «ponerlo en la nube» son lo mismo.** No son dos caminos distintos. Lo que sí hay son tres maneras de hacerlo:

| Forma | Qué te dan | Ejemplos |
|---|---|---|
| **Plataforma (PaaS)** | Subes el código; ellos lo compilan, lo corren y le ponen el certificado HTTPS. No administras ningún servidor | Render, Railway |
| **Servidor virtual (IaaS)** | Una máquina Linux vacía. Tú instalas Node, el proxy inverso, el certificado, el reinicio automático y el cortafuegos | Azure, AWS, DigitalOcean |
| **Serverless** | Pagas por petición y el código solo existe mientras responde | AWS Lambda, Cloud Run |

**El serverless queda descartado, y no por gusto.** `main.ts` mantiene un `setInterval` que cada quince minutos cierra las tomas vencidas. El serverless no conserva procesos vivos entre peticiones, así que ese temporizador sencillamente no existiría y habría que reescribir esa parte como un cron externo.

#### ¿Y Vercel?

Es la pregunta que sale siempre, y merece un número concreto. Vercel es serverless, así que hereda todo lo anterior, pero además tiene un límite que zanja el asunto: **sus cron en el plan gratuito corren como máximo una vez al día.** No es una recomendación — un `*/15 * * * *` hace que el despliegue **falle**, con el mensaje *«Hobby accounts are limited to daily cron jobs»*. El cierre de tomas vencidas pasaría de quince minutos a veinticuatro horas, y con él el aviso al cuidador. Tenerlo cada quince minutos exige el plan Pro: **20 USD al mes**, casi el triple que Render.

Y hay que tocar código, cosa que en Render no hace falta:

- `cerrarTomasVencidas` **no tiene endpoint HTTP**; solo se invoca desde `main.ts`. Habría que escribirle uno y protegerlo con un secreto, o cualquiera desde internet podría dispararlo.
- `main.ts` dejaría de ser el punto de entrada: la aplicación de Express hay que envolverla como función.
- `pool.ts` abre un pool con `max: 10` por instancia. El serverless levanta muchas a la vez, así que habría que pasar a la cadena *pooled* de Neon para no agotar las conexiones.

Un detalle que conviene saber: el plan Hobby de Vercel es **solo para uso no comercial**. Un proyecto universitario cabe; un producto, no.

**Donde Vercel sí sería la elección correcta** es una eventual versión web de Chronova —un panel para que el cuidador entre desde el navegador—. Para servir una interfaz web es de lo mejor que hay. Para un servidor de Node que debe estar despierto y con un temporizador vivo, no.

### Dónde, con precios de septiembre de 2026

La foto ha cambiado bastante, así que las comparaciones de hace un año ya no sirven:

| Servicio | Capa gratuita | Siempre despierto |
|---|---|---|
| [Render](https://render.com) | **Sí**, 750 horas al mes, pero se duerme a los 15 min | **7 USD/mes** |
| [Railway](https://railway.app) | No. Solo 5 USD de prueba, que caducan | Según consumo, ~20 USD/mes |
| [Fly.io](https://fly.io) | **No** para cuentas nuevas desde octubre de 2024 | Desde 8 USD/mes |

Un aviso sobre esas comparaciones: casi todas suman el servidor **y** la base de datos, y dan cifras de 21 a 28 dólares. **En Chronova la base de datos ya está en Neon**, así que solo se paga el servicio web. Son 7 dólares, no 21.

### Por qué no la capa gratuita, aunque exista

El servicio gratuito de Render se apaga tras 15 minutos sin tráfico y tarda cerca de un minuto en despertar. Lo evidente es que un profesor abra la app, vea una rueda girando medio minuto y concluya que no funciona.

Pero hay una razón de fondo que pesa más, y sale del propio código: **si el servidor duerme, el temporizador no corre.** El cierre automático de tomas vencidas deja de ocurrir.

Y eso es justamente el aporte central del proyecto — lo que dibuja el diagrama 04, la transición `PENDIENTE → OMITIDA` disparada por el sistema. *«El olvido queda registrado aunque el paciente no haga nada»* se convierte en *«queda registrado cuando alguien abra la app»*, que es una afirmación distinta y más débil. Se salva a medias, porque el cierre también corre al arrancar y una petición que despierte al servidor pone al día lo atrasado; pero es exactamente el matiz que un jurado pregunta.

Si vas a enseñarlo en vivo, **paga el mes**. Son siete dólares y se cancela después.

### Camino A — Render, paso a paso (unos 30 minutos)

1. **Sube el código a GitHub**, si no está ya. Render se conecta al repositorio.
2. Crea la cuenta en [render.com](https://render.com) y elige **New → Web Service**, conectando ese repositorio.
3. Configura el servicio así — el proyecto tiene el backend y la app en la misma carpeta, y este es el punto donde más gente se equivoca:

   | Campo | Valor |
   |---|---|
   | Root Directory | `backend` |
   | Build Command | `npm install && npm run build` |
   | Start Command | `npm start` |
   | Health Check Path | `/api/salud` |
   | Instance Type | **Starter (7 USD)**, no Free |

4. **Variables de entorno**: las seis de arriba. El `JWT_SECRET` genéralo largo y distinto del de desarrollo — con `openssl rand -base64 48`, o cualquier cadena larga y aleatoria.
5. **Migra la base de datos desde tu computador**, no desde Render:

   ```bash
   cd backend
   npm run db:migrate
   ```

   Con el `.env` apuntando a Neon. Es idempotente —todo el esquema usa `IF NOT EXISTS`— así que se puede correr las veces que haga falta sin perder datos. Se hace desde tu equipo porque `db:migrate` usa `tsx`, que es una dependencia de desarrollo y puede no estar instalada en el servidor.
6. Cuando termine el despliegue, comprueba en el navegador que `https://<tu-servicio>.onrender.com/api/salud` responde `"estado":"ok"` y **`"persistencia":"postgres"`**. Si dice `memory`, la variable `PERSISTENCE` no llegó.
7. Cambia `apiUrl` en `mobile/app.json` por esa URL con **https**, y reinicia Expo con `npx expo start --clear`. Sin el `--clear` no toma la URL nueva: Expo hornea `extra` en el bundle al arrancar.

A partir de ahí, cada `git push` vuelve a desplegar solo.

### Camino B — Azure con crédito de estudiante (gratis, pero varias horas)

El **GitHub Student Developer Pack** da 100 USD de crédito en **Azure for Students** con el correo de la universidad. Ojo con un cambio reciente: el crédito de DigitalOcean, que era el más usado, **terminó el 1 de agosto de 2026** y retiraron incluso los créditos ya canjeados; Azure sigue vigente.

El costo real no es el dinero, es el tiempo. Sobre una máquina virtual hay que: instalar Node 20, clonar el repositorio y compilarlo, poner un proceso que lo mantenga vivo y lo reinicie solo (`pm2` o un servicio de systemd), montar un proxy inverso (nginx o Caddy) que reciba el tráfico y se lo pase a Node, **sacar el certificado HTTPS** (Caddy lo hace solo; con nginx es `certbot`), abrir los puertos 80 y 443 en el cortafuegos de Azure, y apuntar un dominio o usar el nombre que Azure asigne.

Son varias horas y hay pasos que fallan en silencio — un certificado mal renovado tumba la app semanas después sin avisar. A favor tiene que «montamos y configuramos el servidor» es defendible en una sustentación de ingeniería, y que no cuesta dinero.

**La recomendación honesta:** si el objetivo es que la sustentación salga bien, camino A. Si el objetivo es aprender a administrar un servidor y hay tiempo de sobra, camino B.

### Dos cosas que revisar antes de exponerlo a internet

Están documentadas en [REVISION-DE-CODIGO.md](REVISION-DE-CODIGO.md) y siguen pendientes porque hasta ahora nada era público:

- **M-1:** el guardarraíl que impide usar el `JWT_SECRET` de ejemplo solo se activa con `NODE_ENV` exactamente igual a `production`. Ponlo bien, y usa una clave larga y distinta de la de desarrollo.
- **G-6:** cualquier usuario autenticado puede reasignarse el token push de otro. Con usuarios reales esto sí importa.

---

## 3. Paso dos: que la app llegue a sus teléfonos

Con el servidor alojado, la app ya no depende de la red de nadie. Queda cómo la instalan.

### Opción A — Enlace de EAS (gratis, se puede hacer hoy)

```bash
cd mobile
eas build --profile preview --platform android
```

Al terminar, EAS da una **URL para compartir**. Cualquiera que la abra desde un Android descarga el APK e instala. No hay que registrar dispositivos ni pagar nada.

*Lo malo:* Android muestra la advertencia de "aplicación de origen desconocido". A un profesor eso le puede generar desconfianza, con razón.

### Opción B — Google Play, prueba interna (25 USD una vez) — **la recomendada**

Verificado en la documentación de Google: la regla de los **12 testers durante 14 días aplica solo para pasar a producción**, no a la prueba interna. Una cuenta nueva puede usar el canal de prueba interna de inmediato.

Cómo queda para el evaluador: recibe un correo o un enlace, lo abre, e **instala desde la Play Store como cualquier otra app**. Sin advertencias, sin APKs sueltos. Es lo que hace que el proyecto parezca terminado en vez de un experimento.

Pasos:

1. Crear la cuenta de desarrollador (25 USD, pago único).
2. Rellenar la ficha de la app y **la declaración de seguridad de datos**. Esto no es trámite menor: Chronova maneja datos de salud, y hay que declarar qué se recoge y para qué. Necesitas además una **política de privacidad publicada en una URL**.
3. `eas build --profile production --platform android` (genera el `.aab` que pide Google).
4. Subirlo al canal de **prueba interna** y añadir los correos de los evaluadores.

### Opción C — Producción, descarga pública

Es lo que hace falta para que cualquiera la busque y la instale. Exige antes la prueba cerrada con 12 testers durante 14 días seguidos. **No lo dejes para la semana de la sustentación:** son dos semanas de calendario que no se pueden acelerar.

### Y los iPhone

Otra historia y más cara: 99 USD al año. Para repartir fuera de la App Store hay que registrar el identificador de cada dispositivo uno por uno, o usar TestFlight.

Si entre los evaluadores hay alguien con iPhone, lo práctico es tener un Android de repuesto con la app instalada para que la pruebe ahí.

---

## 4. Un plan con fechas

Contando hacia atrás desde el día de la sustentación:

| Cuándo | Qué |
|---|---|
| **Cuando quieras, cuesta 0** | Desplegar en Render **en la capa gratuita**. Lo que puede fallar es el despliegue, no el pago: la compilación, una variable de entorno, el SSL de Neon. Descubrirlo con meses de margen es gratis; descubrirlo la última semana, no. Pasar a los 7 USD es después un clic, sin volver a desplegar |
| **1 mes antes** | Crear la cuenta de Play (25 USD, pago único, no caduca) y **empezar la verificación de identidad**. Ver el aviso de abajo. Publicar la política de privacidad |
| **2 semanas antes** | Subir el servicio de Render a **Starter** para que deje de dormirse. Cambiar `apiUrl` a la URL con HTTPS. Comprobar la app **con datos móviles, no con wifi**: es la prueba de que ya no depende de tu red |
| **1 semana antes** | Declaración de seguridad de datos. Compilar con `eas build --profile production` y subir a prueba interna |
| **3 días antes** | Enviar la invitación a los evaluadores y **pedirle a alguien ajeno que la instale**. Si falla, hay margen |
| **El día** | Ellos instalan desde Play Store. Tu portátil no pinta nada |

> **La verificación de identidad de Google bloquea más de lo que parece.** Tarda de **2 a 5 días hábiles**, y mientras tanto puedes subir compilaciones y armar la ficha pero **no publicar en ningún canal, ni siquiera en prueba interna**. Piden documento de identidad y un **comprobante de domicilio de los últimos 90 días**, con nombre y dirección coincidiendo exactamente entre los dos y con lo que escribas en el perfil; si algo no cuadra, lo rechazan y el reloj vuelve a empezar. Por eso la cuenta va un mes antes y no una semana antes.

**Plan B**, por si algo se tuerce: lleva el enlace de EAS en un código QR dentro de una diapositiva. Se instala en un minuto y no depende de la revisión de Google.

---

## 5. Lo que cuesta

| Concepto | Coste |
|---|---|
| Base de datos (Neon) | Gratis en su capa actual |
| Servidor que no se duerme | 7 USD al mes en Render, cancelable — o gratis en Azure con el crédito de estudiante, a cambio de varias horas de configuración |
| Cuenta de Google Play | 25 USD, pago único |
| Cuenta de Apple | 99 USD al año — solo si hace falta iPhone |

Mínimo realista para una sustentación digna: **unos 32 USD**, de los cuales 25 son de una sola vez. Con el crédito de Azure en lugar de Render, 25 USD y unas horas más de trabajo.

---

## 6. Respondiendo directamente a las dos preguntas

**"¿Siempre voy a tener que iniciarla desde mi PC?"**

No, y ese es exactamente el problema que resuelve el paso 1. Hoy sí, porque el servidor es tu portátil. Una vez alojado, la app funciona con tu computador apagado, desde cualquier red, para cualquier persona. Tú vuelves a ser solo quien la desarrolla.

**"¿Cómo la prueban ellos?"**

Con Google Play y su canal de prueba interna: les llega un enlace e instalan desde la tienda como cualquier app. Veinticinco dólares y sin la espera de los 12 testers, que solo aplica para la descarga pública.

Y hay algo que conviene notar: **nada de esto exige tocar el código**. Ni el dominio, ni los casos de uso, ni las pantallas. Es configuración y trámites. Que el paso de "corre en mi portátil" a "corre en internet" sea una variable de entorno y no una reescritura es, otra vez, la arquitectura pagando lo que prometía.
