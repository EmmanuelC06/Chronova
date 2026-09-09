"""Genera los nueve SVG y los rasteriza a PNG."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

SALIDA = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def escribir(nombre, lienzo):
    ruta = os.path.join(SALIDA, nombre + ".svg")
    open(ruta, "w", encoding="utf8").write(lienzo.svg())
    print(f"  {nombre:<40} {lienzo.ancho}x{lienzo.alto}")
    return ruta


def main(solo=None):
    import casos_de_uso
    laminas = {
        "01-casos-de-uso-paciente": casos_de_uso.casos_del_paciente,
        "02-casos-de-uso-cuidador": casos_de_uso.casos_del_cuidador,
    }
    for modulo, mapa in [
        ("estados", {"04-estados-toma": "estados_de_la_toma"}),
        ("clases", {"03-clases-dominio": "clases_del_dominio"}),
        ("secuencias", {"05-secuencia-confirmar-toma": "confirmar_toma",
                        "06-secuencia-agenda-del-dia": "agenda_del_dia"}),
        ("componentes", {"07-componentes-hexagonal": "hexagonal",
                         "09-componentes-frontend": "frontend"}),
        ("entidad_relacion", {"08-entidad-relacion": "modelo_relacional"}),
    ]:
        try:
            m = __import__(modulo)
        except ImportError:
            print(f"  (aun sin: {modulo})")
            continue
        for nombre, fn in mapa.items():
            laminas[nombre] = getattr(m, fn)
    laminas = dict(sorted(laminas.items()))

    rutas = []
    for nombre, fn in laminas.items():
        if solo and not any(s in nombre for s in solo):
            continue
        rutas.append(escribir(nombre, fn()))
    return rutas


if __name__ == "__main__":
    rutas = main(sys.argv[1:] or None)
    import rasterizar
    rasterizar.rasterizar(rutas)
