"""
Chronova — sistema visual de los diagramas.

Por que existe este archivo y no seguimos con PlantUML: PlantUML decide
por su cuenta el aspecto y la colocacion. Con el se obtiene un diagrama
correcto pero con la estetica por defecto de la herramienta —cajas
grises, tipografia de sistema, flechas que se cruzan donde el algoritmo
quiera—, y eso es exactamente lo que la profesora pidio cambiar.

Aqui la colocacion es explicita: cada caja tiene sus coordenadas. Se
pierde el "se acomoda solo" y se gana poder decidir que va al lado de
que, que no se cruza y donde respira el dibujo.

El acabado sale del propio sistema de diseno de la aplicacion
(mobile/src/ui/tema.ts): los mismos colores y la misma tipografia. Los
diagramas y la app se ven de la misma familia, que es lo que se espera
de un proyecto y no de nueve imagenes sueltas.
"""

from __future__ import annotations

import base64
import io
import os
import re
from dataclasses import dataclass, field

from PIL import ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
FUENTES = os.path.join(AQUI, "fuentes-tipograficas")


# ===================================================================
#  1. FICHAS DE COLOR — copiadas de mobile/src/ui/tema.ts
# ===================================================================

C = {
    "fondo": "#F7F9FA",
    "superficie": "#FFFFFF",
    "superficieSuave": "#EFF3F5",
    "borde": "#E2E8EC",
    "bordeFuerte": "#CBD5DC",
    "texto": "#0F1B21",
    "textoSuave": "#5A6B75",
    "textoTenue": "#67737D",
    "textoInverso": "#FFFFFF",
    "primario": "#185A66",
    "primarioOscuro": "#0D4049",
    "primarioSuave": "#E1EFF2",
    "exito": "#16704F",
    "exitoSuave": "#DFF1E9",
    "advertencia": "#8A5209",
    "advertenciaSuave": "#FBEEDC",
    "peligro": "#A3251F",
    "peligroSuave": "#FBE6E4",
}

# Cuatro familias de caja, cada una con su franja de encabezado. El color
# no viaja solo: cada familia lleva ademas su etiqueta («VO», «enum»...),
# para que el diagrama se siga entendiendo impreso en blanco y negro.
FAMILIAS = {
    "entidad": {"franja": C["primarioSuave"], "titulo": C["primario"], "tag": None},
    "vo": {"franja": C["superficieSuave"], "titulo": C["textoSuave"], "tag": "objeto de valor"},
    "enum": {"franja": C["advertenciaSuave"], "titulo": C["advertencia"], "tag": "enumeracion"},
    "servicio": {"franja": C["exitoSuave"], "titulo": C["exito"], "tag": "servicio de dominio"},
    "tabla": {"franja": C["primarioSuave"], "titulo": C["primario"], "tag": None},
}

PESOS = {400: "400Regular", 500: "500Medium", 600: "600SemiBold", 700: "700Bold"}


# ===================================================================
#  2. MEDIR TEXTO DE VERDAD
# ===================================================================
#
# Sin esto habria que adivinar el ancho de cada cadena, y adivinar mal
# significa texto que se sale de su caja. Se mide con la misma tipografia
# que despues dibuja el navegador, asi que el ancho calculado y el ancho
# pintado son el mismo.

_cache: dict[tuple[int, int], ImageFont.FreeTypeFont] = {}


def _tipografia(tam: int, peso: int) -> ImageFont.FreeTypeFont:
    clave = (tam, peso)
    if clave not in _cache:
        ruta = os.path.join(FUENTES, f"AtkinsonHyperlegibleNext_{PESOS[peso]}.ttf")
        # El tamano se multiplica por 4 y luego se divide, para que el
        # redondeo a pixeles enteros de PIL no acumule error en cadenas
        # largas.
        _cache[clave] = ImageFont.truetype(ruta, tam * 4)
    return _cache[clave]


def ancho(texto: str, tam: float, peso: int = 400) -> float:
    """Ancho en px que ocupara `texto`. Precision: la de la fuente real."""
    if not texto:
        return 0.0
    return _tipografia(int(round(tam)), peso).getlength(texto) / 4.0


def repartir(texto: str, tam: float, peso: int, ancho_max: float) -> list[str]:
    """Parte un parrafo en lineas que quepan en `ancho_max`."""
    lineas: list[str] = []
    for parrafo in texto.split("\n"):
        if not parrafo.strip():
            lineas.append("")
            continue
        actual = ""
        for palabra in parrafo.split(" "):
            prueba = f"{actual} {palabra}".strip()
            if actual and ancho(_sin_marcas(prueba), tam, peso) > ancho_max:
                lineas.append(actual)
                actual = palabra
            else:
                actual = prueba
        if actual:
            lineas.append(actual)
    return lineas


# `*negrita*` dentro de un texto: se marca con asteriscos y se convierte
# en <tspan> al dibujar. Para medir hay que quitarlos antes.
_MARCA = re.compile(r"\*([^*]+)\*")


