# Qué puede hacer Chronova que no haga ninguna otra app

Documento de decisión para Emmanuel y Julián · 27 de septiembre de 2026

El profesor pidió un objeto diferenciador. La primera idea fue meter inteligencia artificial,
y la duda era si un recomendador con temas médicos es demasiado arriesgado. Lo es. Pero el
problema de fondo no es la IA, y conviene entender por qué antes de elegir.

Todo lo que dice este documento sale de investigar la literatura reciente y la normativa
colombiana. Las fuentes están al final, con enlaces.

---

## 1. Lo que hay que entender antes de elegir

### 1.1 La línea no es «¿usa IA?»

Es esta:

> **¿El sistema dice algo sobre el tratamiento o la enfermedad, o solo sobre la conducta del
> usuario con sus propios datos?**

En Colombia, el **Decreto 4725 de 2005** define en su artículo 2 el dispositivo médico
incluyendo expresamente el **software**, y lo define **por la finalidad prevista**. INVIMA lo
confirma en sus preguntas frecuentes: *un software es dispositivo médico dependiendo del uso,
aplicación y finalidad prevista establecida por el fabricante*. No hay una lista de apps
prohibidas. Hay un examen de intención, y esa intención la fijan ustedes con lo que escriban
en la app, en la tienda y en el póster.

Detectar que sueles olvidar la toma de la noche los domingos es **conductual**: está fuera.
Sugerir que cambies ese horario es una **directiva terapéutica**: está dentro. La misma
tecnología, dos lados de la línea, y lo que las separa es una frase.

### 1.2 El caso que conviene conocer

**SeniorLife Technologies**, carta de advertencia de la FDA del 21 de agosto de 2025. Una app
de IA para adultos mayores y sus cuidadores. Misma población que Chronova, mismo par
paciente-cuidador. Ofrecía un test de mirada de cinco minutos para «detectar signos tempranos
de Alzheimer» y un «prediagnóstico rápido». La FDA la declaró dispositivo no autorizado y
adulterado.

Lo que cruzó la línea fue **una frase de marketing**, no una funcionalidad.

Hay un segundo caso que vale para el lado ético, que es el que juzga un jurado universitario:
**Tessa**, el chatbot de la National Eating Disorders Association, retirado en junio de 2023
por dar consejos de dieta a personas con trastornos alimentarios. Nadie lo diseñó para eso.
Derivó solo.

### 1.3 El dato que justifica todo el ejercicio

Conviene que lo digan ustedes antes de que lo diga el profesor.

El ensayo más grande que existe sobre recordatorios de medicamentos, con **46.581 personas**,
midió una mejora de adherencia de **0,95 puntos porcentuales**. Un punto. Y lo poco que movió
la aguja fueron los brazos **interactivos**, no el recordatorio simple.

En la misma línea, una revisión sistemática específica de mayores de 65 años (35 artículos,
22 ensayos controlados) encontró que **solo la mitad** reportó mejora, con certeza de la
evidencia de muy baja a moderada. Y su conclusión operativa es la frase que deberían citar:
*las intervenciones que usaron múltiples funcionalidades o estrategias de apoyo al cambio de
comportamiento fueron las más propensas a mejorar la adherencia*.

Traducido: **una app de recordatorios, por bien hecha que esté, no sirve de mucho.** Eso no
es una crítica a Chronova. Es el argumento que justifica que busquen otra cosa, y es mucho
mejor entrar a la sustentación diciéndolo que esperando a que lo pregunten.

### 1.4 Algo que ya tienen y no están vendiendo

En el ensayo clínico de **Medisafe**, que es la app líder del mercado, de 32 participantes
**solo 1** usó la función de cuidador. Una. Y solo 3 abrieron el contenido educativo, aunque
el 40% dijera que sí.

Las funciones de cuidador existen en todas partes y **nadie las usa**, porque están diseñadas
como vigilancia: un rol administrador que mira por encima del paciente. El modelo de
Chronova, donde el paciente concede permiso por permiso y revoca cuando quiere sin dar
explicaciones, es la respuesta a un fracaso documentado.

Eso no hay que programarlo. **Ya está construido.** Hay que nombrarlo.

---

## 2. Las ocho ideas

