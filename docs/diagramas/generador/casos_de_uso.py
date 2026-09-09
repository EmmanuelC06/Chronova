"""
Diagramas 01 y 02 — casos de uso.

Colocacion: el actor va en el centro y los paquetes a lado y lado. Con
diecinueve casos de uso, ponerlo a la izquierda obligaba a cruzar el
dibujo entero con cada linea. Desde el centro, cada asociacion es un
segmento corto y recto, y se sigue viendo que salen todas del mismo
actor, que es lo que este diagrama tiene que comunicar.

Las lineas actor–caso de uso van sin punta: en UML una asociacion no
es una flecha. Las puntas se reservan para <<include>> y <<extend>>,
que si son dependencias dirigidas.
"""

from __future__ import annotations

from lienzo import C, Lienzo
from piezas import (
    Caja,
    actor,
    caso_de_uso,
    conector,
    grupo,
    medir_nota,
    nota,
    rotulo,
    titulo_de_lamina,
)

ANCHO_OVALO = 330
ALTO_OVALO = 52
SEPARACION = 13
PAD_SUPERIOR = 46
PAD_INFERIOR = 22
ANCHO_PAQUETE = ANCHO_OVALO + 42


def _alto_paquete(n: int, separacion: float = SEPARACION) -> float:
    return PAD_SUPERIOR + n * ALTO_OVALO + (n - 1) * separacion + PAD_INFERIOR


def _paquete(
    L: Lienzo,
    x: float,
    y: float,
    etiqueta: str,
    casos: list[str],
    separacion: float = SEPARACION,
) -> tuple[Caja, list[Caja]]:
    alto = _alto_paquete(len(casos), separacion)
    grupo(L, x, y, ANCHO_PAQUETE, alto, etiqueta)
    cajas = []
    cy = y + PAD_SUPERIOR + ALTO_OVALO / 2
    for texto in casos:
        cajas.append(caso_de_uso(L, x + ANCHO_PAQUETE / 2, cy, texto, ANCHO_OVALO))
        cy += ALTO_OVALO + separacion
    return Caja(x, y, ANCHO_PAQUETE, alto), cajas


# ===================================================================
#  01 — Casos de uso del Paciente
# ===================================================================


