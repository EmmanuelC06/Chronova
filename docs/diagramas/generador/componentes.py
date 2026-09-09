"""
Diagramas 07 y 09 — componentes.

El 07 es la arquitectura hexagonal del servidor; el 09, la de la
aplicacion movil, que repite la misma idea a menor escala.

Los dos se leen en bandas horizontales y de arriba abajo, y la banda del
DOMINIO va en el centro con el color primario. La razon de poner el
dominio en medio y no arriba es que asi las flechas de las capas de
arriba bajan hacia el, las de las capas de abajo suben hacia el, y se ve
literalmente lo que dice la regla de la arquitectura: las dependencias
apuntan hacia adentro. Con el dominio arriba, el dibujo sugeriria lo
contrario.
"""

from __future__ import annotations

from lienzo import C, Lienzo, ancho, repartir
from piezas import Caja, camino, conector, grupo, medir_nota, nota, rotulo, titulo_de_lamina

ALTO_COMPONENTE = 76
HUECO_BANDA = 62


def _componente(
    L: Lienzo,
    x: float,
    y: float,
    w: float,
    titulo: str,
    detalle: str = "",
    tono: str = "primario",
    alto: float = None,
) -> Caja:
    lineas_t = repartir(titulo, 12.5, 700, w - 42)
    lineas_d = repartir(detalle, 10.5, 400, w - 24) if detalle else []
    h = alto or (34 + len(lineas_t) * 16 + len(lineas_d) * 14 + 14)
    L.caja(x, y, w, h, C["superficie"], C[tono], 1.35, 11, sombra=True)
    # El pictograma de componente de UML, en pequeno, arriba a la derecha.
    L.piezas.append(
        f'<g stroke="{C[tono]}" stroke-width="1.1" fill="{C["superficie"]}">'
        f'<rect x="{x + w - 24:.1f}" y="{y + 9:.1f}" width="14" height="10" rx="1.5"/>'
        f'<rect x="{x + w - 27:.1f}" y="{y + 11:.1f}" width="6" height="2.6"/>'
        f'<rect x="{x + w - 27:.1f}" y="{y + 15:.1f}" width="6" height="2.6"/></g>'
    )
    for i, linea in enumerate(lineas_t):
        L.texto(x + 13, y + 24 + i * 16, linea, 12.5, 700, C["texto"])
    for i, linea in enumerate(lineas_d):
        L.texto(x + 13, y + 24 + len(lineas_t) * 16 + i * 14, linea, 10.5, 400, C["textoSuave"])
    return Caja(x, y, w, h)


def _interfaz(L: Lienzo, x: float, y: float, w: float, nombre: str) -> Caja:
    """Un puerto. Se dibuja con la piruleta de UML, no como una caja mas."""
    h = 44
    L.caja(x, y, w, h, C["advertenciaSuave"], C["advertenciaSuave"], 0, 22)
    L.piezas.append(
        f'<circle cx="{x + 22:.1f}" cy="{y + h / 2:.1f}" r="8" fill="{C["superficie"]}" '
        f'stroke="{C["advertencia"]}" stroke-width="1.6"/>'
    )
    L.texto(x + 38, y + h / 2 + 4.5, nombre, 12, 700, C["advertencia"])
    return Caja(x, y, w, h)


def _banda(L: Lienzo, x: float, y: float, w: float, h: float, numero: str, etiqueta: str, tono: str):
    relleno = {
        "entrada": C["fondo"],
        "aplicacion": C["advertenciaSuave"],
        "dominio": C["primarioSuave"],
        "puertos": C["advertenciaSuave"],
        "salida": C["fondo"],
    }[tono]
    tinta = {
        "entrada": C["textoTenue"],
        "aplicacion": C["advertencia"],
        "dominio": C["primario"],
        "puertos": C["advertencia"],
        "salida": C["textoTenue"],
    }[tono]
    L.caja(x, y, w, h, relleno, relleno, 0, 16)
    L.texto(x + 20, y + 25, f"{numero} · {etiqueta}".upper(), 10.5, 700, tinta, espaciado=1.3)
    return Caja(x, y, w, h)