Ordenadas por lo que aportan dividido entre lo que cuestan. Las tres primeras son módulos de
verdad; de la cuarta en adelante hay varias que son decisiones de diseño y no trabajo nuevo,
y lo digo en cada una.

---

### Idea 1 · El medicamento que no te entregaron

**Qué es.** Chronova registra qué te formularon frente a qué te entregaron de verdad. Lo que
falta queda como «pendiente», arranca un contador de 48 horas, y al vencerse la app genera el
texto de reclamación con las fechas, el punto de dispensación y la cantidad faltante.

**Por qué.** La adherencia tiene dos formas de fallar: que se te olvide, o que no tengas la
pastilla. Todas las apps del mundo atacan la primera. En Colombia, según la encuesta de la
Defensoría del Pueblo de 2026 sobre 2.042 usuarios:

| | |
|---|---|
| Reportó problemas para acceder a sus medicamentos | **87%** |
| Tuvo que comprarlos con dinero propio | **46%** |
| No logró obtenerlos en absoluto | **20%** |

Y desde mayo de 2026 existe un plazo exigible: la **Circular 017 del MinSalud** obliga a
entregar a domicilio en **48 horas** lo que quedó pendiente, permite reclamar en otro punto
autorizado, y obliga a las EPS a reportar el desabastecimiento.

Ese «48 horas» es un reloj. Ese «pendiente» es un estado. Un reloj y una máquina de estados
son exactamente lo que un software sabe llevar, y **ninguna app internacional modela un
sistema de aseguramiento**, porque ninguna está pensada para Colombia.

**Esfuerzo.** Medio. Una entidad nueva (dispensación), una máquina de estados con fechas, y
una pantalla. Nada de esto toca el dominio existente.

**Riesgo clínico.** Ninguno. No dice nada sobre el tratamiento.

**En la sustentación.** «El 20% de los pacientes colombianos no recibe su medicamento. Ese
paciente tiene 0% de adherencia y ninguna app se entera, porque todas asumen que la pastilla
está en la casa.»

---

### Idea 2 · Mapa de riesgo de olvido por franja

**Qué es.** Estimar la probabilidad de olvido por celda (franja horaria × día de la semana ×
medicamento × racha previa) y reforzar **solo** donde hace falta, callándose en el resto.

**Por qué.** Hay un trabajo, **AIMI** (Smart Health, 2024), que predice si alguien olvidará
una toma en la próxima hora. Su resultado más útil para ustedes es la tabla de ablación:

| Variables usadas | F1 |
|---|---|
| Solo sensores de alta resolución (acelerómetro, GPS) | 0,442 |
| Sensores + horario prescrito e historial | **0,936** |
| Ubicación + horario prescrito | 0,930 |

Es decir: **el poder predictivo está en la hora, el día, el historial y el horario prescrito,
no en los sensores.** Ustedes ya tienen las cuatro cosas en la base de datos.

**La advertencia, que hay que respetar.** En ese mismo trabajo, los modelos entrenados con un
solo usuario dieron F1 entre **0,24 y 0,45**: inestables. Y un estudio de 2026 con 117 adultos
mayores encontró que el modelo personalizado **perdió** frente al no personalizado en
validación retenida. Con tres meses de una persona que toma dos medicamentos dos veces al día
tienen unos 360 eventos repartidos en 28 celdas: trece observaciones por celda. Eso da para
una tasa con **suavizado bayesiano**, que es interpretable y se explica en una diapositiva. No
da para una red neuronal.

**Cómo llamarlo.** *Detección de patrones*, no IA predictiva. Es más honesto, es más
defendible, y nadie puede tumbarlo preguntando con qué datos lo validaron.

**Esfuerzo.** Medio. La matemática es corta; el trabajo está en la interfaz y en generar datos
sintéticos para validarlo.

**Riesgo clínico.** Bajo, siempre que el hallazgo se enuncie en conducta («olvidas la toma de
la noche») y no en enfermedad («tu tensión se descontrola»).

**En la sustentación.** «No predecimos su salud. Detectamos cuándo esta persona concreta
suele olvidarse, y reforzamos solo ahí, para no gastar su atención en los momentos en que no
hace falta.»

---

