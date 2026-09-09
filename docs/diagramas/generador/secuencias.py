"""
Diagramas 05 y 06 — secuencia.

Un diagrama de secuencia no se puede colocar a mano caja por caja: el
orden de los mensajes decide la altura de todo lo que viene despues. Asi
que aqui hay un motor pequeno. Se le van dando los mensajes en orden y
el lleva la cuenta de la altura, de que participante esta activo y de
que fragmentos (alt, loop, group) siguen abiertos.

Los participantes se agrupan por capa —entrada, aplicacion, dominio,
salida— con el mismo color que en el diagrama de componentes, para que
se vea que una peticion entra por la izquierda, baja al dominio y sale
por la derecha. Esa banda de color es lo que convierte una lista de
flechas en la historia de un recorrido por la arquitectura.
"""

from __future__ import annotations

from lienzo import C, Lienzo, ancho, repartir
from piezas import Caja, medir_nota, nota, titulo_de_lamina

ANCHO_CARRIL = 194
ALTO_MENSAJE = 46
Y_PRIMERA = 0  # se calcula al construir

TONOS_DE_CAPA = {
    "entrada": (C["fondo"], C["textoTenue"]),
    "aplicacion": (C["advertenciaSuave"], C["advertencia"]),
    "dominio": (C["primarioSuave"], C["primario"]),
    "salida": (C["fondo"], C["textoTenue"]),
    "actor": (None, None),
}