def casos_del_paciente() -> Lienzo:
    IZQ = [
        (
            "Acceso y configuración",
            [
                "Registrarse",
                "Iniciar sesión",
                "Ajustar preferencias de accesibilidad",
                "Recuperar el acceso con un código",
                "Registrar este teléfono para los avisos",
            ],
        ),
        (
            "Control de acompañamiento",
            [
                "Invitar a un cuidador",
                "Responder solicitud de vínculo",
                "Ajustar permisos del cuidador",
                "Revocar acceso",
            ],
        ),
    ]
    DER = [
        (
            "Gestión del tratamiento",
            [
                "Registrar medicamento",
                "Consultar medicamentos",
                "Modificar medicamento",
                "Suspender medicamento",
                "Reabastecer inventario",
            ],
        ),
        (
            "Seguimiento diario",
            [
                "Consultar agenda del día",
                "Confirmar toma",
                "Omitir toma",
                "Posponer toma",
                "Consultar historial de adherencia",
            ],
        ),
    ]

    x_izq = 44
    x_der = 44 + ANCHO_PAQUETE + 268
    cx_actor = x_izq + ANCHO_PAQUETE + 134
    y0 = 148
    hueco = 30

    def alto_columna(cols):
        return sum(
            PAD_SUPERIOR + len(c) * ALTO_OVALO + (len(c) - 1) * SEPARACION + PAD_INFERIOR
            for _, c in cols
        ) + hueco * (len(cols) - 1)

    h_izq, h_der = alto_columna(IZQ), alto_columna(DER)
    alto_contenido = max(h_izq, h_der)

    NOTAS = [
        "*Suspender medicamento* — suspende, no borra. El historial de tomas se conserva como evidencia del tratamiento.",
        "*Revocar acceso* — disponible siempre. El paciente es el dueño de sus datos de salud.",
        "*Recuperar el acceso* — el código son seis dígitos que llegan por correo. Caduca a los 30 minutos, sirve UNA vez y admite cinco intentos.",
        "*Reabastecer inventario* extiende a *Confirmar toma*: confirmar descuenta el inventario y, si queda por debajo del umbral, la app propone reabastecer. La flecha «extend» va de la extensión al caso base, no al revés.",
    ]
    ancho_nota = 545
    y_notas = y0 + alto_contenido + 46
    alto_notas = max(medir_nota(NOTAS[0], ancho_nota), medir_nota(NOTAS[2], ancho_nota)) * 2 + 18

    L = Lienzo(x_der + ANCHO_PAQUETE + 104, int(y_notas + alto_notas + 40))
    titulo_de_lamina(
        L,
        "Casos de uso del Paciente",
        "Adulto mayor o persona con enfermedad crónica que sigue un tratamiento",
    )

    cajas_izq: list[Caja] = []
    y = y0 + (alto_contenido - h_izq) / 2
    for etiqueta, casos in IZQ:
        caja, ovalos = _paquete(L, x_izq, y, etiqueta, casos)
        cajas_izq += ovalos
        y = caja.y2 + hueco

    cajas_der: list[Caja] = []
    y = y0 + (alto_contenido - h_der) / 2
    for etiqueta, casos in DER:
        caja, ovalos = _paquete(L, x_der, y, etiqueta, casos)
        cajas_der += ovalos
        y = caja.y2 + hueco

    cy_actor = y0 + alto_contenido / 2
    actor(L, cx_actor, cy_actor - 30, "Paciente")

    for caja in cajas_izq:
        L.linea(*caja.der(), cx_actor - 26, cy_actor - 30, C["bordeFuerte"], 1.15)
    for caja in cajas_der:
        L.linea(*caja.izq(), cx_actor + 26, cy_actor - 30, C["bordeFuerte"], 1.15)

    # <<extend>>: la flecha sale de la EXTENSION y apunta al caso BASE.
    # Reabastecer es lo que ocurre a veces; confirmar la toma es el curso
    # normal. En la version anterior del diagrama iba al reves.
    confirmar = cajas_der[6]
    reabastecer = cajas_der[4]
    canal = x_der + ANCHO_PAQUETE + 46
    conector(
        L,
        reabastecer.der(),
        confirmar.der(),
        "hvh",
        fin="punta",
        discontinuo="6 5",
        quiebre=canal,
        color=C["advertencia"],
    )
    rotulo(
        L,
        canal,
        (confirmar.cy + reabastecer.cy) / 2,
        "«extend»\nsi el inventario\nqueda bajo",
        10,
        C["advertencia"],
    )

    col = [x_izq, x_izq + ancho_nota + 22]
    for i, texto in enumerate(NOTAS):
        nota(L, col[i % 2], y_notas + (i // 2) * (alto_notas / 2 + 4), ancho_nota, texto)

    return L


# ===================================================================
#  02 — Casos de uso del Cuidador y del Sistema
# ===================================================================


def casos_del_cuidador() -> Lienzo:
    """
    Dos bandas. Arriba, lo que hace el cuidador; abajo, lo que hace solo
    el servidor. Separarlas evita la mezcla del diagrama anterior, donde
    la tarea automatica colgaba del mismo actor que las acciones
    manuales y la linea de "requiere aprobacion" cruzaba media lamina.
    """
    IZQ = [
        ("Acceso", ["Registrarse", "Iniciar sesión", "Recuperar el acceso con un código"]),
        ("Vinculación", ["Solicitar acceso a un paciente"]),
        (
            "Seguimiento",
            [
                "Consultar panel de pacientes",
                "Consultar medicamentos del paciente",
                "Consultar historial de adherencia",
                "Registrar toma en nombre del paciente",
            ],
        ),
    ]
    DER = (
        "Gestión del tratamiento",
        [
            "Registrar medicamento",
            "Modificar medicamento",
            "Suspender medicamento",
            "Reabastecer inventario",
        ],
    )

    ANCHO_ACTOR_IZQ = 150          # sitio del actor Paciente, a la izquierda
    x_izq = ANCHO_ACTOR_IZQ + 44
    x_der = x_izq + ANCHO_PAQUETE + 268
    cx_actor = x_izq + ANCHO_PAQUETE + 134
    y0 = 150
    hueco = 26

    h_izq = sum(_alto_paquete(len(c)) for _, c in IZQ) + hueco * (len(IZQ) - 1)
    cy_actor = y0 + h_izq / 2

    # ---- banda de abajo: los procesos automaticos ----
    SEP_AUTO = 62                  # hueco para que quepa la flecha «include»
    h_auto = _alto_paquete(2, SEP_AUTO)
    # Encaja en el hueco que deja la columna derecha, mas corta que la
    # izquierda. Asi la lamina no crece hacia abajo por una banda que
    # cabia al lado.
    y_auto = y0 + (h_izq - _alto_paquete(4)) / 2 + _alto_paquete(4) + 44

    NOTAS = [
        "*Registrar toma en nombre del paciente* — solo si el paciente concedió el permiso *puedeRegistrarTomas*. Por defecto NO lo tiene.",
        "*Gestión del tratamiento* — los cuatro exigen el permiso *puedeGestionarMedicamentos*, que viene DESACTIVADO al crear el vínculo: cambiar la medicación de otra persona es la acción más delicada del sistema, y el paciente la concede a propósito.",
        "*Consultar panel de pacientes* — ordenado por prioridad clínica: primero quien requiere atención, luego por adherencia ascendente.",
        "*Cerrar tomas sin respuesta* — se ejecuta cada 15 minutos. Cierra las tomas que vencieron el margen de gracia del paciente y las marca con origen SISTEMA.",
    ]
    ancho_nota = 545
    y_notas = max(y_auto + h_auto, y0 + h_izq) + 58
    alto_par = max(medir_nota(n, ancho_nota) for n in NOTAS)

    L = Lienzo(x_der + ANCHO_PAQUETE + 190, int(y_notas + alto_par * 2 + 56))
    titulo_de_lamina(
        L,
        "Casos de uso del Cuidador y del Sistema",
        "Familiar, acompañante o profesional de la salud, y la tarea automática del servidor",
    )

    # ---------- banda 1: el cuidador ----------
    cajas_izq: list[Caja] = []
    y = y0
    caja_vinculacion = None
    for etiqueta, casos in IZQ:
        caja, ovalos = _paquete(L, x_izq, y, etiqueta, casos)
        if etiqueta == "Vinculación":
            caja_vinculacion = ovalos[0]
        cajas_izq += ovalos
        y = caja.y2 + hueco

    caja_der, cajas_der = _paquete(
        L, x_der, cy_actor - _alto_paquete(len(DER[1])) / 2, DER[0], DER[1]
    )

    actor(L, cx_actor, cy_actor - 30, "Cuidador")
    for caja in cajas_izq:
        L.linea(*caja.der(), cx_actor - 26, cy_actor - 30, C["bordeFuerte"], 1.15)
    for caja in cajas_der:
        L.linea(*caja.izq(), cx_actor + 26, cy_actor - 30, C["bordeFuerte"], 1.15)

    # El vinculo no existe hasta que el paciente lo acepta: por eso el
    # actor Paciente aparece aqui, pegado al caso de uso que depende de el.
    cx_pac = ANCHO_ACTOR_IZQ / 2 + 10
    actor(L, cx_pac, caja_vinculacion.cy - 12, "Paciente")
    conector(
        L,
        caja_vinculacion.izq(),
        (cx_pac + 26, caja_vinculacion.cy - 12),
        "recto",
        fin="punta",
        discontinuo="6 5",
        color=C["advertencia"],
    )
    L.texto(
        (cx_pac + 26 + caja_vinculacion.x) / 2,
        caja_vinculacion.cy - 34,
        "requiere",
        9.5,
        500,
        C["advertencia"],
        "middle",
    )
    L.texto(
        (cx_pac + 26 + caja_vinculacion.x) / 2,
        caja_vinculacion.cy - 22,
        "aprobación de",
        9.5,
        500,
        C["advertencia"],
        "middle",
    )

    # ---------- banda 2: el sistema ----------
    caja_auto, ovalos_auto = _paquete(
        L,
        x_der,
        y_auto,
        "Procesos automáticos",
        ["Cerrar tomas sin respuesta", "Notificar al cuidador"],
        SEP_AUTO,
    )
    cerrar, notificar = ovalos_auto

    cx_sis = caja_auto.x2 + 92
    actor(L, cx_sis, cerrar.cy - 12, "Sistema", "tarea programada")
    L.linea(cx_sis - 26, cerrar.cy - 12, *cerrar.der(), C["bordeFuerte"], 1.15)

    conector(
        L,
        cerrar.abajo(),
        notificar.arriba(),
        "recto",
        fin="punta",
        discontinuo="6 5",
        color=C["advertencia"],
    )
    rotulo(L, cerrar.cx, (cerrar.y2 + notificar.y) / 2, "«include»", 10, C["advertencia"])

    # El aviso sube por el pasillo vacio entre las dos columnas hasta el
    # mismo actor de arriba: no hay dos cuidadores, hay uno.
    conector(
        L,
        notificar.izq(),
        (cx_actor, cy_actor + 26),
        "hv",
        fin="punta",
        color=C["bordeFuerte"],
    )
    rotulo(L, (notificar.x + cx_actor) / 2, notificar.cy, "recibe el aviso", 10)

    col = [x_izq - ANCHO_ACTOR_IZQ, x_izq - ANCHO_ACTOR_IZQ + ancho_nota + 22]
    for i, texto in enumerate(NOTAS):
        nota(L, col[i % 2], y_notas + (i // 2) * (alto_par + 14), ancho_nota, texto)

    return L


def _alto(casos: list[str]) -> float:
    return PAD_SUPERIOR + len(casos) * ALTO_OVALO + (len(casos) - 1) * SEPARACION + PAD_INFERIOR
