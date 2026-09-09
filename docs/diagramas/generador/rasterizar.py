"""
Convierte los SVG en PNG con Chromium.

Se usa un navegador y no una libreria de rasterizado porque los SVG
llevan la tipografia incrustada como @font-face, y las librerias
(cairosvg, rsvg) la ignoran: devolverian los PNG con otra letra y
distinto ancho, con el texto desbordado. Chromium usa el mismo motor
que dibujaria el SVG en pantalla, asi que el PNG es exactamente lo que
se ve.

Escala 2x: el .docx los coloca a media pagina, y a 1x el texto pequeno
se ve dentado al imprimir.
"""

from __future__ import annotations

import os
import re
import sys

from playwright.sync_api import sync_playwright

ESCALA = 2


def rasterizar(rutas_svg: list[str]) -> list[str]:
    salidas = []
    with sync_playwright() as p:
        navegador = p.chromium.launch(args=["--force-color-profile=srgb", "--font-render-hinting=none"])
        for ruta in rutas_svg:
            svg = open(ruta, encoding="utf8").read()
            w = int(re.search(r'width="(\d+)"', svg).group(1))
            h = int(re.search(r'height="(\d+)"', svg).group(1))
            pagina = navegador.new_page(viewport={"width": w, "height": h}, device_scale_factor=ESCALA)
            pagina.set_content(
                f'<style>html,body{{margin:0;padding:0;background:#fff}}</style>{svg}',
                wait_until="load",
            )
            pagina.wait_for_timeout(220)  # que terminen de cargar las @font-face
            destino = ruta.replace(".svg", ".png")
            pagina.screenshot(path=destino, omit_background=False)
            pagina.close()
            salidas.append(destino)
            print(f"  {os.path.basename(destino):<44} {w}x{h} -> {w*ESCALA}x{h*ESCALA}")
        navegador.close()
    return salidas


if __name__ == "__main__":
    rasterizar(sys.argv[1:])