class Secuencia:
    """Motor de un diagrama de secuencia."""

    def __init__(self, titulo: str, subtitulo: str, capas: list[tuple[str, str, list[tuple[str, str, str]]]]):
        self.titulo = titulo
        self.subtitulo = subtitulo
        self.capas = capas
        self.orden: list[str] = []
        self.etiquetas: dict[str, tuple[str, str]] = {}
        self.capa_de: dict[str, str] = {}
        for _, capa, gente in capas:
            for ident, nombre, detalle in gente:
                self.orden.append(ident)
                self.etiquetas[ident] = (nombre, detalle)
                self.capa_de[ident] = capa

        self.pasos: list = []
        self.abiertos: dict[str, float] = {}

    # ---------- API de construccion ----------

    def mensaje(self, de: str, a: str, texto: str, retorno: bool = False, alto_extra: float = 0):
        self.pasos.append(("msg", de, a, texto, retorno, alto_extra))

    def retorno(self, de: str, a: str, texto: str):
        self.mensaje(de, a, texto, retorno=True)

    def auto(self, quien: str, texto: str):
        self.pasos.append(("auto", quien, texto))

    def activar(self, quien: str):
        self.pasos.append(("act", quien))

    def desactivar(self, quien: str):
        self.pasos.append(("desact", quien))

    def abrir(self, tipo: str, etiqueta: str, desde: str, hasta: str):
        self.pasos.append(("abrir", tipo, etiqueta, desde, hasta))

    def separar(self, etiqueta: str):
        self.pasos.append(("separar", etiqueta))

    def cerrar(self):
        self.pasos.append(("cerrar",))

    def apunte(self, quien: str, texto: str, ancho_nota: float = 300, hacia: str = "der"):
        self.pasos.append(("nota", quien, texto, ancho_nota, hacia))

    def hueco(self, px: float = 18):
        self.pasos.append(("hueco", px))

    # ---------- dibujo ----------

    def x(self, ident: str) -> float:
        return self.margen + self.orden.index(ident) * ANCHO_CARRIL + ANCHO_CARRIL / 2

    def construir(self) -> Lienzo:
        self.margen = 48
        ancho_total = self.margen * 2 + len(self.orden) * ANCHO_CARRIL
        L = Lienzo(int(ancho_total), 4000)
        self.L = L
        titulo_de_lamina(L, self.titulo, self.subtitulo)

        y_cabecera = 150
        alto_cabecera = 86

        # ---- bandas de capa ----
        for etiqueta, capa, gente in self.capas:
            if capa == "actor":
                continue
            relleno, tinta = TONOS_DE_CAPA[capa]
            x1 = self.x(gente[0][0]) - ANCHO_CARRIL / 2 + 8
            x2 = self.x(gente[-1][0]) + ANCHO_CARRIL / 2 - 8
            L.caja(x1, y_cabecera - 34, x2 - x1, alto_cabecera + 34, relleno, relleno, 0, 12)
            L.texto(x1 + 14, y_cabecera - 15, etiqueta.upper(), 9.5, 700, tinta, espaciado=1.2)

        # ---- cabeceras de participante ----
        cajas: dict[str, Caja] = {}
        for ident in self.orden:
            nombre, detalle = self.etiquetas[ident]
            cx = self.x(ident)
            if self.capa_de[ident] == "actor":
                _monigote(L, cx, y_cabecera + 30, nombre)
                cajas[ident] = Caja(cx - 20, y_cabecera, 40, alto_cabecera)
                continue
            w = ANCHO_CARRIL - 26
            L.caja(cx - w / 2, y_cabecera, w, alto_cabecera - 14, C["superficie"], C["primario"], 1.3, 10, sombra=True)
            lineas = repartir(nombre, 12.5, 700, w - 20)
            y = y_cabecera + 24 - (len(lineas) - 1) * 8
            for i, linea in enumerate(lineas):
                L.texto(cx, y + i * 16, linea, 12.5, 700, C["texto"], "middle")
            if detalle:
                L.texto(cx, y + len(lineas) * 16 + 2, detalle, 10, 400, C["textoTenue"], "middle")
            cajas[ident] = Caja(cx - w / 2, y_cabecera, w, alto_cabecera - 14)

        # ---- recorrido ----
        y = y_cabecera + alto_cabecera + 34
        pila: list[tuple] = []
        activaciones: list[tuple[float, float, float]] = []
        marcos: list = []
        notas: list = []

        for paso in self.pasos:
            tipo = paso[0]

            if tipo == "hueco":
                y += paso[1]

            elif tipo == "act":
                self.abiertos[paso[1]] = y - 12

            elif tipo == "desact":
                inicio = self.abiertos.pop(paso[1], y)
                activaciones.append((self.x(paso[1]), inicio, y - ALTO_MENSAJE + 20))

            elif tipo == "msg":
                _, de, a, texto, retorno, extra = paso
                lineas = texto.split("\n")
                y += (len(lineas) - 1) * 13 + extra
                self._flecha(y, de, a, lineas, retorno)
                y += ALTO_MENSAJE

            elif tipo == "auto":
                _, quien, texto = paso
                lineas = texto.split("\n")
                self._auto(y, quien, lineas)
                y += 40 + len(lineas) * 14

            elif tipo == "abrir":
                _, t, etiqueta, desde, hasta = paso
                pila.append((t, etiqueta, desde, hasta, y - 26, []))
                y += 26

            elif tipo == "separar":
                pila[-1][5].append((y - 14, paso[1]))
                y += 34

            elif tipo == "cerrar":
                t, etiqueta, desde, hasta, y0, cortes = pila.pop()
                marcos.append((t, etiqueta, desde, hasta, y0, y - 14, cortes))
                y += 22

            elif tipo == "nota":
                _, quien, texto, w, hacia = paso
                h = medir_nota(texto, w)
                x0 = self.x(quien) + 26 if hacia == "der" else self.x(quien) - 26 - w
                notas.append((x0, y - 30, w, texto))
                y += max(0, h - 30) + 16

        # cierra lo que quedara abierto
        for quien, inicio in self.abiertos.items():
            activaciones.append((self.x(quien), inicio, y - ALTO_MENSAJE + 20))

        alto_final = y + 10

        # ---- lineas de vida, por debajo de todo lo demas ----
        vida = []
        for ident in self.orden:
            cx = self.x(ident)
            vida.append(
                f'<line x1="{cx:.1f}" y1="{cajas[ident].y2:.1f}" x2="{cx:.1f}" y2="{alto_final:.1f}" '
                f'stroke="{C["bordeFuerte"]}" stroke-width="1.2" stroke-dasharray="5 6"/>'
            )
        for cx, y1, y2 in activaciones:
            vida.append(
                f'<rect x="{cx - 7:.1f}" y="{y1:.1f}" width="14" height="{max(14, y2 - y1):.1f}" rx="3" '
                f'fill="{C["superficieSuave"]}" stroke="{C["bordeFuerte"]}" stroke-width="1"/>'
            )
        marcos_svg = []
        for t, etiqueta, desde, hasta, y1, y2, cortes in marcos:
            x1 = self.x(desde) - ANCHO_CARRIL / 2 + 18
            x2 = self.x(hasta) + ANCHO_CARRIL / 2 - 18
            marcos_svg.append(
                f'<rect x="{x1:.1f}" y="{y1:.1f}" width="{x2 - x1:.1f}" height="{y2 - y1:.1f}" rx="8" '
                f'fill="none" stroke="{C["advertencia"]}" stroke-width="1.1" stroke-dasharray="7 5"/>'
            )
            w_tag = ancho(t, 10, 700) + 20
            marcos_svg.append(
                f'<rect x="{x1:.1f}" y="{y1:.1f}" width="{w_tag:.1f}" height="20" rx="6" fill="{C["advertenciaSuave"]}"/>'
            )
            marcos_svg.append(
                f'<text x="{x1 + 10:.1f}" y="{y1 + 14:.1f}" font-size="10" font-weight="700" '
                f'fill="{C["advertencia"]}">{t}</text>'
            )
            marcos_svg.append(
                f'<text x="{x1 + w_tag + 10:.1f}" y="{y1 + 14:.1f}" font-size="10.5" font-weight="500" '
                f'fill="{C["advertencia"]}">[{etiqueta}]</text>'
            )
            for y_corte, texto_corte in cortes:
                marcos_svg.append(
                    f'<line x1="{x1:.1f}" y1="{y_corte:.1f}" x2="{x2:.1f}" y2="{y_corte:.1f}" '
                    f'stroke="{C["advertencia"]}" stroke-width="1" stroke-dasharray="7 5"/>'
                )
                marcos_svg.append(
                    f'<text x="{x1 + 12:.1f}" y="{y_corte + 15:.1f}" font-size="10.5" font-weight="500" '
                    f'fill="{C["advertencia"]}">[{texto_corte}]</text>'
                )

        # Orden de pintado: lineas de vida y marcos van al fondo.
        cabeceras = L.piezas
        L.piezas = vida + marcos_svg + cabeceras
        for x0, y0n, w, texto in notas:
            nota(L, x0, y0n, w, texto, 10.5)

        L.alto = int(alto_final + 34)
        return L

    # ---------- piezas internas ----------

    def _flecha(self, y: float, de: str, a: str, lineas: list[str], retorno: bool) -> None:
        L = self.L
        x1, x2 = self.x(de), self.x(a)
        signo = 1 if x2 > x1 else -1
        x1 += signo * 7
        x2 -= signo * 7
        L.ruta(
            f"M {x1:.1f} {y:.1f} L {x2:.1f} {y:.1f}",
            color=C["textoSuave"] if retorno else C["texto"],
            grosor=1.3,
            discontinuo="6 5" if retorno else None,
            marca_fin="punta" if retorno else "punta-llena",
        )
        cy = y - 10 - (len(lineas) - 1) * 13
        for i, linea in enumerate(lineas):
            L.texto(
                (x1 + x2) / 2,
                cy + i * 13,
                linea,
                10.5,
                500 if not retorno else 400,
                C["texto"] if not retorno else C["textoSuave"],
                "middle",
            )

    def _auto(self, y: float, quien: str, lineas: list[str]) -> None:
        L = self.L
        x = self.x(quien) + 7
        w, h = 54, 24 + (len(lineas) - 1) * 6
        L.ruta(
            f"M {x:.1f} {y:.1f} L {x + w:.1f} {y:.1f} L {x + w:.1f} {y + h:.1f} L {x + 9:.1f} {y + h:.1f}",
            color=C["texto"],
            grosor=1.3,
            marca_fin="punta-llena",
        )
        for i, linea in enumerate(lineas):
            L.texto(x + w + 12, y + 4 + i * 14, linea, 10.5, 500, C["texto"])