### Idea 3 · Días de existencias y semáforo de reposición

**Qué es.** Calcular la fecha en que se te acaba cada medicamento, a partir del esquema y de
lo que **realmente** te entregaron, y avisar con antelación para empezar el trámite antes de
que haya un hueco, no después.

**Por qué.** Es el complemento natural de la idea 1, y se apoya en lo mismo: en Colombia la
interrupción por suministro llega antes que la interrupción por olvido. La revisión de
aprendizaje automático sobre no adherencia encontró además que los predictores más potentes
son los de resurtido.

**Esfuerzo.** Pequeño. Chronova ya lleva inventario y ya descuenta al confirmar una toma.
Esto es sobre todo aritmética de fechas y una pantalla.

**Riesgo clínico.** Ninguno.

---

### Idea 4 · Anclaje a rutinas en vez de horas de reloj

**Qué es.** Que la toma se defina como «después del desayuno» o «cuando me cepillo los
dientes», con una ventana en lugar de un instante, y que la app aprenda a qué hora ocurre de
verdad esa rutina en esa persona.

**Por qué.** Es de las pocas recomendaciones que la literatura hace de forma explícita: anclar
la toma a una actividad rutinaria diaria. Y el dato de mercado: **Round Health**, la única app
que ofrecía recordatorio por ventanas en vez de horas exactas, **está descontinuada**. La idea
está libre.

**Esfuerzo.** Medio, y toca el corazón del dominio (la generación de la agenda), que es la
parte mejor probada de Chronova. Ese es el argumento en contra.

**Riesgo clínico.** Ninguno.

---

### Idea 5 · Escalado gradual, y al cuidador se le da el patrón

**Qué es.** Avisar primero al paciente. Si falla, un segundo aviso para él solo. Solo después
de varios fallos **en una celda de riesgo** se escala al cuidador, y cuando se escala se le
entrega **el patrón, no el fallo aislado**: «las tomas de la noche del fin de semana se están
cayendo desde hace tres semanas».

**Por qué.** La implicación del cuidador sube la adherencia de forma notable, pero la
literatura advierte que los cuidadores informales *carecen de formación formal o de apoyo
adecuado*. En Colombia, el 83,9% son mujeres, el 61% son hijas o hijos, el 76,1% conviven con
la persona, y la mayoría no tiene ninguna formación. Decirle a esa persona «falló una toma»
no la ayuda. Decirle qué patrón está viendo, sí.

**Esfuerzo.** Pequeño **si ya existe la idea 2**, porque necesita las celdas de riesgo. Por sí
sola no tiene mucho sentido.

**Riesgo clínico.** Ninguno, mientras la sugerencia de apoyo no sea clínica.

---

### Idea 6 · Retroalimentación semanal orientada a la autoeficacia

**Qué es.** Un resumen en lenguaje llano del patrón propio, más **un único plan concreto** para
el punto débil de la semana siguiente. Sin porcentaje global y sin regaños.

**Por qué.** Un análisis de 60 intervenciones identificó que la pareja de técnicas de cambio
de conducta más efectiva es *aumentar el conocimiento* junto con *aumentar la autoeficacia*, y
que las apps del mercado usan **12 de 96** técnicas posibles. El ensayo de Medisafe movió la
autoeficacia (d=0,43) a la vez que la adherencia (d=-0,52), mientras que el módulo educativo
pasivo lo abrieron 3 de 32 personas. La educación como módulo de lectura no se consume.

**Esfuerzo.** Pequeño si existe la idea 2. Es una pantalla más un texto bien escrito.

**Riesgo clínico.** Bajo. Si se genera con un modelo de lenguaje, hay que ponerle barandas:
sin un guion cerrado, un LLM pasa de «has tomado el 70%» a «deberías…», y eso ya es otra cosa.

---

### Idea 7 · Permisos por medicamento y bitácora de accesos

**Qué es.** Llevar el modelo de permisos un paso más allá: que el paciente decida **qué
medicamento** ve cada cuidador, no solo qué tipo de dato, y que pueda ver un registro de qué
consultó ese cuidador y cuándo.

