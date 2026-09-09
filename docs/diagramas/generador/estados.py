"""
Diagrama 04 — estados de la entidad Toma.

Refleja backend/src/domain/toma/Toma.ts.

Dos decisiones de colocacion que cambian lo que se entiende:

  - Los estados llevan el color que el propio estado tiene en la app:
    el verde de TOMADA es el verde de la tarjeta confirmada, y el rojo
    de OMITIDA es el de la omitida. Quien haya visto la pantalla
    reconoce el diagrama sin leerlo.

  - Las dos transiciones automaticas (las que dispara el servidor
    cuando nadie responde) bajan por un carril propio en color ambar,
    separadas de las que hace una persona. Mezcladas con las demas eran
    dos flechas mas entrando por el mismo lado; separadas se ve de un
    golpe que a OMITIDA se llega de dos maneras muy distintas.
"""

from __future__ import annotations

from lienzo import C, Lienzo, ancho, repartir
from piezas import Caja, camino, conector, medir_nota, nota, rotulo, titulo_de_lamina

TONOS = {
    "pendiente": (C["primarioSuave"], C["primario"]),
    "pospuesta": (C["advertenciaSuave"], C["advertencia"]),
    "tomada": (C["exitoSuave"], C["exito"]),
    "omitida": (C["peligroSuave"], C["peligro"]),
}


def _estado(L: Lienzo, x: float, y: float, w: float, titulo: str, cuerpo: str, tono: str) -> Caja:
    relleno, tinta = TONOS[tono]
    lineas = repartir(cuerpo, 11.5, 400, w - 36)
    h = 54 + len(lineas) * 17 + 14
    L.caja(x, y, w, h, C["superficie"], tinta, 1.5, 14, sombra=True)
    L.ruta(
        f"M {x:.1f} {y + 44:.1f} L {x:.1f} {y + 14:.1f} A 14 14 0 0 1 {x + 14:.1f} {y:.1f} "
        f"L {x + w - 14:.1f} {y:.1f} A 14 14 0 0 1 {x + w:.1f} {y + 14:.1f} "
        f"L {x + w:.1f} {y + 44:.1f} Z",
        color=relleno,
        grosor=0,
        relleno=relleno,
    )
    L.texto(x + 18, y + 29, titulo, 15, 700, tinta, espaciado=0.8)
    L.parrafo(x + 18, y + 66, lineas, 11.5, 400, C["textoSuave"], 1.48)
    return Caja(x, y, w, h)


def _hito(L: Lienzo, cx: float, cy: float, final: bool = False) -> Caja:
    if final:
        L.piezas.append(
            f'<circle cx="{cx}" cy="{cy}" r="13" fill="none" stroke="{C["texto"]}" stroke-width="1.6"/>'
        )
        L.piezas.append(f'<circle cx="{cx}" cy="{cy}" r="7.5" fill="{C["texto"]}"/>')
    else:
        L.piezas.append(f'<circle cx="{cx}" cy="{cy}" r="11" fill="{C["texto"]}"/>')
    return Caja(cx - 13, cy - 13, 26, 26)