def _sin_marcas(t: str) -> str:
    return _MARCA.sub(r"\1", t)


def _escapar(t: str) -> str:
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _tramos(t: str) -> str:
    """Convierte `hola *mundo*` en `hola <tspan class="n">mundo</tspan>`."""
    salida = []
    resto = t
    while True:
        m = _MARCA.search(resto)
        if not m:
            salida.append(_escapar(resto))
            break
        salida.append(_escapar(resto[: m.start()]))
        salida.append(f'<tspan class="n">{_escapar(m.group(1))}</tspan>')
        resto = resto[m.end() :]
    return "".join(salida)


# ===================================================================
#  3. EL LIENZO
# ===================================================================


@dataclass
class Lienzo:
    ancho: int
    alto: int
    titulo: str = ""
    subtitulo: str = ""
    piezas: list[str] = field(default_factory=list)
    defs: list[str] = field(default_factory=list)

    # ---------- texto ----------

    def texto(
        self,
        x: float,
        y: float,
        s: str,
        tam: float = 13,
        peso: int = 400,
        color: str = None,
        anclaje: str = "start",
        cursiva: bool = False,
        espaciado: float = 0,
    ) -> None:
        if not s:
            return
        color = color or C["texto"]
        extra = ""
        if cursiva:
            extra += ' font-style="italic"'
        if espaciado:
            extra += f' letter-spacing="{espaciado}"'
        self.piezas.append(
            f'<text x="{x:.1f}" y="{y:.1f}" font-size="{tam}" font-weight="{peso}" '
            f'fill="{color}" text-anchor="{anclaje}"{extra}>{_tramos(s)}</text>'
        )

    def parrafo(
        self,
        x: float,
        y: float,
        lineas: list[str],
        tam: float = 12,
        peso: int = 400,
        color: str = None,
        interlinea: float = 1.45,
        anclaje: str = "start",
    ) -> float:
        """Dibuja varias lineas y devuelve la Y de la ultima linea."""
        salto = tam * interlinea
        for i, linea in enumerate(lineas):
            self.texto(x, y + i * salto, linea, tam, peso, color, anclaje)
        return y + max(0, len(lineas) - 1) * salto

    # ---------- formas ----------

    def caja(
        self,
        x: float,
        y: float,
        w: float,
        h: float,
        relleno: str = None,
        borde: str = None,
        grosor: float = 1.2,
        radio: float = 10,
        discontinuo: str = None,
        sombra: bool = False,
    ) -> None:
        relleno = relleno or C["superficie"]
        borde = borde or C["bordeFuerte"]
        extra = f' stroke-dasharray="{discontinuo}"' if discontinuo else ""
        extra += ' filter="url(#sombra)"' if sombra else ""
        self.piezas.append(
            f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{radio}" '
            f'fill="{relleno}" stroke="{borde}" stroke-width="{grosor}"{extra}/>'
        )

    def linea(
        self,
        x1: float,
        y1: float,
        x2: float,
        y2: float,
        color: str = None,
        grosor: float = 1.4,
        discontinuo: str = None,
    ) -> None:
        color = color or C["textoSuave"]
        extra = f' stroke-dasharray="{discontinuo}"' if discontinuo else ""
        self.piezas.append(
            f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
            f'stroke="{color}" stroke-width="{grosor}" stroke-linecap="round"{extra}/>'
        )

    def ruta(
        self,
        d: str,
        color: str = None,
        grosor: float = 1.4,
        relleno: str = "none",
        discontinuo: str = None,
        marca_fin: str = None,
        marca_inicio: str = None,
    ) -> None:
        color = color or C["textoSuave"]
        extra = f' stroke-dasharray="{discontinuo}"' if discontinuo else ""
        if marca_fin:
            extra += f' marker-end="url(#{marca_fin})"'
        if marca_inicio:
            extra += f' marker-start="url(#{marca_inicio})"'
        self.piezas.append(
            f'<path d="{d}" fill="{relleno}" stroke="{color}" stroke-width="{grosor}" '
            f'stroke-linejoin="round" stroke-linecap="round"{extra}/>'
        )

    def elipse(
        self, cx: float, cy: float, rx: float, ry: float, relleno: str, borde: str, grosor: float = 1.2
    ) -> None:
        self.piezas.append(
            f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{rx:.1f}" ry="{ry:.1f}" '
            f'fill="{relleno}" stroke="{borde}" stroke-width="{grosor}"/>'
        )

    def crudo(self, s: str) -> None:
        self.piezas.append(s)

    # ---------- exportar ----------

    def svg(self) -> str:
        cuerpo = "\n    ".join(self.piezas)
        estilo_fuente = _bloque_de_fuentes()
        return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{self.ancho}" height="{self.alto}" viewBox="0 0 {self.ancho} {self.alto}" font-family="Atkinson Hyperlegible Next, Segoe UI, Helvetica, Arial, sans-serif">
  <defs>
    <style>{estilo_fuente}
      text {{ font-family: 'Atkinson Hyperlegible Next', 'Segoe UI', Helvetica, Arial, sans-serif; }}
      tspan.n {{ font-weight: 700; }}
    </style>
    <filter id="sombra" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-color="#0F1B21" flood-opacity="0.07"/>
    </filter>
    {_marcadores()}
    {"".join(self.defs)}
  </defs>
  <rect width="{self.ancho}" height="{self.alto}" fill="{C['superficie']}"/>
    {cuerpo}
