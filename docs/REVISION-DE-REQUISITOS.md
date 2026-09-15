# Revisión de requisitos · 15 de septiembre de 2026

> **Estado al cierre del día.** De lo que este documento encontró ya está corregido el
> bloque 1 entero y casi todo el bloque 2. Lo que queda, y por qué:
>
> | Punto | Estado |
> |---|---|
> | §1 Erratas de texto | Corregido |
> | §2 RF-02 parentesco, RF-06 fecha de inicio, RF-19 período | Corregido |
> | §3 RNF-02 contraste | Corregido (`textoTenue` a `#636F79`) |
> | §3 RNF-21 resiliencia | Corregido, y aparecieron **tres** puntos sin proteger, no dos |
> | §3 RNF-03, RNF-04, RNF-18 | Sin corregir: se reescribió el criterio del Entregable 1 para que diga la verdad |
> | §4.1 Panel del cuidador | Corregido |
> | §4.2 Correo duplicado | Corregido, pero **no como decía este documento**: ver la nota de esa sección |
> | §4.3 Scroll al error | Corregido |
> | §4.4 Derechos de la pantalla de privacidad | **En espera de la universidad** |
> | §4.5 Restablecimiento | Corregido |
> | §4.6 Cambiar la contraseña | Corregido |
> | §4.7 Confirmación simultánea | Sin corregir, en el bloque 3 |

Auditoría de los 59 requisitos del Entregable 1 contra el código que existe hoy, más una
búsqueda de huecos que ningún requisito cubre. Todo lo que dice este documento se comprobó
leyendo el código, no la documentación: cuando la documentación y el código no coincidían,
gana el código y aquí se dice cuál de los dos está desactualizado.

**Resultado en una línea:** 55 de 59 requisitos cumplen. Los 4 que no son huecos entre el
servidor y la app, no del servidor. Y hay siete cosas que ningún requisito pide y que un
jurado sí va a tocar.

| | Cumplen | Parciales | Sin cumplir |
|---|---|---|---|
| Funcionales (34) | 31 | 3 | 0 |
| No funcionales (25) | 20 | 5 | 0 |

Estado técnico verificado hoy: **194 pruebas en verde**, `tsc --noEmit` limpio en los dos
proyectos, el paquete de Android compila.

---

## 1. Lo primero, porque es lo más barato y lo más visible

Tres erratas en texto que el usuario lee. Se arreglan en dos minutos y son de las que un
jurado señala en voz alta.

| Dónde | Dice | Debe decir |
|---|---|---|
| `mobile/app/(paciente)/perfil.tsx:236` | `{perfil.edad} anos` | `años` |
| `mobile/app/(cuidador)/paciente/[id]/historial.tsx:72` | `Ultimos dias` | `Últimos días` |
| `mobile/app/(cuidador)/paciente/[id]/historial.tsx:73` | «Grafica de cumplimiento... en los ultimos... dias» | Es la etiqueta que lee TalkBack en voz alta |

La primera aparece en la pantalla de perfil de toda paciente que haya puesto su fecha de
nacimiento. En español, «anos» no significa años.

---

## 2. Requisitos funcionales que no cumplen del todo

Los tres son el mismo patrón: **el servidor lo soporta, la app no lo usa.** Es la clase de
hueco que no aparece en las pruebas, porque las pruebas llaman al servidor directamente.

### RF-02 · El parentesco del cuidador nunca se envía

`backend` lo acepta (`esquemas.ts:77`, `RegistrarCuidador.ts:56`) y `cuenta.tsx:76` lo
muestra si existe. Pero la pantalla de registro solo manda nombre, correo, contraseña y
teléfono (`registro.tsx:75-90`): nunca pide el parentesco. El campo `rol` que sí existe en
esa pantalla es el selector PACIENTE / CUIDADOR, otra cosa.

Resultado: el dato que el requisito exige no existe en ninguna cuenta, y el bloque de
`cuenta.tsx` que lo muestra es código muerto.

**Arreglo:** un campo de texto opcional en el registro de cuidador. Pequeño.

### RF-06 · La fecha de inicio de un tratamiento no se puede elegir

El formulario nunca envía `fechaInicio` (`FormularioDeMedicamento.tsx:152`), así que el
servidor siempre asume «hoy en la zona del paciente» (`RegistrarMedicamento.ts:73`). No hay
forma, desde la app, de registrar un tratamiento que empiece mañana o que empezó el lunes.