def estados_de_la_toma() -> Lienzo:
    ANCHO_ESTADO = 372

    x_inicio = 76
    x_izq = 268
    x_der = x_izq + ANCHO_ESTADO + 292
    x_fin = x_der + ANCHO_ESTADO + 76

    NOTAS = [
        "*POSPUESTA* — al cuarto intento de posponer se lanza ErrorDeReglaDeNegocio. El límite evita que aplazar se convierta en una forma silenciosa de nunca tomar el medicamento.",
        "*TOMADA* y *OMITIDA* son estados finales. Intentar cambiarlos lanza ErrorDeReglaDeNegocio: un registro clínico no se reescribe.",
        "*origenDelRegistro* distingue quién cerró la toma:   PACIENTE, la marcó él mismo   ·   CUIDADOR, la marcó quien lo acompaña   ·   SISTEMA, nadie respondió y venció el plazo.",
    ]

    L = Lienzo(x_fin + 100, 1000)
    titulo_de_lamina(
        L,
        "Estados de una Toma",
        "El registro se crea aunque el paciente no haga nada: así el olvido queda documentado",
    )

    pendiente = _estado(
        L,
        x_izq,
        160,
        ANCHO_ESTADO,
        "PENDIENTE",
        "La toma existe y espera respuesta. Es la clave del proyecto: el registro se crea aunque el paciente no haga nada.",
        "pendiente",
    )
    pospuesta = _estado(
        L,
        x_izq,
        400,
        ANCHO_ESTADO,
        "POSPUESTA",
        "Se corrió la hora. vecesPospuesta ≤ 3",
        "pospuesta",
    )
    tomada = _estado(
        L,
        x_der,
        150,
        ANCHO_ESTADO,
        "TOMADA",
        "resueltaEn registrado. Se descuenta el inventario.",
        "tomada",
    )
    omitida = _estado(
        L,
        x_der,
        392,
        ANCHO_ESTADO,
        "OMITIDA",
        "resueltaEn registrado. No se descuenta inventario.",
        "omitida",
    )

    inicio = _hito(L, x_inicio, pendiente.cy)
    fin_tomada = _hito(L, x_fin, tomada.cy, final=True)
    fin_omitida = _hito(L, x_fin, omitida.cy, final=True)

    # ---------- transiciones que dispara una persona ----------
    conector(L, (inicio.cx + 13, inicio.cy), pendiente.izq(), "recto", fin="punta")
    L.texto(
        (inicio.cx + 13 + pendiente.x) / 2, pendiente.cy - 16, "programar()", 10.5, 600, C["textoTenue"], "middle"
    )
    L.texto(
        (inicio.cx + 13 + pendiente.x) / 2,
        pendiente.cy - 3,
        "al generar",
        10,
        400,
        C["textoTenue"],
        "middle",
        cursiva=True,
    )
    L.texto(
        (inicio.cx + 13 + pendiente.x) / 2,
        pendiente.cy + 9,
        "la agenda",
        10,
        400,
        C["textoTenue"],
        "middle",
        cursiva=True,
    )

    conector(L, pendiente.der(0.25), tomada.izq(0.6), "recto", fin="punta")
    rotulo(L, (pendiente.x2 + tomada.x) / 2, (pendiente.y + 60 + tomada.cy + 20) / 2 - 26, "confirmar()")

    conector(L, pendiente.der(0.75), omitida.izq(0.25), "recto", fin="punta")
    rotulo(L, pendiente.x2 + 74, pendiente.y2 - 12, "omitir()")

    conector(L, pendiente.abajo(0.3), pospuesta.arriba(0.3), "recto", fin="punta")
    rotulo(L, pendiente.x + ANCHO_ESTADO * 0.3, (pendiente.y2 + pospuesta.y) / 2, "posponer(5..180 min)")

    conector(L, pospuesta.der(0.3), tomada.izq(0.9), "recto", fin="punta")
    rotulo(L, pospuesta.x2 + 86, pospuesta.y + 6, "confirmar()")

    conector(L, pospuesta.der(0.75), omitida.izq(0.75), "recto", fin="punta")
    rotulo(L, (pospuesta.x2 + omitida.x) / 2, (pospuesta.y2 - 20 + omitida.y2 - 20) / 2, "omitir()")

    # Lazo sobre si misma: posponer otra vez.
    lz = 46
    L.ruta(
        f"M {pospuesta.x + 168:.1f} {pospuesta.y2:.1f} "
        f"C {pospuesta.x + 138:.1f} {pospuesta.y2 + lz:.1f} "
        f"{pospuesta.x + 258:.1f} {pospuesta.y2 + lz:.1f} "
        f"{pospuesta.x + 228:.1f} {pospuesta.y2 + 2:.1f}",
        marca_fin="punta",
    )
    L.texto(
        pospuesta.x + 280,
        pospuesta.y2 + 28,
        "posponer()  [vecesPospuesta < 3]",
        10.5,
        500,
        C["textoTenue"],
    )

    conector(L, tomada.der(), (fin_tomada.cx - 13, fin_tomada.cy), "recto", fin="punta")
    conector(L, omitida.der(), (fin_omitida.cx - 13, fin_omitida.cy), "recto", fin="punta")

    # ---------- transiciones automaticas, por su propio carril ----------
    carril = max(pospuesta.y2, omitida.y2) + 108
    pasillo = x_inicio - 4
    # PENDIENTE sale por la izquierda: POSPUESTA esta justo debajo, y
    # bajar en linea recta habria partido esa caja en dos.
    camino(
        L,
        [
            pendiente.izq(0.86),
            (pasillo, pendiente.y + pendiente.h * 0.86),
            (pasillo, carril),
            (omitida.x + omitida.w * 0.35, carril),
            omitida.abajo(0.35),
        ],
        color=C["advertencia"],
    )
    camino(
        L,
        [
            pospuesta.abajo(0.08),
            (pospuesta.x + pospuesta.w * 0.08, carril - 40),
            (omitida.x + omitida.w * 0.62, carril - 40),
            omitida.abajo(0.62),
        ],
        color=C["advertencia"],
    )

    L.texto(
        omitida.x2 - 10,
        carril + 22,
        "cerrarPorFaltaDeRespuesta()   —   la ejecuta el servidor cada 15 minutos",
        11,
        600,
        C["advertencia"],
        "end",
    )
    L.texto(
        omitida.x2 - 10,
        carril + 38,
        "[ ahora > programadaPara + minutosDeGracia del paciente ]",
        10.5,
        400,
        C["advertencia"],
        "end",
    )

    # ---------- notas ----------
    y = carril + 74
    ancho_nota = (L.ancho - 152) / 2
    nota(L, 76, y, ancho_nota, NOTAS[0])
    nota(L, 76 + ancho_nota + 24, y, ancho_nota, NOTAS[1])
    y2 = y + max(medir_nota(NOTAS[0], ancho_nota), medir_nota(NOTAS[1], ancho_nota)) + 16
    nota(L, 76, y2, L.ancho - 152, NOTAS[2])

    L.alto = int(y2 + medir_nota(NOTAS[2], L.ancho - 152) + 44)
    return L
