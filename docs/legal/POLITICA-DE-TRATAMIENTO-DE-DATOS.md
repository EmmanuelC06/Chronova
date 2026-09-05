# Política de Tratamiento de Datos Personales — Chronova

**Versión 1.0 · Vigente desde el [FECHA DE PUBLICACIÓN]**

> ⚠️ **Antes de publicar esto, léelo.**
>
> Este documento lo redactó Claude a partir de la Ley 1581 de 2012 y del código real de
> Chronova, y describe con exactitud lo que la aplicación hace hoy. Pero **no es asesoría
> jurídica**: quien lo escribió no es abogado. Antes de publicarlo, dos cosas:
>
> 1. **Completar los campos entre corchetes.** Están señalados uno por uno más abajo.
> 2. **Que lo revise alguien con formación jurídica** — la asesoría legal de la
>    universidad, o el docente que corresponda. Chronova trata datos de salud, que la
>    ley clasifica como **sensibles**, y ahí las consecuencias de equivocarse no son
>    académicas.

---

## 1. Responsable del tratamiento

| Campo | Valor |
|---|---|
| Responsable | **[POR DEFINIR — ver la nota de abajo]** |
| Documento de identificación / NIT | **[POR COMPLETAR]** |
| Domicilio | **[POR COMPLETAR]** — Medellín, Colombia |
| Correo para ejercer derechos | **[POR COMPLETAR]** |
| Teléfono | **[POR COMPLETAR]** (opcional, pero conviene) |

> **La pregunta que hay que hacerle a la profesora, en estos términos:**
>
> *«Chronova recoge datos de salud de personas reales durante las pruebas de usabilidad.
> Para la Política de Tratamiento necesitamos saber quién figura como Responsable del
> Tratamiento: ¿los estudiantes como personas naturales, o la Universidad Católica Luis
> Amigó como institución? Si es la universidad, ¿a quién le corresponde autorizarlo y qué
> correo de contacto usamos para las peticiones de los titulares?»*
>
> Por qué importa, en corto: si el responsable son ustedes dos como personas naturales,
> la responsabilidad legal es suya y **no hay obligación de registrar la base de datos en
> el RNBD** —esa obligación recae sobre personas jurídicas y entidades públicas, no sobre
> personas naturales—. Si el responsable es la universidad, la decisión no es de ustedes,
> y la institución sí puede tener obligaciones de registro y procedimientos propios que
> hay que seguir.
>
> Mientras no esté resuelto, **no publiques este documento con un responsable inventado.**
> Un responsable falso es peor que no tener política.

---

## 2. Qué es Chronova y para qué trata datos

Chronova es una aplicación móvil que ayuda a personas —principalmente adultos mayores con
tratamientos prolongados— a recordar y registrar la toma de sus medicamentos, y permite
que un cuidador autorizado por el propio paciente acompañe ese seguimiento.

El tratamiento de datos tiene **estas finalidades y ninguna otra**:

1. **Crear y sostener la cuenta** del paciente o del cuidador, y autenticarla.
2. **Generar la agenda diaria de tomas** a partir del tratamiento que el propio paciente
   registra, en su zona horaria.
3. **Registrar el cumplimiento** de cada toma y calcular indicadores de adherencia.
4. **Emitir recordatorios** en el teléfono del paciente a la hora de cada toma.
5. **Avisar al cuidador** que el paciente haya autorizado, cuando una toma queda sin
   confirmar.
6. **Permitir la recuperación de la contraseña** mediante un código enviado al correo.
7. **Ajustar la accesibilidad** de la interfaz (tamaño de letra, alertas) según lo que el
   paciente elija.

**Lo que Chronova NO hace con los datos**, y conviene decirlo explícitamente:

- No se venden, alquilan ni ceden a terceros con fines comerciales.
- No se usan para publicidad, perfilamiento comercial ni segmentación.
- No se comparten con aseguradoras, EPS, empleadores ni entidades financieras.
- No se usan para tomar decisiones automatizadas que produzcan efectos jurídicos sobre
  el titular. Los indicadores de adherencia son informativos: **no son un diagnóstico ni
  una recomendación médica.**

---

## 3. Qué datos se recogen

### 3.1 Datos de identificación y contacto