En el mismo formulario falta la frecuencia `CADA_N_DIAS`, que el dominio soporta
(`Frecuencia.ts`, intervalos de 1 a 90 días) y la interfaz no ofrece. Peor: si un
medicamento con esa frecuencia entra por la API, al editarlo desde la app se convierte en
otra cosa, porque el formulario no sabe representarlo.

**Arreglo:** selector de fecha de inicio, y la tercera opción de frecuencia. Medio.

### RF-19 · El período del historial no se puede elegir

`ConsultarHistorial` acepta `desde` y `hasta`, y la ruta también
(`routes/tomas.ts:56`). Pero ninguna pantalla los envía: `historial.tsx:37` llama a
`api.consultarHistorial()` sin argumentos y se queda con los 30 días por defecto. El
cuidador, igual. «Un período determinado» es cierto por API y falso por app.

**Arreglo:** tres botones (7 días / 30 días / 90 días) sobre el historial. Pequeño.

---

## 3. Requisitos no funcionales que no cumplen del todo

### RNF-02 · Un par de colores incumple el contraste 4.5:1

Este es el importante, porque el documento afirma que **todos** los pares cumplen y esa
afirmación no estaba respaldada por ningún cálculo en el repositorio. La calculé.

De 26 pares en uso real, **25 pasan** (10 de ellos con nivel AAA) y **uno falla**:

```
textoTenue #67737D sobre superficieSuave #EFF3F5  =  4.35:1   (mínimo exigido: 4.5)
```

No es hipotético: es exactamente `ESTILO_POR_NIVEL.SIN_DATOS` (`tema.ts:255-259`), que se
pinta en `historial.tsx:131` y en `pacientes.tsx:237`, y encima a 13 pt, donde la norma no
admite la excepción de texto grande.

**Arreglo, de una línea:** cambiar `textoTenue` de `#67737D` a `#636F79`. Comprobado:
sube ese par a 4.61:1 y mejora los otros dos usos de ese gris (sobre `fondo` pasa de 4.60 a
4.87; sobre `superficie`, de 4.86 a 5.15). Ningún par baja.

Y una segunda cosa: la preferencia `altoContraste` se valida, se persiste y viaja de
extremo a extremo en el backend, pero **ninguna pantalla la consume**. Activarla hoy no
cambia un solo color. O se implementa, o se retira del modelo.

### RNF-03 · El alto táctil mínimo no se aplica en todas partes

`ALTO_TACTIL_MINIMO = 64` está aplicado en 7 de los 8 elementos pulsables, que es mejor de
lo que suele verse. Falta en la `Tarjeta` pulsable (`basicos.tsx:265`), donde en la práctica
el contenido ya supera los 64 px. Las barras de pestañas van a `height: 76` escrito a mano y
no escalan con la preferencia de tamaño de letra: con la letra en «muy grande», el texto de
las pestañas crece y la barra no.

### RNF-04 · El nivel de adherencia se comunica con color y palabra, sin icono

Los estados de toma sí llevan icono y palabra (`tema.ts:212-237`). Pero `ESTILO_POR_NIVEL`,
el de la adherencia, no tiene campo `icono`. No es «solo color», porque la palabra está,
pero no cumple la letra del requisito. Añadir tres iconos es trivial.

### RNF-18 · Hay SQL fuera del archivo único

Los repositorios sí concentran todo su SQL en `repositoriosPostgres.ts`. Pero hay SQL en
`esquema.sql` (que es DDL, y está bien que viva aparte) y un `SELECT` escrito a mano en
`infrastructure/notificaciones/probar.ts:156`. El requisito, tal como está redactado, no lo
admite. O se mueve ese SELECT, o se redacta el requisito como lo que de verdad se quiso
decir: «todo el SQL de acceso a datos».

### RNF-21 · La resiliencia funciona por suerte, no por diseño

Los adaptadores de notificación se tragan sus propios errores, así que hoy el requisito se
cumple. Pero los casos de uso no se protegen: `RegistrarToma.ts:108` y
`CerrarTomasVencidas.ts:89` hacen `await this.notificador.enviar(...)` sin `try/catch`. El
día que un notificador lance una excepción, la toma quedará guardada y el paciente verá un
error. La toma se guarda antes de notificar, que es lo correcto, pero la respuesta miente.

**Arreglo:** envolver esas dos llamadas. Pequeño, y convierte una casualidad en una garantía.

---

## 4. Huecos que ningún requisito cubre

Ordenados por lo que le costaría a un evaluador encontrarlos.

### 4.1 El panel del cuidador dice «no acompañas a nadie» cuando lo que falla es la red

`pacientes.tsx:32` arranca en `[]` en vez de `null`. Si la petición falla, la pantalla pinta
a la vez el mensaje de error y el estado vacío «Todavía no acompañas a nadie».

