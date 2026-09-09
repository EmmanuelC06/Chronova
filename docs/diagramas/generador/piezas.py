"""
Chronova — piezas reutilizables de los diagramas.

Cada pieza sabe medirse a si misma. Eso es lo que evita el defecto mas
comun de un diagrama hecho a mano: una caja con el texto desbordado
porque alguien anadio un atributo y no reajusto el ancho.
"""

from __future__ import annotations

from dataclasses import dataclass

from lienzo import C, FAMILIAS, Lienzo, ancho, repartir, _sin_marcas


# ===================================================================
#  Rectangulo con puntos de anclaje
# ===================================================================


@dataclass
class Caja:
    x: float
    y: float
    w: float
    h: float

    @property
    def x2(self) -> float:
        return self.x + self.w

    @property
    def y2(self) -> float:
        return self.y + self.h

    @property
    def cx(self) -> float:
        return self.x + self.w / 2

    @property
    def cy(self) -> float:
        return self.y + self.h / 2

    def izq(self, t: float = 0.5) -> tuple[float, float]:
        return (self.x, self.y + self.h * t)

    def der(self, t: float = 0.5) -> tuple[float, float]:
        return (self.x2, self.y + self.h * t)

    def arriba(self, t: float = 0.5) -> tuple[float, float]:
        return (self.x + self.w * t, self.y)

    def abajo(self, t: float = 0.5) -> tuple[float, float]:
        return (self.x + self.w * t, self.y2)


# ===================================================================
#  Encabezado de lamina
# ===================================================================


def titulo_de_lamina(L: Lienzo, titulo: str, subtitulo: str = "", x: float = 44, y: float = 58) -> None:
    L.texto(x, y, titulo, 25, 700, C["texto"], espaciado=-0.4)
    if subtitulo:
        L.texto(x, y + 26, subtitulo, 13.5, 400, C["textoSuave"])
    L.linea(x, y + (46 if subtitulo else 22), L.ancho - x, y + (46 if subtitulo else 22), C["borde"], 1)


# ===================================================================
#  Contenedor de grupo (los "package" de UML)
# ===================================================================


def grupo(
    L: Lienzo,
    x: float,
    y: float,
    w: float,
    h: float,
    etiqueta: str,
    relleno: str = None,
    borde: str = None,
    color_etiqueta: str = None,
) -> Caja:
    L.caja(x, y, w, h, relleno or C["fondo"], borde or C["borde"], 1.1, 16)
    if etiqueta:
        L.texto(
            x + 18,
            y + 25,
            etiqueta.upper(),
            10.5,
            700,
            color_etiqueta or C["textoTenue"],
            espaciado=1.3,
        )
    return Caja(x, y, w, h)


# ===================================================================
#  Tarjeta de clase / entidad / tabla
# ===================================================================

_PAD = 14
_TAM_TITULO = 14.5
_TAM_TAG = 9.5
_TAM_FILA = 11.5
_SALTO_FILA = 17.0


def medir_tarjeta(titulo: str, secciones: list[list[str]], familia: str = "entidad") -> tuple[float, float]:
    tag = FAMILIAS[familia]["tag"]
    anchos = [ancho(titulo, _TAM_TITULO, 700)]
    if tag:
        anchos.append(ancho(f"«{tag}»", _TAM_TAG, 500) + 2)
    for sec in secciones:
        for fila in sec:
            anchos.append(ancho(_sin_marcas(fila), _TAM_FILA, 400) + 4)
    w = max(anchos) + _PAD * 2

    alto_cab = 30 + (13 if tag else 0)
    filas = sum(len(s) for s in secciones)
    separadores = max(0, len([s for s in secciones if s]) - 1)
    h = alto_cab + (10 if filas else 0) + filas * _SALTO_FILA + separadores * 9 + (8 if filas else 0)
    return (round(w), round(h))


def tarjeta(
    L: Lienzo,
    x: float,
    y: float,
    titulo: str,
    secciones: list[list[str]],
    familia: str = "entidad",
    w: float = None,
) -> Caja:
    """Una clase UML: franja de encabezado y una fila por miembro."""
    est = FAMILIAS[familia]
    tag = est["tag"]
    aw, ah = medir_tarjeta(titulo, secciones, familia)
    w = w or aw
    h = ah
    alto_cab = 30 + (13 if tag else 0)

    L.caja(x, y, w, h, C["superficie"], C["bordeFuerte"], 1.15, 10, sombra=True)
    # Franja del encabezado, redondeada solo arriba.
    L.ruta(
        f"M {x:.1f} {y + alto_cab:.1f} L {x:.1f} {y + 10:.1f} A 10 10 0 0 1 {x + 10:.1f} {y:.1f} "
        f"L {x + w - 10:.1f} {y:.1f} A 10 10 0 0 1 {x + w:.1f} {y + 10:.1f} "
        f"L {x + w:.1f} {y + alto_cab:.1f} Z",
        color=est["franja"],
        grosor=0,
        relleno=est["franja"],
    )
    L.linea(x, y + alto_cab, x + w, y + alto_cab, C["bordeFuerte"], 1.15)

    if tag:
        L.texto(x + _PAD, y + 16, f"«{tag}»", _TAM_TAG, 500, est["titulo"], espaciado=0.4)
        L.texto(x + _PAD, y + 33, titulo, _TAM_TITULO, 700, est["titulo"])
    else:
        L.texto(x + _PAD, y + 20, titulo, _TAM_TITULO, 700, est["titulo"])

    cursor = y + alto_cab + 18
    for i, sec in enumerate(secciones):
        if i and sec:
            L.linea(x + 1, cursor - 13, x + w - 1, cursor - 13, C["borde"], 1)
        for fila in sec:
            _fila(L, x + _PAD, cursor, fila)
            cursor += _SALTO_FILA
        if sec:
            cursor += 9
    return Caja(x, y, w, h)