def _monigote(L: Lienzo, cx: float, cy: float, nombre: str) -> None:
    c = C["primario"]
    L.piezas.append(
        f'<circle cx="{cx:.1f}" cy="{cy - 24:.1f}" r="8" fill="{C["superficie"]}" stroke="{c}" stroke-width="1.8"/>'
    )
    L.linea(cx, cy - 16, cx, cy + 4, c, 1.8)
    L.linea(cx - 11, cy - 8, cx + 11, cy - 8, c, 1.8)
    L.linea(cx, cy + 4, cx - 9, cy + 19, c, 1.8)
    L.linea(cx, cy + 4, cx + 9, cy + 19, c, 1.8)
    L.texto(cx, cy + 38, nombre, 12.5, 700, C["texto"], "middle")


# ===================================================================
#  05 — Confirmar una toma
# ===================================================================


def confirmar_toma() -> Lienzo:
    S = Secuencia(
        "Secuencia: confirmar una toma",
        "El recorrido completo de un toque en la pantalla, capa por capa (RegistrarToma.ts)",
        [
            ("", "actor", [("PAC", "Paciente", "")]),
            ("Infraestructura · entrada", "entrada", [("APP", "App móvil", "hoy.tsx"), ("API", "API HTTP", "routes/tomas.ts")]),
            ("Aplicación", "aplicacion", [("CU", "RegistrarToma", "caso de uso"), ("POL", "PoliticaDeAcceso", "")]),
            ("Dominio", "dominio", [("TOMA", "Toma", "entidad"), ("MED", "Medicamento", "entidad")]),
            ("Infraestructura · salida", "salida", [
                ("RTOM", "RepositorioDeTomas", "PostgreSQL"),
                ("RMED", "RepositorioDeMedicamentos", "PostgreSQL"),
                ("NOT", "Notificador", ""),
            ]),
        ],
    )

    S.activar("APP")
    S.mensaje("PAC", "APP", 'toca «Ya la tomé»')
    S.activar("API")
    S.mensaje("APP", "API", 'POST /api/tomas/{id}/registro\n{ acción: "CONFIRMAR" }')
    S.auto("API", "verificar token (JWT)\nvalidar cuerpo (Zod)")
    S.apunte(
        "API",
        "El adaptador HTTP solo valida la *forma* de los datos. Las reglas de negocio no están aquí.",
        286,
    )
    S.activar("CU")
    S.mensaje("API", "CU", "ejecutar({ solicitante, tomaId, acción })")

    S.activar("RTOM")
    S.mensaje("CU", "RTOM", "buscarPorId(tomaId)")
    S.retorno("RTOM", "CU", "Toma")
    S.desactivar("RTOM")

    S.activar("POL")
    S.mensaje("CU", "POL", 'asegurarAccesoAPaciente(solicitante,\npacienteId, "puedeRegistrarTomas")')
    S.abrir("alt", "sin vínculo o sin permiso", "APP", "POL")
    S.retorno("POL", "CU", "ErrorDeAutorizacion")
    S.retorno("CU", "API", "(excepción)")
    S.retorno("API", "APP", '403 «No tienes permiso…»')
    S.cerrar()
    S.retorno("POL", "CU", "autorizado")
    S.desactivar("POL")

    S.activar("TOMA")
    S.mensaje("CU", "TOMA", "confirmar({ ahora, origen,\nregistradaPorId })")
    S.abrir("alt", "la toma ya estaba resuelta", "CU", "TOMA")
    S.retorno("TOMA", "CU", "ErrorDeReglaDeNegocio")
    S.cerrar()
    S.auto("TOMA", "estado = TOMADA\nresueltaEn = ahora")
    S.retorno("TOMA", "CU", "ok")
    S.desactivar("TOMA")

    S.activar("RTOM")
    S.mensaje("CU", "RTOM", "guardar(toma)")
    S.retorno("RTOM", "CU", "ok")
    S.desactivar("RTOM")

    S.abrir("group", "descuento de inventario", "CU", "RMED")
    S.activar("RMED")
    S.mensaje("CU", "RMED", "buscarPorId(medicamentoId)")
    S.retorno("RMED", "CU", "Medicamento")
    S.desactivar("RMED")
    S.activar("MED")
    S.mensaje("CU", "MED", "registrarConsumoDeUnaDosis()")
    S.auto("MED", "stock = stock.descontar(\n  dosis.unidadesConsumidasPorToma)")
    S.retorno("MED", "CU", "ok")
    S.desactivar("MED")
    S.activar("RMED")
    S.mensaje("CU", "RMED", "guardar(medicamento)")
    S.retorno("RMED", "CU", "ok")
    S.desactivar("RMED")
    S.cerrar()

    S.abrir("alt", "stock.necesitaReabastecimiento", "API", "NOT")
    S.activar("NOT")
    S.mensaje("CU", "NOT", "enviar(aviso STOCK_BAJO)")
    S.retorno("NOT", "CU", "ok")
    S.desactivar("NOT")
    S.retorno("CU", "API", '{ toma, avisoDeStock: "Te quedan 3…" }')
    S.separar("inventario suficiente")
    S.retorno("CU", "API", "{ toma, avisoDeStock: null }")
    S.cerrar()
    S.desactivar("CU")

    S.retorno("API", "APP", "200 OK")
    S.desactivar("API")
    S.auto("APP", "recargar agenda\nresincronizar alarmas locales")
    S.retorno("APP", "PAC", 'tarjeta en verde «Tomada»\n+ aviso de inventario si aplica')
    S.desactivar("APP")

    L = S.construir()
    ancho_nota = L.ancho - 96
    y = L.alto - 10
    nota(
        L,
        48,
        y,
        ancho_nota,
        "*El caso de uso orquesta, no decide.* Cuánto inventario consume una dosis lo sabe Dosis; si la toma admite confirmarse lo sabe Toma. El caso de uso solo encadena esas decisiones y las persiste. Por eso las dos alternativas que cortan el flujo —sin permiso, toma ya resuelta— nacen en PoliticaDeAcceso y en la entidad, no en el adaptador HTTP.",
    )
    L.alto = int(y + medir_nota("x" * 400, ancho_nota) + 30)
    return L