def _fila(L, x0, w_total, y, elementos, dibujar, hueco=22):
    """Reparte `elementos` en una fila centrada y devuelve sus cajas."""
    n = len(elementos)
    w = (w_total - hueco * (n - 1)) / n
    return [dibujar(L, x0 + i * (w + hueco), y, w, *e) for i, e in enumerate(elementos)]


# ===================================================================
#  07 — Arquitectura hexagonal del servidor
# ===================================================================


def hexagonal() -> Lienzo:
    MARGEN = 48
    ANCHO_BANDA = 1580
    x0 = MARGEN + 118  # el carril de la izquierda lleva la flecha de la regla
    xi = x0 + 20

    L = Lienzo(int(x0 + ANCHO_BANDA + MARGEN), 4000)
    titulo_de_lamina(
        L,
        "Arquitectura hexagonal (puertos y adaptadores)",
        "Las dependencias apuntan siempre hacia adentro: el dominio no conoce a nadie",
    )

    y = 156
    w_int = ANCHO_BANDA - 40

    # ---- 1. entrada ----
    b1 = _banda(L, x0, y, ANCHO_BANDA, 44 + ALTO_COMPONENTE + 20, "1", "Adaptadores de entrada", "entrada")
    ent = _fila(L, xi, w_int, y + 44, [
        ("App móvil", "Expo · React Native"),
        ("API HTTP", "Express · Zod · JWT"),
        ("Tarea programada", "cierre de tomas cada 15 min"),
    ], lambda L, x, y, w, t, d: _componente(L, x, y, w, t, d, alto=ALTO_COMPONENTE), hueco=104)

    # ---- 2. aplicacion ----
    y = b1.y2 + HUECO_BANDA
    b2 = _banda(L, x0, y, ANCHO_BANDA, 44 + ALTO_COMPONENTE + 20, "2", "Aplicación", "aplicacion")
    apl = _fila(L, xi, w_int, y + 44, [
        ("Casos de uso", "Auth · Medicamentos · Tomas · Cuidadores · Dispositivos"),
        ("PoliticaDeAcceso", "punto único de control de permisos"),
    ], lambda L, x, y, w, t, d: _componente(L, x, y, w, t, d, alto=ALTO_COMPONENTE))

    # ---- 3. dominio ----
    y = b2.y2 + HUECO_BANDA
    b3 = _banda(L, x0, y, ANCHO_BANDA, 44 + ALTO_COMPONENTE + 20, "3", "Dominio — cero dependencias externas", "dominio")
    dom = _fila(L, xi, w_int, y + 44, [
        ("Paciente", ""),
        ("Cuidador", ""),
        ("Medicamento", "Dosis · Stock · Frecuencia"),
        ("Toma", "ResumenDeAdherencia"),
        ("Vinculo", ""),
        ("Dispositivo", ""),
        ("Solicitud de recuperación", ""),
    ], lambda L, x, y, w, t, d: _componente(L, x, y, w, t, d, alto=ALTO_COMPONENTE), hueco=14)

    # ---- 4. puertos ----
    y = b3.y2 + HUECO_BANDA
    b4 = _banda(L, x0, y, ANCHO_BANDA, 44 + 44 + 20, "4", "Puertos — interfaces de TypeScript", "puertos")
    pue = _fila(L, xi, w_int, y + 44, [
        ("Repositorios",), ("Seguridad",), ("Sistema",),
        ("Notificador",), ("Correo",), ("Códigos",),
    ], lambda L, x, y, w, t: _interfaz(L, x, y, w, t), hueco=14)

    # ---- 5. salida ----
    y = b4.y2 + HUECO_BANDA
    b5 = _banda(L, x0, y, ANCHO_BANDA, 44 + ALTO_COMPONENTE + 20, "5", "Adaptadores de salida", "salida")
    sal = _fila(L, xi, w_int, y + 44, [
        ("Repositorios", "PostgreSQL"),
        ("Repositorios", "en memoria"),
        ("CifradorBcrypt", "ServicioDeTokensJwt"),
        ("RelojDelSistema", "GeneradorDeIdsUuid"),
        ("Notificador", "Compuesto: ExpoPush + consola"),
        ("CorreoResendHttp", "CorreoEnConsola"),
        ("GeneradorDeCodigos", "Seguro"),
    ], lambda L, x, y, w, t, d: _componente(L, x, y, w, t, d, alto=ALTO_COMPONENTE), hueco=14)

    # ---- 6. lo de afuera ----
    y = b5.y2 + 52
    w_ext = 330
    db = _componente(L, xi, y, w_ext, "PostgreSQL 16", "base de datos", "primario", 66)
    nube = _componente(L, xi + w_ext + 40, y, w_ext, "Expo Push · Resend", "servicios externos", "primario", 66)

    alto_bandas = y + 66

    # ================= flechas =================
    # 1 -> 2
    conector(L, ent[0].der(), ent[1].izq(), "recto", fin="punta")
    rotulo(L, (ent[0].x2 + ent[1].x) / 2, ent[0].cy, "envía\npeticiones a")
    for origen, t in ((ent[1], 0.35), (ent[2], 0.7)):
        conector(L, origen.abajo(0.5), apl[0].arriba(t), "vhv", fin="punta")

    # 2 -> 3 (el abanico que muestra la regla)
    for caja in dom:
        conector(L, apl[0].abajo(0.5), caja.arriba(0.5), "vhv", fin="punta", quiebre=apl[0].y2 + 26)
    conector(L, apl[1].abajo(0.5), dom[4].arriba(0.8), "vhv", fin="punta", quiebre=apl[1].y2 + 14)

    # 3 y 2 declaran los puertos
    conector(L, dom[0].abajo(0.2), pue[0].arriba(0.5), "recto", fin="punta", discontinuo="6 5")
    L.texto(dom[0].x - 6, b3.y2 + 34, "el dominio declara", 10, 500, C["textoTenue"], "end")
    for i in range(1, 6):
        y_carril = b4.y - 11 - (i - 1) * 9
        camino(
            L,
            [
                apl[0].izq(0.3 + i * 0.08),
                (x0 + 9, apl[0].y + apl[0].h * (0.3 + i * 0.08)),
                (x0 + 9, y_carril),
                (pue[i].cx, y_carril),
                pue[i].arriba(),
            ],
            fin="punta",
            discontinuo="6 5",
            radio=6,
        )
    L.texto(x0 + 20, b3.y - 22, "la aplicación declara los otros cinco", 10, 500, C["advertencia"])

    # 5 implementa 4
    for adaptador, puerto in zip(sal, [pue[0], pue[0], pue[1], pue[2], pue[3], pue[4], pue[5]]):
        conector(L, adaptador.arriba(0.5), puerto.abajo(0.5), "vhv", fin="triangulo", discontinuo="6 5")

    # 5 -> afuera
    conector(L, sal[0].abajo(0.4), db.arriba(0.5), "vhv", fin="punta", quiebre=b5.y2 + 20)
    rotulo(L, db.cx, b5.y2 + 20, "SQL parametrizado")
    for a in (sal[4], sal[5]):
        conector(L, a.abajo(0.5), nube.arriba(0.5), "vhv", fin="punta", quiebre=b5.y2 + 34)
    rotulo(L, nube.cx, b5.y2 + 34, "HTTPS")

    # ---- carril de la izquierda: la regla, dibujada ----
    L.ruta(
        f"M {MARGEN + 44:.1f} {b1.y + 30:.1f} L {MARGEN + 44:.1f} {b3.cy - 26:.1f}",
        color=C["primario"],
        grosor=2,
        marca_fin="punta-llena",
    )
    L.ruta(
        f"M {MARGEN + 44:.1f} {b5.y2 - 30:.1f} L {MARGEN + 44:.1f} {b3.cy + 26:.1f}",
        color=C["primario"],
        grosor=2,
        marca_fin="punta-llena",
    )
    for texto, yy in (("las dependencias", b3.cy - 8), ("apuntan hacia adentro", b3.cy + 8)):
        L.texto(MARGEN + 44, yy, texto, 11, 700, C["primario"], "middle")

    # ---- notas ----
    NOTAS = [
        "*Regla de oro.* Ningún archivo de src/domain/ importa express, pg, bcrypt ni ninguna librería externa. Solo TypeScript. Comprobado: 39 archivos, 3.196 líneas, cero importaciones que salgan de la carpeta.",
        "Los puertos son *interfaces de TypeScript*. Quién decide qué adaptador se conecta a cada uno es un solo archivo: *contenedor.ts*. En el código se llaman Notificador, EnviadorDeCorreo, GeneradorDeCodigos, CifradorDeContrasenas, ServicioDeTokens, Reloj y GeneradorDeIds.",
        "*Repositorios* los declara el DOMINIO (src/domain/*/RepositorioDe*.ts); los otros cinco los declara la APLICACIÓN (src/application/ports/). La diferencia importa: guardar un paciente es una necesidad del dominio; mandar un correo es una necesidad del caso de uso.",
        "Los repositorios en memoria cumplen los mismos puertos que los de PostgreSQL. Por eso la aplicación corre entera sin base de datos (PERSISTENCE=memory) y las pruebas terminan en menos de 4 segundos. *NotificadorCompuesto* es el mismo puerto otra vez: reparte el aviso entre varios destinos y aísla el fallo de cada uno.",
    ]
    y_notas = alto_bandas + 46
    w_nota = (ANCHO_BANDA + 118 - 3 * 22) / 4
    alto_nota = max(medir_nota(n, w_nota) for n in NOTAS)
    for i, texto in enumerate(NOTAS):
        nota(L, MARGEN + i * (w_nota + 22), y_notas, w_nota, texto)

    L.alto = int(y_notas + alto_nota + 40)
    return L