def _fila(L: Lienzo, x: float, y: float, texto: str) -> None:
    """Pinta el signo de visibilidad mas apagado que el nombre del miembro."""
    if texto[:2] in ("+ ", "- ", "# "):
        signo, resto = texto[0], texto[2:]
        color_signo = C["exito"] if signo == "+" else C["peligro"] if signo == "-" else C["textoTenue"]
        L.texto(x, y, signo, _TAM_FILA, 700, color_signo)
        L.texto(x + 11, y, resto, _TAM_FILA, 400, C["textoSuave"])
    else:
        L.texto(x, y, texto, _TAM_FILA, 400, C["textoSuave"])


# ===================================================================
#  Caso de uso (ovalo) y actor
# ===================================================================


def caso_de_uso(L: Lienzo, cx: float, cy: float, texto: str, w: float = 168, codigo: str = "") -> Caja:
    lineas = repartir(texto, 12, 500, w - 34)
    h = max(52, 26 + len(lineas) * 16)
    L.elipse(cx, cy, w / 2, h / 2, C["primarioSuave"], C["primario"], 1.15)
    y0 = cy - (len(lineas) - 1) * 8 + 4
    for i, linea in enumerate(lineas):
        L.texto(cx, y0 + i * 16, linea, 12, 500, C["primarioOscuro"], "middle")
    if codigo:
        L.texto(cx, cy + h / 2 + 13, codigo, 9, 600, C["textoTenue"], "middle", espaciado=0.5)
    return Caja(cx - w / 2, cy - h / 2, w, h)


def actor(L: Lienzo, cx: float, cy: float, nombre: str, detalle: str = "") -> Caja:
    """Monigote de trazo, del mismo grosor que los iconos de la app."""
    c = C["primario"]
    g = 1.9
    L.piezas.append(
        f'<circle cx="{cx:.1f}" cy="{cy - 26:.1f}" r="9" fill="{C["superficie"]}" stroke="{c}" stroke-width="{g}"/>'
    )
    L.linea(cx, cy - 17, cx, cy + 8, c, g)
    L.linea(cx - 14, cy - 8, cx + 14, cy - 8, c, g)
    L.linea(cx, cy + 8, cx - 12, cy + 27, c, g)
    L.linea(cx, cy + 8, cx + 12, cy + 27, c, g)
    L.texto(cx, cy + 48, nombre, 13.5, 700, C["texto"], "middle")
    if detalle:
        L.texto(cx, cy + 64, detalle, 10.5, 400, C["textoTenue"], "middle")
    return Caja(cx - 16, cy - 36, 32, 72)


# ===================================================================
#  Nota
# ===================================================================


def medir_nota(texto: str, w: float, tam: float = 11) -> float:
    lineas = repartir(texto, tam, 400, w - 32)
    return 22 + len(lineas) * (tam * 1.5)


def nota(
    L: Lienzo,
    x: float,
    y: float,
    w: float,
    texto: str,
    tam: float = 11,
    tono: str = "advertencia",
) -> Caja:
    relleno = C[f"{tono}Suave"]
    tinta = C[tono]
    lineas = repartir(texto, tam, 400, w - 32)
    h = 22 + len(lineas) * (tam * 1.5)
    L.caja(x, y, w, h, relleno, relleno, 1, 9)
    L.ruta(
        f"M {x + 3.5:.1f} {y + 9:.1f} L {x + 3.5:.1f} {y + h - 9:.1f}",
        color=tinta,
        grosor=3,
    )
    L.parrafo(x + 16, y + tam + 6, lineas, tam, 400, tinta, 1.5)
    return Caja(x, y, w, h)


# ===================================================================
#  Conectores
# ===================================================================