**Por qué.** Es la extensión natural de lo que ya es su mejor activo, y responde al dato de
Medisafe (1 de 32). Además, la literatura señala **cero estudios** sobre equidad y carga del
cuidador en este campo, y que el 80% de las apps de salud transmiten datos del usuario a
servicios externos.

**Esfuerzo.** La parte de «por medicamento» es media y toca el punto de control de acceso, que
es delicado y está bien probado. La **bitácora** es pequeña y valiosa por sí sola.

**Riesgo clínico.** Ninguno.

**Nota.** Esto es más «terminar de vender lo que ya tienen» que un diferenciador nuevo.

---

### Idea 8 · Modo de baja alfabetización y bajo ancho de banda

**Qué es.** Pictograma del medicamento real, voz primero, todo sin conexión, y un canal de
respaldo por SMS o llamada al cuidador cuando el paciente se queda sin datos.

**Por qué.** En Colombia la escolaridad promedio de los mayores de 60 es de **5,5 años**, y
entre quienes no usan internet la razón principal (56,5%) es **no saber usarlo**, por encima
del costo. Pero el **97,5%** de quienes sí lo usan accede por teléfono, y en zona rural son el
**98,1%**: el cuello de botella no es el aparato, es la habilidad. Y la literatura pide
expresamente estudios en países de ingreso bajo y medio.

**Esfuerzo.** Variable. Buena parte ya está hecha (letra hasta 145%, contraste verificado,
64 px táctiles, todo con botones visibles). Lo nuevo sería la voz y el respaldo por SMS, y el
SMS cuesta dinero.

**Riesgo clínico.** Ninguno.

**Nota.** En gran medida ya lo tienen. Es otro caso de nombrar lo construido.

---

## 3. Lo que descartaría, y por qué

### Por riesgo

| Función | Veredicto | Motivo |
|---|---|---|
| Avisar de interacciones entre medicamentos | **No** | La FDA la considera función de dispositivo cuando va dirigida a pacientes o cuidadores, y solo la tolera por discrecionalidad, figura que **en Colombia no existe** |
| Sugerir cambiar un horario de toma | **No** | Directiva terapéutica sobre una persona concreta. Además, modificar una prescripción es acto médico |
| Chatbot que responda preguntas sobre el medicamento | **No** | Es asesoría individualizada, y roza la teleorientación, que la Resolución 2654 de 2019 reserva a un profesional |
| Leer la foto de la fórmula con OCR | **Con cuidado** | Transcribir no es función de dispositivo, pero un error en una dosis es daño real. Exige confirmación humana obligatoria, y la app no puede opinar sobre si la dosis es correcta |

Un detalle que conviene saber: el famoso «carve-out» de la FDA para software de apoyo a la
decisión clínica **solo aplica al software dirigido a profesionales de la salud**. Chronova va
dirigida al paciente y a su cuidador, así que **no puede ampararse en él**. Sus vías son no
tener finalidad diagnóstica ni terapéutica, o caer en bienestar general.

### Por no ser diferenciador

Esto ya existe, gratis, en varias apps: rachas, informe PDF para el médico, foto del
medicamento, escaneo de código de barras, aviso al cuidador de una dosis omitida, círculo de
cuidado, funcionamiento sin conexión, recordatorio de resurtido, porcentaje de adherencia, y
premios o puntos. De los premios, además, hay un dato curioso: los mayores de 65 los usan un
**12,8% menos** que la población general. No les motivan.

---

## 4. Lo que yo haría

**Si eligen una sola: la idea 1.** Es la única que nadie puede copiar, porque modela el
sistema de salud colombiano. Tiene cero riesgo clínico, cifras oficiales detrás, una norma de
2026 que le da marco, y se entiende en una frase. Para un proyecto académico en Colombia es
difícil de superar.

**Si eligen dos: la 1 y la 2.** La primera da el diferenciador imposible de copiar; la segunda
da el componente técnico que se parece a lo que el profesor llama IA, con respaldo en
literatura reciente. Las ideas 3, 5 y 6 entran casi gratis encima de esas dos.

**Lo que no haría en seis semanas:** la idea 4, porque toca la generación de la agenda, que es
la parte mejor probada del sistema y la que no conviene mover a un mes de la sustentación.

### Dos advertencias para la sustentación

