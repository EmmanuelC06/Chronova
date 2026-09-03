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

### Dónde

| Servicio | Capa gratuita | De pago |
|---|---|---|
| [Render](https://render.com) | Sí, pero **el servicio se duerme** tras un rato inactivo | Desde unos 7 USD/mes |
| [Railway](https://railway.app) | Crédito mensual limitado | Según consumo |
| [Fly.io](https://fly.io) | Sí, con límites | Desde unos 5 USD/mes |

**Sobre la capa gratuita:** el servicio se apaga por inactividad y la primera petición tarda entre 30 y 60 segundos en despertarlo. Para desarrollar da igual. Para una sustentación es un desastre: el profesor abre la app, ve una rueda girando medio minuto y concluye que no funciona.

Si vas a enseñarlo en vivo, **paga el mes**. Son cinco o siete dólares y lo puedes cancelar después.

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
| **2 semanas antes** | Alojar el backend. Cambiar `apiUrl` a la URL con HTTPS. Comprobar la app **con datos móviles, no con wifi**: es la prueba de que ya no depende de tu red |
| **1 semana antes** | Cuenta de Play (25 USD). Política de privacidad publicada. Declaración de datos. Subir a prueba interna |
| **3 días antes** | Enviar la invitación a los evaluadores y **pedirle a alguien ajeno que la instale**. Si falla, hay margen |
| **El día** | Ellos instalan desde Play Store. Tu portátil no pinta nada |

**Plan B**, por si algo se tuerce: lleva el enlace de EAS en un código QR dentro de una diapositiva. Se instala en un minuto y no depende de la revisión de Google.

---

## 5. Lo que cuesta

| Concepto | Coste |
|---|---|
| Base de datos (Neon) | Gratis en su capa actual |
| Servidor que no se duerme | 5 a 7 USD al mes, cancelable |
| Cuenta de Google Play | 25 USD, pago único |
| Cuenta de Apple | 99 USD al año — solo si hace falta iPhone |

Mínimo realista para una sustentación digna: **unos 30 USD**, de los cuales 25 son de una sola vez.

---

## 6. Respondiendo directamente a las dos preguntas

**"¿Siempre voy a tener que iniciarla desde mi PC?"**

No, y ese es exactamente el problema que resuelve el paso 1. Hoy sí, porque el servidor es tu portátil. Una vez alojado, la app funciona con tu computador apagado, desde cualquier red, para cualquier persona. Tú vuelves a ser solo quien la desarrolla.

**"¿Cómo la prueban ellos?"**

Con Google Play y su canal de prueba interna: les llega un enlace e instalan desde la tienda como cualquier app. Veinticinco dólares y sin la espera de los 12 testers, que solo aplica para la descarga pública.

Y hay algo que conviene notar: **nada de esto exige tocar el código**. Ni el dominio, ni los casos de uso, ni las pantallas. Es configuración y trámites. Que el paso de "corre en mi portátil" a "corre en internet" sea una variable de entorno y no una reescritura es, otra vez, la arquitectura pagando lo que prometía.