def conector(
    L: Lienzo,
    p1: tuple[float, float],
    p2: tuple[float, float],
    modo: str = "recto",
    fin: str = "punta",
    inicio: str = None,
    discontinuo: str = None,
    etiqueta: str = "",
    etiqueta_en: float = 0.5,
    color: str = None,
    quiebre: float = None,
    radio: float = 9,
) -> None:
    """
    Une dos puntos. `modo` decide el trazado:
      recto — linea directa
      hv    — primero horizontal, luego vertical
      vh    — primero vertical, luego horizontal
      hvh   — horizontal, vertical, horizontal (quiebre = x del tramo vertical)
      vhv   — vertical, horizontal, vertical (quiebre = y del tramo horizontal)
    Las esquinas se redondean: en un diagrama con muchas lineas, los
    angulos vivos hacen que dos trazados que se tocan parezcan uno solo.
    """
    x1, y1 = p1
    x2, y2 = p2
    if modo == "recto":
        d = f"M {x1:.1f} {y1:.1f} L {x2:.1f} {y2:.1f}"
    elif modo == "hv":
        d = _esquinas([(x1, y1), (x2, y1), (x2, y2)], radio)
    elif modo == "vh":
        d = _esquinas([(x1, y1), (x1, y2), (x2, y2)], radio)
    elif modo == "hvh":
        qx = quiebre if quiebre is not None else (x1 + x2) / 2
        d = _esquinas([(x1, y1), (qx, y1), (qx, y2), (x2, y2)], radio)
    elif modo == "vhv":
        qy = quiebre if quiebre is not None else (y1 + y2) / 2
        d = _esquinas([(x1, y1), (x1, qy), (x2, qy), (x2, y2)], radio)
    else:
        raise ValueError(modo)

    L.ruta(d, color=color, grosor=1.35, discontinuo=discontinuo, marca_fin=fin, marca_inicio=inicio)

    if etiqueta:
        ex = x1 + (x2 - x1) * etiqueta_en
        ey = y1 + (y2 - y1) * etiqueta_en
        rotulo(L, ex, ey, etiqueta)


def camino(
    L: Lienzo,
    puntos: list[tuple[float, float]],
    fin: str = "punta",
    inicio: str = None,
    discontinuo: str = None,
    color: str = None,
    radio: float = 9,
    grosor: float = 1.35,
) -> None:
    """Trazado libre por una lista de puntos, con las esquinas redondeadas.

    Para los recorridos que no son un simple codo: por ejemplo salir por
    la izquierda, bajar hasta el carril inferior, cruzar y volver a subir.
    """
    L.ruta(
        _esquinas(puntos, radio),
        color=color,
        grosor=grosor,
        discontinuo=discontinuo,
        marca_fin=fin,
        marca_inicio=inicio,
    )


def _esquinas(puntos: list[tuple[float, float]], r: float) -> str:
    """Convierte una polilinea en una ruta con las esquinas redondeadas."""
    if len(puntos) < 3:
        return f"M {puntos[0][0]:.1f} {puntos[0][1]:.1f} L {puntos[-1][0]:.1f} {puntos[-1][1]:.1f}"
    d = [f"M {puntos[0][0]:.1f} {puntos[0][1]:.1f}"]
    for i in range(1, len(puntos) - 1):
        ax, ay = puntos[i - 1]
        bx, by = puntos[i]
        cx, cy = puntos[i + 1]
        r1 = min(r, _dist((ax, ay), (bx, by)) / 2, _dist((bx, by), (cx, cy)) / 2)
        if r1 < 1:
            d.append(f"L {bx:.1f} {by:.1f}")
            continue
        e1 = _hacia((bx, by), (ax, ay), r1)
        e2 = _hacia((bx, by), (cx, cy), r1)
        d.append(f"L {e1[0]:.1f} {e1[1]:.1f}")
        d.append(f"Q {bx:.1f} {by:.1f} {e2[0]:.1f} {e2[1]:.1f}")
    d.append(f"L {puntos[-1][0]:.1f} {puntos[-1][1]:.1f}")
    return " ".join(d)


def _dist(a, b):
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5


def _hacia(desde, hasta, d):
    largo = _dist(desde, hasta) or 1
    return (desde[0] + (hasta[0] - desde[0]) * d / largo, desde[1] + (hasta[1] - desde[1]) * d / largo)


def rotulo(L: Lienzo, x: float, y: float, texto: str, tam: float = 10.5, color: str = None) -> None:
    """Texto sobre una pastilla blanca, para que no se lea encima de una linea."""
    lineas = texto.split("\n")
    w = max(ancho(_sin_marcas(l), tam, 500) for l in lineas) + 12
    h = len(lineas) * (tam * 1.35) + 6
    L.caja(x - w / 2, y - h / 2, w, h, C["superficie"], C["superficie"], 0, 5)
    y0 = y - (len(lineas) - 1) * (tam * 1.35) / 2 + tam * 0.36
    for i, linea in enumerate(lineas):
        L.texto(x, y0 + i * tam * 1.35, linea, tam, 500, color or C["textoTenue"], "middle")


def cardinalidad(L: Lienzo, x: float, y: float, texto: str) -> None:
    L.texto(x, y, texto, 10, 600, C["textoTenue"], "middle")