| Dato | ¿Obligatorio? | Para qué |
|---|---|---|
| Nombre | Sí | Identificar la cuenta y personalizar la interfaz |
| Correo electrónico | Sí | Iniciar sesión, recuperar la contraseña, vincular con un cuidador |
| Contraseña | Sí | Autenticación. **Se guarda cifrada con bcrypt, nunca en texto claro** |
| Teléfono | No | Contacto, si el titular lo aporta |
| Fecha de nacimiento | No | Ninguna función depende de ella; solo se muestra la edad en el perfil |
| Zona horaria | Sí (la toma el teléfono) | Que «las 8:00» sean las 8:00 donde vive el paciente |
| Rol o parentesco (cuidador) | No | Que el paciente sepa quién le solicita acceso |

### 3.2 Datos sensibles: información de salud

**Estos son datos sensibles** en los términos del artículo 5 de la Ley 1581 de 2012, que
incluye expresamente los datos «relativos a la salud».

| Dato | Qué contiene |
|---|---|
| Medicamentos | Nombre, dosis y unidad, frecuencia, horarios, fechas de inicio y fin, instrucciones e inventario |
| Tomas | Hora programada, estado (tomada, no tomada, pospuesta, pendiente), cuándo se resolvió, quién la registró, observaciones |
| Indicadores de adherencia | Porcentaje de cumplimiento y puntualidad, calculados a partir de lo anterior |

**Consecuencias legales de que sean sensibles**, que esta política asume:

- Su tratamiento exige **autorización explícita** del titular (art. 6, lit. a).
- **Ninguna persona está obligada a autorizar** el tratamiento de datos sensibles
  (art. 6, parágrafo). Quien no quiera autorizarlo, sencillamente no puede usar la
  aplicación — porque sin ellos no hay nada que Chronova pueda hacer.
- El titular tiene derecho a **no responder** preguntas sobre datos sensibles, y así se
  le informa al recogerlos.

### 3.3 Datos técnicos

| Dato | Para qué |
|---|---|
| Identificador de notificaciones del dispositivo | Enviar los avisos al teléfono correcto |
| Plataforma (Android / iOS) | Adaptar el formato del aviso |
| Fechas de creación, actualización y último uso | Funcionamiento y seguridad de la cuenta |

Chronova **no recoge** ubicación, contactos, cámara, micrófono, identificadores
publicitarios ni datos biométricos.

---

## 4. Quién puede ver los datos de un paciente

Este es el punto en el que conviene ser preciso, porque es lo que distingue a Chronova de
una aplicación que comparte información sin más.

**El paciente es el dueño de sus datos y controla cada acceso, uno por uno.**

Un cuidador **no ve nada** hasta que el paciente acepta el vínculo. Aceptado el vínculo,
lo que puede ver o hacer depende de cuatro permisos independientes que el paciente
enciende y apaga desde su perfil cuando quiera:

| Permiso | Qué habilita | Por defecto |
|---|---|---|
| Ver el tratamiento | Medicamentos, agenda e historial de adherencia | Concedido |
| Registrar tomas | Confirmar u omitir una toma en nombre del paciente | **Denegado** |
| Gestionar medicamentos | Registrar, modificar, suspender y reabastecer | **Denegado** |
| Recibir alertas | Aviso cuando una toma queda sin confirmar | Concedido |

Los dos permisos que permiten **actuar** sobre el tratamiento nacen desactivados a
propósito: cambiar la medicación de otra persona es la acción más delicada del sistema, y
el paciente la concede deliberadamente o no la concede.

**El paciente puede revocar el acceso completo en cualquier momento**, sin dar
explicaciones y sin que el cuidador pueda impedirlo.

---

## 5. Encargados del tratamiento y transferencia internacional

Chronova se apoya en proveedores que actúan como **encargados del tratamiento**. Esto
importa, y hay que decirlo con claridad porque **algunos están fuera de Colombia**:

| Proveedor | Para qué | Dónde están sus servidores |
|---|---|---|
| Neon | Base de datos | **[POR COMPLETAR: verificar la región en el panel de Neon]** |
| Expo (Expo Application Services) | Entrega de notificaciones al teléfono | Estados Unidos |
| [Proveedor de alojamiento] | Servidor de la aplicación | **[POR COMPLETAR cuando se contrate]** |
| [Proveedor de correo] | Envío del código de recuperación | **[POR COMPLETAR]** |