Es exactamente el fallo que ya se corrigió, con comentarios largos explicándolo, en
`medicamentos.tsx:28-37`, `historial.tsx:67-71` y `perfil.tsx:69-76`. Esta pantalla se quedó
fuera, y es **la primera que se ve al entrar como cuidador**. Arreglo pequeño.

### 4.2 Un mismo correo puede registrarse como paciente y como cuidador

> **Corrección a este hallazgo.** Al ir a arreglarlo apareció una prueba, en
> `casosDeUso.test.ts`, que comprueba explícitamente que un mismo correo abra las dos cuentas
> y que el inicio de sesión las distinga por `tipo`. O sea que **no era un descuido, era una
> decisión**: una hija que acompaña a su madre y que además sigue su propio tratamiento es un
> caso real. Prohibirlo habría sido quitar una función.
>
> El defecto verdadero era más estrecho: la app nunca envía `tipo`, así que el servidor
> siempre devolvía la cuenta de paciente. Lo corregido es eso: cuando la contraseña abre las
> dos cuentas, el servidor deja de elegir por su cuenta y responde `CUENTA_AMBIGUA`, y la app
> pregunta con cuál entrar. Si las contraseñas son distintas no pregunta nada, porque la
> propia contraseña ya lo dice.

`RegistrarPaciente` solo comprueba la tabla de pacientes (`:76`) y `RegistrarCuidador` solo
la de cuidadores (`:45`). Al iniciar sesión sin indicar tipo, se busca **siempre paciente
primero** (`IniciarSesion.ts:77`), y la app nunca envía el tipo.

Consecuencia: si alguien se registra como cuidador y después como paciente con el mismo
correo, la cuenta de cuidador queda inalcanzable para siempre. Ni siquiera recuperar la
contraseña la rescata, porque `SolicitarRecuperacion.ts:113` usa el mismo orden.

Es fácil que pase en la sustentación: un jurado que quiera probar los dos roles usará su
propio correo las dos veces. Arreglo medio.

### 4.3 Los errores de formulario se pintan arriba y el botón está abajo

`setError()` renderiza el aviso en la primera posición del `ScrollView` y nadie hace scroll.
En el formulario de medicamento el usuario está al final, toca «Guardar» y el mensaje
aparece dos pantallazos más arriba: el botón parece muerto. En el registro es peor, porque
entre la casilla y el botón hay tres botones de «Leer...».

Arreglo pequeño: un `ref` al `ScrollView` y `scrollTo({ y: 0 })` en cada `setError`.

### 4.4 La pantalla de privacidad promete tres derechos que la app no puede ejercer

`privacidad.tsx:102-112` dice «Muchas de estas cosas las haces tú mismo, sin pedirle permiso
a nadie ni esperar respuesta» y lista:

- **«Corregir tus datos, desde Mi cuenta»** · `perfil.tsx:229-239` solo los muestra. No hay
  campo editable ni ruta HTTP de actualización de perfil. `Paciente.actualizarPerfil` existe
  en el dominio y no lo llama nadie.
- **«Pedir que borremos tu cuenta y toda tu información»** · no existe endpoint de borrado.
- **«Retirar esta autorización»** · tampoco existe.

Confirmado contando las rutas: hay 22, y ninguna edita el perfil ni borra una cuenta.

Esto importa más que un fallo técnico, porque es la parte del proyecto que se apoya en la
Ley 1581 y **la política que acabamos de escribir promete esos derechos**. Un jurado que lea
la pantalla y toque «Mi cuenta» encuentra la contradicción en dos toques.

Hay dos salidas honestas y hay que elegir una:

1. **Implementar** la edición de perfil y el borrado de cuenta. Grande, pero cierra el
   círculo del capítulo legal, que es el punto más fuerte del proyecto.
2. **Reescribir esas tres líneas** para que digan lo que de verdad pasa: que se piden por
   correo a la oficina de protección de datos. Pequeño, y deja de prometer lo que no hay.

La opción 1 es mejor proyecto. La 2 es mejor que mentir.

### 4.5 Si falla el último paso del restablecimiento, la app dice lo contrario de lo que pasó

`recuperar.tsx:73-88` mete `restablecerContrasena` y `iniciarSesion` en el **mismo `try`**.
Si la contraseña se cambia y el inicio de sesión falla (un corte de red de un segundo), el
usuario ve «No pudimos cambiar tu contraseña». Vuelve a intentarlo con el mismo código, que
ya se consumió, y se queda fuera de su cuenta creyendo que la contraseña vieja sirve.