# ===================================================================
#  06 — Generar la agenda del día
# ===================================================================


def agenda_del_dia() -> Lienzo:
    S = Secuencia(
        "Secuencia: generar la agenda del día",
        "Operación idempotente: consultarla diez veces el mismo día crea las tomas una sola vez",
        [
            ("Infraestructura · entrada", "entrada", [("APP", "App móvil", "")]),
            ("Aplicación", "aplicacion", [("CU", "ObtenerAgendaDelDia", "caso de uso")]),
            ("Dominio", "dominio", [
                ("MED", "Medicamento", "entidad"),
                ("FRE", "Frecuencia", "objeto de valor"),
                ("TOMA", "Toma", "entidad"),
                ("RES", "ResumenDeAdherencia", "servicio"),
            ]),
            ("Infraestructura · salida", "salida", [
                ("RMED", "RepositorioDeMedicamentos", ""),
                ("RTOM", "RepositorioDeTomas", ""),
            ]),
        ],
    )

    S.activar("CU")
    S.mensaje("APP", "CU", "ejecutar({ solicitante, pacienteId, fecha })")

    S.activar("RMED")
    S.mensaje("CU", "RMED", "listarPorPaciente(pacienteId, activos)")
    S.retorno("RMED", "CU", "Medicamento[]")
    S.desactivar("RMED")

    S.activar("RTOM")
    S.mensaje("CU", "RTOM", "listarPorPacienteEnRango(pacienteId, día)")
    S.retorno("RTOM", "CU", "Toma[] ya existentes")
    S.desactivar("RTOM")

    S.abrir("group", "calcular qué falta programar", "CU", "TOMA")
    S.abrir("loop", "por cada medicamento activo", "CU", "TOMA")
    S.activar("MED")
    S.mensaje("CU", "MED", "horariosDelDia(fecha)")
    S.auto("MED", "estaVigenteEn(fecha)")
    S.activar("FRE")
    S.mensaje("MED", "FRE", "aplicaEn(fecha, fechaInicio)")
    S.retorno("FRE", "MED", "sí / no")
    S.desactivar("FRE")
    S.retorno("MED", "CU", "Hora[]  (vacío si hoy no toca)")
    S.desactivar("MED")
    S.abrir("loop", "por cada hora sin toma creada", "CU", "TOMA")
    S.activar("TOMA")
    S.mensaje("CU", "TOMA", "programar({ id, medicamentoId,\npacienteId, programadaPara })")
    S.retorno("TOMA", "CU", "Toma en estado PENDIENTE")
    S.desactivar("TOMA")
    S.cerrar()
    S.cerrar()
    S.cerrar()

    S.abrir("alt", "hay tomas por crear", "CU", "RTOM")
    S.activar("RTOM")
    S.mensaje("CU", "RTOM", "programarSiNoExisten(candidatas)")
    S.apunte(
        "RTOM",
        "*ON CONFLICT DO NOTHING* sobre la clave (medicamento_id, programada_originalmente_para). Si otra petición simultánea ya las creó, el choque se ignora en silencio en vez de fallar. Antes de esta corrección, la petición que perdía la carrera devolvía un error 500.",
        300,
        "izq",
    )
    S.retorno("RTOM", "CU", "cuántas se insertaron")
    S.desactivar("RTOM")
    S.activar("RTOM")
    S.mensaje("CU", "RTOM", "listarPorPacienteEnRango(pacienteId, día)")
    S.apunte(
        "RTOM",
        "Se relee el día completo: puede que algunas tomas las haya creado la otra petición, y esas son las válidas.",
        300,
        "izq",
    )
    S.retorno("RTOM", "CU", "Toma[] definitivas")
    S.desactivar("RTOM")
    S.cerrar()

    S.activar("RES")
    S.mensaje("CU", "RES", "calcular(tomas, ventanaDeTolerancia)")
    S.retorno("RES", "CU", "ResumenDeAdherencia")
    S.desactivar("RES")

    S.retorno("CU", "APP", "{ fecha, elementos[], resumen }")
    S.desactivar("CU")
    S.auto("APP", "programar alarmas locales\n(expo-notifications)")

    L = S.construir()
    ancho_nota = L.ancho - 96
    y = L.alto - 10
    nota(
        L,
        48,
        y,
        ancho_nota,
        "*Operación idempotente.* Consultar la agenda diez veces el mismo día crea las tomas una sola vez. Verificado con 25 peticiones simultáneas contra PostgreSQL 16: sin duplicados y sin errores.",
    )
    L.alto = int(y + medir_nota("x" * 260, ancho_nota) + 30)
    return L