**No prometan mejorar la adherencia.** En seis semanas no es medible, y la literatura muestra
que ni los ensayos de seis meses lo sostienen. Lo que sí pueden demostrar es viabilidad,
usabilidad y validez del modelo sobre datos sintéticos o retrospectivos.

**Escriban la declaración de uso previsto, y escríbanla antes que el código.** En el examen
colombiano de finalidad prevista, ese párrafo es el documento que determina si son o no un
dispositivo médico. Algo así:

> Chronova es una herramienta de apoyo conductual a la adherencia. No diagnostica, no trata,
> no modifica prescripciones y no sustituye el criterio profesional.

No es un descargo de responsabilidad decorativo. Es la pieza que sostiene todo lo demás.

---

## Fuentes

**Normativa y casos**

- [Decreto 4725 de 2005](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=18697) · [INVIMA, preguntas frecuentes sobre software](https://www.invima.gov.co/productos-vigilados/dispositivos-medicos/preguntas-frecuentes-dispositivos)
- [FDA, Clinical Decision Support Software (guía final, enero de 2026)](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software) · [Funciones que no son dispositivos médicos](https://www.fda.gov/medical-devices/device-software-functions-including-mobile-medical-applications/examples-software-functions-are-not-medical-devices)
- [FDA, carta de advertencia a SeniorLife Technologies (21/08/2025)](https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/seniorlife-technologies-inc-707021-08212025) · [Tessa / NEDA (NPR)](https://www.npr.org/sections/health-shots/2023/06/08/1180838096/an-eating-disorders-chatbot-offered-dieting-advice-raising-fears-about-ai-in-hea)
- [Resolución 2654 de 2019, telesalud](https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=87008) · [Ley 1996 de 2019, capacidad legal plena](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=99712)

**Evidencia sobre adherencia**

- [Dai et al., Prev Med 2017 — recordatorios en 46.581 personas](https://www.sciencedirect.com/science/article/abs/pii/S0091743517302669)
- [JMIR 2025;27:e60822 — metaanálisis de apps de adherencia](https://www.jmir.org/2025/1/e60822)
- [Haile et al., Australas J Ageing 2026 — intervenciones digitales en mayores de 65](https://research-repository.uwa.edu.au/en/publications/digital-health-interventions-to-improve-medication-adherence-amon/)
- [Geriatrics 2026;11(4):78 — mHealth y carga de tratamiento](https://www.mdpi.com/2308-3417/11/4/78)
- [Hartch et al., J Behav Med 2024 — ensayo de Medisafe](https://link.springer.com/article/10.1007/s10865-023-00446-2)
- [Walsh y Moon, Front Pharmacol 2025 — técnicas de cambio de conducta](https://www.frontiersin.org/journals/pharmacology/articles/10.3389/fphar.2025.1632474/full)
- [Mamun et al., Smart Health 2024 — AIMI, predicción de olvido](https://arxiv.org/html/2503.16091v1)
- [Baby et al., JMIR Aging 2026 — modelo personalizado frente a no personalizado](https://www.sciencedirect.com/org/science/article/pii/S2561760526000514)

**Contexto colombiano**

- [Defensoría del Pueblo, 2026 — 87% con problemas de acceso a medicamentos](https://www.pulzo.com/nacion/duro-panorama-con-entrega-medicamentos-colombia-que-pasa-PP5300745A)
- [Circular 017 de 2026 del MinSalud — plazo de 48 horas](https://www.infobae.com/colombia/2026/05/13/ministerio-de-salud-emitio-circular-para-la-entrega-de-medicamentos-pendientes-dio-plazos-a-las-eps-y-reforzo-controles-sobre-el-desabastecimiento/)
- [Cáceres et al., Biomédica 2023 — adherencia en Colombia, 59%](https://revistabiomedica.org/index.php/biomedica/article/view/7077)
- [SABE Colombia — encuesta de salud y envejecimiento](https://www.minsalud.gov.co/sites/rid/lists/bibliotecaDigital/RIDE/VS/ED/GCFI/Resumen-ejecutivo-encuesta-SABE.pdf)
- [DANE, ENTIC Hogares 2024 — acceso a internet](https://www.dane.gov.co/files/operaciones/ENTIC/bol-ENTICHogares-2024.pdf)