Arreglo pequeño: separar los dos `try`. Si falla el segundo, mandar a la pantalla de ingreso
con «tu contraseña ya está cambiada, entra con ella».

### 4.6 No se puede cambiar la contraseña desde dentro de la app

La única forma es cerrar sesión, «olvidé mi contraseña», esperar un código de seis dígitos
por correo y teclearlo. Para una persona de 74 años eso es una barrera real, y para un
evaluador es la primera pregunta de la lista. Arreglo medio.

### 4.7 Confirmar la misma toma a la vez desde dos teléfonos descuenta el inventario dos veces

`RegistrarToma` es leer, modificar, escribir, sin bloqueo ni versión, y
`repositoriosPostgres.ts:369` hace `ON CONFLICT (id) DO UPDATE` incondicional. Compárese con
`programarSiNoExisten` (línea 418), que sí usa `DO NOTHING`.

Matiz importante, comprobado en el dominio: **secuencialmente esto no pasa**, porque
`Toma.confirmar` llama a `asegurarQueNoEstaResuelta` y lanza. Solo ocurre con dos peticiones
realmente simultáneas, las dos leyendo la toma todavía PENDIENTE. Es el caso del paciente y
su hija confirmando a la vez, que en esta app no es rebuscado.

Además, `tomas.guardar` y `medicamentos.guardar` no están en una transacción común: si la
segunda falla, la toma queda confirmada y el inventario sin descontar.

Arreglo medio: añadir `WHERE tomas.estado = 'PENDIENTE'` al `DO UPDATE`.

---

## 5. Cosas que están mejor de lo que el documento dice

Hay que actualizar el Entregable 1, porque en tres puntos se quedó corto:

- **RNF-12 figura como «Parcial»** por falta de una prueba de carga reproducible. Ya existe:
  `npm run rendimiento`, siete escenarios con percentiles. La agenda del día da p50 72,9 ms,
  p95 89,8 ms y p99 126,6 ms, muy por debajo de los 200 ms exigidos. **Es un CUMPLE.**
- **RNF-17 dice «166 pruebas, 20 de ellas por HTTP»**. Hoy son **194**, más 4 de extremo a
  extremo contra PostgreSQL real que no existían cuando se escribió el documento.
- **RF-23** dice que el vínculo lo puede iniciar cualquiera de las dos partes, y es verdad,
  pero el documento no menciona un detalle de diseño que conviene saber defender: si lo
  inicia el paciente nace ACEPTADO, y si lo inicia el cuidador queda PENDIENTE. Tiene
  sentido (el paciente es el dueño de sus datos) y es una buena respuesta si lo preguntan.

También conviene tener a mano, porque es lo más sólido del proyecto y no está en ningún
requisito: la agenda es idempotente con respaldo en la base de datos, las fechas imposibles
se rechazan en el dominio, el inicio de sesión usa un hash señuelo contra ataques de
temporización, el código de recuperación tiene cinco intentos y treinta minutos, y la
cobertura de `accessibilityLabel` en elementos pulsables es del **100 %**, no aproximada.

---

## 6. Qué haría yo, en este orden

**Antes de la próxima demostración** (todo junto, unas pocas horas):

1. Las tres erratas de la sección 1.
2. `textoTenue` a `#636F79`, y queda cerrado RNF-02.
3. El estado vacío del panel del cuidador (4.1).
4. El scroll al error en los formularios (4.3).
5. El `try` separado del restablecimiento (4.5).
6. Decidir qué se hace con la pantalla de privacidad (4.4). Aunque sea la opción barata.

**Antes de la sustentación:**

7. Elegir período en el historial (RF-19) y fecha de inicio en el medicamento (RF-06): son
   dos requisitos propios que hoy están a medias, y se ven en la demostración.
8. El parentesco del cuidador (RF-02).
9. El correo duplicado entre paciente y cuidador (4.2), porque el jurado puede provocarlo.
10. Cambiar la contraseña desde dentro (4.6).
11. Envolver las notificaciones en `try/catch` (RNF-21).
12. Actualizar el Entregable 1 con las cifras de la sección 5.

**Si sobra tiempo:** el bloqueo por estado en la confirmación de tomas (4.7), los iconos del
nivel de adherencia (RNF-04), y decidir si `altoContraste` se implementa o se retira.

**Lo que NO haría ahora:** exportación de datos, límite de intentos en el inicio de sesión y
alarmas en segundo plano. Son reales, pero ninguna se ve en una sustentación y las tres
tienen más sentido cuando haya alojamiento con HTTPS, que sigue siendo lo que bloquea todo
lo demás.