</svg>
"""


# ===================================================================
#  4. TIPOGRAFIA EMBEBIDA
# ===================================================================
#
# La fuente va dentro del propio SVG, recortada a los caracteres que se
# usan. Sin esto el archivo se veria bien aqui y con otra letra en el
# computador de quien lo abra, que es justo el problema que tiene un
# entregable que pasa de mano en mano.

_CARACTERES = (
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "0123456789"
    "áéíóúüñÁÉÍÓÚÑ¿¡·—–…«»"
    " .,:;()[]{}<>/\\|-_+=*&%#@'\"!?°^~$"
)

_fuentes_embebidas: str | None = None


def _bloque_de_fuentes() -> str:
    global _fuentes_embebidas
    if _fuentes_embebidas is not None:
        return _fuentes_embebidas

    from fontTools import subset

    trozos = []
    for peso, nombre in PESOS.items():
        origen = os.path.join(FUENTES, f"AtkinsonHyperlegibleNext_{nombre}.ttf")
        opciones = subset.Options()
        opciones.flavor = "woff2"
        opciones.layout_features = ["kern", "liga"]
        opciones.desubroutinize = True
        fuente = subset.load_font(origen, opciones)
        recortador = subset.Subsetter(opciones)
        # Sin este populate el subconjunto sale vacio: la fuente pesa 600
        # bytes, el navegador no encuentra ni una letra dentro y cae en
        # silencio a la del sistema. Se ve igual de "correcto" y no es la
        # tipografia que se pidio.
        recortador.populate(text=_CARACTERES)
        recortador.subset(fuente)
        buf = io.BytesIO()
        subset.save_font(fuente, buf, opciones)
        b64 = base64.b64encode(buf.getvalue()).decode("ascii")
        trozos.append(
            "@font-face{font-family:'Atkinson Hyperlegible Next';"
            f"font-weight:{peso};font-style:normal;"
            f"src:url(data:font/woff2;base64,{b64}) format('woff2');}}"
        )
    _fuentes_embebidas = "\n      " + "\n      ".join(trozos)
    return _fuentes_embebidas


def preparar_subconjunto(textos: list[str]) -> None:
    """Fija el conjunto de caracteres a incrustar (los usados + los basicos)."""
    global _CARACTERES, _fuentes_embebidas
    usados = set(_CARACTERES)
    for t in textos:
        usados.update(t)
    _CARACTERES = "".join(sorted(usados))
    _fuentes_embebidas = None


# ===================================================================
#  5. PUNTAS DE FLECHA UML
# ===================================================================


def _marcadores() -> str:
    gris = C["textoSuave"]
    return f"""
    <marker id="punta" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 1 L 9.5 5 L 0 9" fill="none" stroke="{gris}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
    <marker id="punta-llena" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 1 L 9.5 5 L 0 9 Z" fill="{gris}"/>
    </marker>
    <marker id="triangulo" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="11" markerHeight="11" orient="auto-start-reverse">
      <path d="M 0.8 1 L 10.8 6 L 0.8 11 Z" fill="{C['superficie']}" stroke="{gris}" stroke-width="1.3" stroke-linejoin="round"/>
    </marker>
    <marker id="rombo-lleno" viewBox="0 0 16 10" refX="15" refY="5" markerWidth="13" markerHeight="9" orient="auto-start-reverse">
      <path d="M 0.6 5 L 7.8 1 L 15 5 L 7.8 9 Z" fill="{gris}" stroke="{gris}" stroke-width="1"/>
    </marker>
    <marker id="rombo-hueco" viewBox="0 0 16 10" refX="15" refY="5" markerWidth="13" markerHeight="9" orient="auto-start-reverse">
      <path d="M 0.6 5 L 7.8 1 L 15 5 L 7.8 9 Z" fill="{C['superficie']}" stroke="{gris}" stroke-width="1.3"/>
    </marker>
    <marker id="pata" viewBox="0 0 12 12" refX="1" refY="6" markerWidth="12" markerHeight="12" orient="auto-start-reverse">
      <path d="M 11 1 L 1 6 L 11 11" fill="none" stroke="{gris}" stroke-width="1.4" stroke-linecap="round"/>
      <line x1="1" y1="6" x2="11" y2="6" stroke="{gris}" stroke-width="1.4" stroke-linecap="round"/>
    </marker>
    <marker id="uno" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="12" markerHeight="12" orient="auto-start-reverse">
      <line x1="6" y1="1" x2="6" y2="11" stroke="{gris}" stroke-width="1.4" stroke-linecap="round"/>
    </marker>"""