# ===================================================================
#  09 — Componentes de la aplicacion movil
# ===================================================================


def frontend() -> Lienzo:
    """
    Igual que el 07, pero con dos carriles en los margenes.

    Las pantallas leen la sesion, y la sesion habla con el almacenamiento
    y con las alarmas: son relaciones que saltan dos y tres bandas. Si se
    dibujan en vertical atraviesan las cajas de las bandas intermedias,
    asi que salen por el margen. El carril de la izquierda es lo que
    entra a la sesion; el de la derecha, lo que la sesion usa.
    """
    MARGEN = 48
    RAIL_IZQ = 74
    x0 = 114
    ANCHO_BANDA = 1470
    RAIL_DER = x0 + ANCHO_BANDA + 22
    xi = x0 + 20
    w_int = ANCHO_BANDA - 40

    L = Lienzo(int(RAIL_DER + MARGEN + 14), 4000)
    titulo_de_lamina(
        L,
        "Componentes de la aplicación móvil",
        "Expo + React Native. Las pantallas no saben que existe HTTP",
    )

    def comp(L, x, y, w, t, d):
        return _componente(L, x, y, w, t, d, alto=ALTO_COMPONENTE)

    y = 156
    b1 = _banda(L, x0, y, ANCHO_BANDA, 44 + ALTO_COMPONENTE + 20, "app/", "Pantallas", "entrada")
    pant = _fila(L, xi, w_int, y + 44, [
        ("(auth)", "ingresar · registro · recuperar"),
        ("(paciente)", "hoy · medicamentos · historial · perfil"),
        ("(cuidador)", "pacientes · paciente/[id] con 3 pestañas"),
        ("medicamento/", "nuevo · [id]"),
        ("privacidad", ""),
    ], comp, hueco=14)

    y = b1.y2 + HUECO_BANDA
    b2 = _banda(L, x0, y, ANCHO_BANDA, 44 + ALTO_COMPONENTE + 20, "src/ui/componentes/", "Componentes reutilizables", "entrada")
    comps = _fila(L, xi, w_int, y + 44, [
        ("basicos", "Boton · Campo · Tarjeta · Texto · Aviso · Insignia"),
        ("FormularioDeMedicamento", ""),
        ("Icono · Logo", ""),
        ("accionesDeMedicamento", "diálogos compartidos"),
    ], comp, hueco=14)

    y = b2.y2 + HUECO_BANDA
    b3 = _banda(L, x0, y, ANCHO_BANDA, 44 + 66 + 20, "src/ui/", "Sistema de diseño", "dominio")
    tema = _componente(
        L, xi, y + 44, w_int, "tema · tipografia · texto · hora",
        "colores · espacios · escalas de letra · zonas táctiles de 64 px", "primario", 66,
    )

    y = b3.y2 + HUECO_BANDA
    b4 = _banda(L, x0, y, ANCHO_BANDA, 44 + ALTO_COMPONENTE + 20, "src/ui/contexto/", "Estado compartido", "aplicacion")
    ctx = _fila(L, xi, w_int, y + 44, [
        ("SesionContexto", "sesión · perfil · preferencias"),
        ("PacienteObservadoContexto", "carga una vez para las 3 pestañas"),
        ("NavegacionPorNotificaciones", ""),
    ], comp, hueco=14)

    y = b4.y2 + HUECO_BANDA
    b5 = _banda(L, x0, y, ANCHO_BANDA, 44 + ALTO_COMPONENTE + 20, "src/dominio/", "Dominio del cliente", "dominio")
    w_dom = (w_int - 28) / 3
    mod = _componente(L, xi, y + 44, w_dom, "modelos", "Paciente · Medicamento · Toma · Vinculo", alto=ALTO_COMPONENTE)
    puerto = _interfaz(L, xi + w_dom + 14, y + 44 + 16, w_dom, "ApiDeChronova")
    pol = _componente(L, xi + 2 * (w_dom + 14), y + 44, w_dom, "politicaDeDatos", "versión de la política aceptada", alto=ALTO_COMPONENTE)

    y = b5.y2 + HUECO_BANDA
    b6 = _banda(L, x0, y, ANCHO_BANDA, 44 + ALTO_COMPONENTE + 20, "src/infraestructura/", "Infraestructura", "salida")
    inf = _fila(L, xi, w_int, y + 44, [
        ("ClienteChronova", "fetch · token · errores"),
        ("SesionEnAsyncStorage", "guarda la sesión en el teléfono"),
        ("AlarmasExpo", "alarmas locales del teléfono"),
    ], comp, hueco=14)

    y = b6.y2 + 52
    api = _componente(L, xi, y, 400, "API de Chronova", "el backend", "primario", 66)
    alto_bandas = y + 66

    # ================= flechas =================
    for p in pant:
        conector(L, p.abajo(0.5), comps[0].arriba(0.5), "vhv", fin="punta", quiebre=b1.y2 + 20)
    conector(L, comps[0].abajo(0.5), tema.arriba(0.2), "vhv", fin="punta", quiebre=b2.y2 + 20)
    rotulo(L, tema.cx - 220, b2.y2 + 20, "todo lo visual sale de aquí")

    # Carril izquierdo: lo que entra al estado compartido.
    camino(
        L,
        [b1.izq(0.62), (RAIL_IZQ, b1.y + b1.h * 0.62), (RAIL_IZQ, ctx[0].cy), ctx[0].izq()],
        fin="punta",
    )
    L.texto(RAIL_IZQ + 8, (b1.y2 + b4.y) / 2 - 6, "todas las pantallas", 10, 500, C["textoTenue"])
    L.texto(RAIL_IZQ + 8, (b1.y2 + b4.y) / 2 + 8, "leen la sesión", 10, 500, C["textoTenue"])
    camino(
        L,
        [
            pant[2].abajo(0.2),
            (pant[2].x + pant[2].w * 0.2, b1.y2 + 34),
            (RAIL_IZQ + 22, b1.y2 + 34),
            (RAIL_IZQ + 22, ctx[1].y - 26),
            (ctx[1].cx, ctx[1].y - 26),
            ctx[1].arriba(),
        ],
        fin="punta",
    )

    # Estado -> dominio del cliente.
    for c in ctx:
        conector(L, c.abajo(0.5), puerto.arriba(0.5), "vhv", fin="punta", quiebre=b4.y2 + 22)
    rotulo(L, puerto.cx, b4.y2 + 22, "dependen del puerto, no del cliente HTTP")
    conector(L, ctx[0].abajo(0.12), mod.arriba(0.4), "vhv", fin="punta", quiebre=b4.y2 + 42)
    conector(L, ctx[2].abajo(0.88), pol.arriba(0.6), "vhv", fin="punta", quiebre=b4.y2 + 42)

    # Infraestructura implementa el puerto.
    conector(L, inf[0].arriba(0.5), puerto.abajo(0.5), "vhv", fin="triangulo", discontinuo="6 5")
    rotulo(L, (inf[0].cx + puerto.cx) / 2, b5.y2 + 26, "implementa")

    # Carril derecho: lo que usa el estado compartido.
    # Entran por arriba, no por el costado: viniendo desde la derecha, el
    # tramo horizontal hasta SesionEnAsyncStorage habria atravesado
    # AlarmasExpo de lado a lado.
    for i, destino in enumerate((inf[1], inf[2])):
        rail = RAIL_DER + i * 13
        camino(
            L,
            [
                ctx[0].der(0.3 + i * 0.3),
                (rail, ctx[0].y + ctx[0].h * (0.3 + i * 0.3)),
                (rail, b6.y - 20 - i * 12),
                (destino.cx, b6.y - 20 - i * 12),
                destino.arriba(),
            ],
            fin="punta",
        )
    L.texto(RAIL_DER - 8, b4.y2 + 24, "la sesión guarda el token", 10, 500, C["textoTenue"], "end")
    L.texto(RAIL_DER - 8, b4.y2 + 38, "y sincroniza las alarmas", 10, 500, C["textoTenue"], "end")

    conector(L, inf[0].abajo(0.5), api.arriba(0.5), "vhv", fin="punta", quiebre=b6.y2 + 20)
    rotulo(L, api.cx, b6.y2 + 20, "HTTPS + JWT")

    NOTAS = [
        "*La misma idea del backend, a menor escala.* Las pantallas dependen del puerto *ApiDeChronova*, no del cliente HTTP. Ninguna pantalla sabe que existe fetch, ni una URL, ni un código de estado. Los nombres son los mismos del backend y de los documentos —Paciente, Toma, Vínculo— para no traducir nada mentalmente al pasar de una capa a otra.",
        "*El estado vive en contextos, no en pantallas.* *SesionContexto* guarda quién inició sesión y sus preferencias, y envuelve toda la app. *PacienteObservadoContexto* existe porque las tres pestañas de la ficha necesitan los mismos datos: se cargan UNA vez y las pestañas solo pintan. Sin él serían tres veces las mismas peticiones y tres sitios donde repetir la comprobación de permisos.",
        "*Un solo archivo decide colores, espacios y tamaños.* El texto base son 18 pt —no 14— y escala hasta un 45% más desde las preferencias del paciente; las zonas tocables miden 64 px. No es estética: la revisión de literatura señala la experiencia de uso como causa principal de abandono en este público.",
    ]
    y_notas = alto_bandas + 46
    w_nota = (L.ancho - MARGEN * 2 - 2 * 22) / 3
    alto_nota = max(medir_nota(n, w_nota) for n in NOTAS)
    for i, texto in enumerate(NOTAS):
        nota(L, MARGEN + i * (w_nota + 22), y_notas, w_nota, texto)

    L.alto = int(y_notas + alto_nota + 40)
    return L