> **Esto es una transferencia internacional de datos** y el artículo 26 de la Ley 1581 la
> prohíbe hacia países que no ofrezcan garantías adecuadas, **salvo que el titular haya
> otorgado su autorización expresa e inequívoca**. Por eso la casilla de autorización de
> la aplicación lo menciona explícitamente: sin esa mención, la autorización no cubriría
> el hecho de que los datos salen del país.
>
> **Verifica la región de tu base de datos en Neon antes de publicar esto.** No lo des por
> supuesto: es un dato concreto que está en el panel.

Una decisión de diseño que vale la pena conocer: **las notificaciones que salen hacia
Expo no llevan el nombre del medicamento.** Dicen que una toma quedó sin confirmar y
cuántas, nada más. El nombre del medicamento sí aparece en la alarma local del teléfono
del paciente, que nunca sale del dispositivo.

---

## 6. Derechos del titular

Conforme al artículo 8 de la Ley 1581 de 2012, quien aparece en estos datos puede:

- **Conocer** sus datos y acceder a ellos de forma gratuita.
- **Actualizar y rectificar** los datos inexactos, incompletos o desactualizados.
- **Solicitar prueba de la autorización** que otorgó. Chronova guarda la versión del
  documento aceptado y la fecha exacta, y el titular puede consultarlas desde la propia
  aplicación, en *Mi cuenta → Mis datos y privacidad*.
- **Ser informado** sobre el uso que se le ha dado a sus datos.
- **Presentar quejas ante la Superintendencia de Industria y Comercio** por infracciones
  a la ley.
- **Revocar la autorización y solicitar la supresión** de sus datos, salvo que exista un
  deber legal o contractual de conservarlos.

### Cómo ejercerlos

Escribiendo a **[CORREO POR COMPLETAR]**, indicando el nombre, el correo con el que se
registró y la petición concreta.

**Plazos** (los que fija el Decreto 1074 de 2015):

- **Consultas:** respuesta en un máximo de **10 días hábiles**. Si no fuera posible,
  se informa el motivo y se atiende en máximo **5 días hábiles** más.
- **Reclamos:** respuesta en un máximo de **15 días hábiles**. Si no fuera posible,
  se informa el motivo y se atiende en máximo **8 días hábiles** más.

Buena parte de estos derechos no requieren escribir a nadie: desde la propia aplicación se
puede corregir el perfil, cambiar los permisos de cada cuidador, revocar un acceso y
suspender un tratamiento.

---

## 7. Seguridad

Medidas que están efectivamente implementadas y son verificables en el código:

- **Las contraseñas se guardan cifradas** con bcrypt. No se almacenan en texto claro y no
  se pueden recuperar, ni siquiera por quien administra el sistema.
- **Los códigos de recuperación se guardan cifrados** igual que una contraseña, caducan a
  los 30 minutos, sirven una sola vez y admiten cinco intentos.
- **Cada petición se autentica** con un token firmado. Cambiar la contraseña invalida de
  inmediato todas las sesiones abiertas.
- **Toda consulta a la base de datos usa parámetros**, lo que cierra la vía de inyección
  SQL.
- **Cada acceso a datos de un paciente pasa por un punto único de control** que verifica
  el vínculo y el permiso concreto.
- **La comunicación viajará cifrada (HTTPS)** una vez el servidor esté alojado.

> **Estado actual, dicho sin adornos:** mientras el servidor corra en un computador
> personal dentro de una red local, y mientras la comunicación no sea HTTPS, **la
> aplicación no debe usarse con datos de salud de personas reales**. Para las pruebas de
> usabilidad hay dos caminos honestos: usar datos ficticios, o completar antes el
> alojamiento con HTTPS y el consentimiento informado por escrito de cada participante.

---

## 8. Vigencia y cambios

Esta política rige desde **[FECHA]** y se mantiene vigente mientras Chronova esté en
funcionamiento.

Las bases de datos se conservarán mientras la cuenta esté activa. **Al solicitar la
supresión, los datos se eliminan** salvo obligación legal de conservarlos.

Los cambios sustanciales se comunicarán dentro de la aplicación **antes** de que entren en
vigor, y cada versión de este documento lleva su número y su fecha. Las versiones
anteriores se conservan en el repositorio del proyecto, de modo que siempre se pueda saber
qué texto aceptó cada persona y cuándo.

---

## Anexo — Historial de versiones

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | [PENDIENTE] | Versión inicial |
