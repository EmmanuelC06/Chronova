"""
Diagrama 03 — clases de la capa de dominio.

Refleja backend/src/domain/.

La colocacion sigue los AGREGADOS del dominio, no el orden alfabetico:
cada columna es una entidad raiz con los objetos de valor que solo
existen dentro de ella. Asi la mayoria de las relaciones —diez de las
treinta— son verticales y cortas, dentro de su columna, y el ojo puede
leer una columna entera sin seguir una linea hasta el otro extremo.

Las columnas van ordenadas de modo que las entidades que se relacionan
queden vecinas: Toma junto a Medicamento, Medicamento junto a Paciente,
Paciente junto a Vinculo. Las cuatro relaciones que no caben asi
—paciente y cuidador con sus dispositivos y sus recuperaciones— bajan
por un carril horizontal y suben a su destino, en vez de cruzar el
dibujo en diagonal.
"""

from __future__ import annotations

from lienzo import C, Lienzo
from piezas import (
    Caja,
    camino,
    cardinalidad,
    conector,
    grupo,
    medir_nota,
    medir_tarjeta,
    nota,
    rotulo,
    tarjeta,
    titulo_de_lamina,
)

SEP = 26
PAD_G = 20
PAD_G_TOP = 46


# ---- definicion de cada clase: (nombre, familia, [atributos], [metodos]) ----

TOMA = (
    "Toma",
    "entidad",
    [
        "+ id : Identificador",
        "+ medicamentoId : Identificador",
        "+ pacienteId : Identificador",
        "+ programadaOriginalmentePara : Date",
        "- programadaPara : Date",
        "- estado : EstadoDeToma",
        "- resueltaEn : Date",
        "- origenDelRegistro : OrigenDeRegistro",
        "- registradaPorId : Identificador",
        "- observaciones : string",
        "- vecesPospuesta : number",
    ],
    [
        "+ programar(datos) : Toma",
        "+ *confirmar(datos)*",
        "+ *omitir(datos)*",
        "+ *posponer(minutos, ahora)*",
        "+ cerrarPorFaltaDeRespuesta(ahora)",
        "+ puntualidad(tolerancia) : Puntualidad",
        "+ minutosDeDesfase() : number",
        "+ estaVencidaEn(ahora, gracia) : boolean",
    ],
)

RESUMEN = (
    "ResumenDeAdherencia",
    "servicio",
    [
        "+ totalProgramadas : number",
        "+ tomadas : number",
        "+ omitidas : number",
        "+ pendientes : number",
    ],
    [
        "+ *calcular(tomas, tolerancia)*",
        "+ porcentaje : number",
        "+ nivel : NivelDeAdherencia",
        "+ requiereAtencionDelCuidador : boolean",
    ],
)

MEDICAMENTO = (
    "Medicamento",
    "entidad",
    [
        "+ id : Identificador",
        "+ pacienteId : Identificador",
        "- nombre : string",
        "- dosis : Dosis",
        "- frecuencia : Frecuencia",
        "- horarios : Hora[]",
        "- fechaInicio : FechaLocal",
        "- fechaFin : FechaLocal",
        "- instrucciones : string",
        "- stock : Stock",
        "- activo : boolean",
    ],
    [
        "+ crear(datos) : Medicamento",
        "+ estaVigenteEn(fecha) : boolean",
        "+ *horariosDelDia(fecha)* : Hora[]",
        "+ registrarConsumoDeUnaDosis()",
        "+ reabastecer(unidades)",
        "+ definirUmbralDeAlerta(umbral)",
        "+ actualizar(cambios)",
        "+ suspender()",
        "+ perteneceA(pacienteId) : boolean",
    ],
)

PACIENTE = (
    "Paciente",
    "entidad",
    [
        "+ id : Identificador",
        "+ creadoEn : Date",
        "- nombre : string",
        "- email : Email",
        "- telefono : Telefono",
        "- fechaDeNacimiento : FechaLocal",
        "- contrasenaCifrada : string",
        "- zonaHoraria : ZonaHoraria",
        "- preferencias : PreferenciasDeAccesibilidad",
        "- activo : boolean",
        "- sesionesValidasDesde : Date",
    ],
    [
        "+ registrar(datos) : Paciente",
        "+ edadEn(fecha) : number",
        "+ esAdultoMayorEn(fecha) : boolean",
        "+ actualizarPerfil(cambios)",
        "+ cambiarPreferencias(prefs)",
        "+ *cambiarContrasena(hash, ahora)*",
        "+ *cerrarSesionesAbiertas(ahora)*",
        "+ desactivar(ahora)",
    ],
)

CUIDADOR = (
    "Cuidador",
    "entidad",
    [
        "+ id : Identificador",
        "+ creadoEn : Date",
        "- nombre : string",
        "- email : Email",
        "- telefono : Telefono",
        "- contrasenaCifrada : string",
        "- rol : string",
        "- activo : boolean",
        "- sesionesValidasDesde : Date",
    ],
    [
        "+ registrar(datos) : Cuidador",
        "+ actualizarPerfil(cambios)",
        "+ *cambiarContrasena(hash, ahora)*",
        "+ *cerrarSesionesAbiertas(ahora)*",
        "+ desactivar(ahora)",
    ],
)

VINCULO = (
    "Vinculo",
    "entidad",
    [
        "+ id : Identificador",
        "+ cuidadorId : Identificador",
        "+ pacienteId : Identificador",
        "+ solicitadoPor : Origen",
        "- estado : EstadoDeVinculo",
        "- parentesco : string",
        "- permisos : PermisosDelCuidador",
        "- resueltoEn : Date",
    ],
    [
        "+ solicitar(datos) : Vinculo",
        "+ aceptar(ahora)",
        "+ rechazar(ahora)",
        "+ revocar(ahora)",
        "+ cambiarPermisos(nuevos)",
        "+ *autorizar(permiso)* : boolean",
    ],
)

DISPOSITIVO = (
    "Dispositivo",
    "entidad",
    [
        "+ id : Identificador",
        "+ token : TokenDeDispositivo",
        "+ registradoEn : Date",
        "- propietarioId : Identificador",
        "- tipoDePropietario : TipoDePropietario",
        "- plataforma : Plataforma",
        "- ultimoUsoEn : Date",
    ],
    [
        "+ registrar(datos) : Dispositivo",
        "+ *reasignarA(propietario, tipo, ahora)*",
        "+ marcarComoUsado(ahora)",
        "+ perteneceA(propietarioId) : boolean",
    ],
)

SOLICITUD = (
    "SolicitudDeRecuperacion",
    "entidad",
    [
        "+ id : Identificador",
        "+ usuarioId : Identificador",
        "+ tipoDeCuenta : TipoDeCuenta",
        "+ codigoCifrado : string",
        "+ creadaEn : Date",
        "+ expiraEn : Date",
        "- intentos : number",
        "- usadaEn : Date",
    ],
    [
        "+ MINUTOS_DE_VIGENCIA = 30",
        "+ MAXIMO_DE_INTENTOS = 5",
        "+ abrir(datos) : SolicitudDeRecuperacion",
        "+ *motivoParaRechazar(ahora)* : Motivo",
        "+ registrarIntento()",
        "+ marcarComoUsada(ahora)",
    ],
)

# ---- objetos de valor ----
DOSIS = ("Dosis", "vo", ["+ cantidad : number", "+ unidad : UnidadDeDosis"],
         ["+ desde(cantidad, unidad) : Dosis", "+ descripcion : string",
          "+ *unidadesConsumidasPorToma* : number"])
STOCK = ("Stock", "vo", ["+ unidadesDisponibles : number", "+ umbralDeAlerta : number"],
         ["+ desde(unidades, umbral) : Stock", "+ sinControl() : Stock",
          "+ *necesitaReabastecimiento* : boolean", "+ estaAgotado : boolean",
          "+ descontar(unidades) : Stock", "+ reabastecer(unidades) : Stock"])
FRECUENCIA = ("Frecuencia", "vo",
              ["+ tipo : TipoDeFrecuencia", "+ diasDeLaSemana : number[]", "+ intervaloEnDias : number"],
              ["+ diaria() : Frecuencia", "+ diasDeLaSemana(dias) : Frecuencia",
               "+ cadaNDias(n) : Frecuencia", "+ *aplicaEn(fecha, inicio)* : boolean"])
HORA = ("Hora", "vo", ["+ horas : number", "+ minutos : number"],
        ["+ desde(texto) : Hora", "+ minutosDesdeMedianoche : number"])
PREFERENCIAS = ("PreferenciasDeAccesibilidad", "vo",
                ["+ tamanoDeLetra : TamanoDeLetra", "+ altoContraste : boolean",
                 "+ alertasSonoras : boolean", "+ alertasVibracion : boolean",
                 "+ minutosDeGracia : number"], [])
ZONA = ("ZonaHoraria", "vo", ["+ valor : string"],
        ["+ desde(valor) : ZonaHoraria", "+ *instanteDe(fecha, hora)* : Date",
         "+ *fechaLocalDe(instante)* : FechaLocal", "+ horaDePareDe(instante) : string",
         "+ inicioDelDia(fecha) : Date"])
FECHA = ("FechaLocal", "vo", ["+ anio : number", "+ mes : number", "+ dia : number"],
         ["+ desde(texto) : FechaLocal", "+ diaDeLaSemana : number",
          "+ sumarDias(n) : FechaLocal", "+ diasHasta(otra) : number"])
EMAIL = ("Email", "vo", ["+ valor : string"], ["+ desde(valor) : Email"])
IDENT = ("Identificador", "vo", ["+ valor : string"],
         ["+ desde(valor) : Identificador", "+ esIgualA(otro) : boolean"])
TOKEN = ("TokenDeDispositivo", "vo", ["+ valor : string"],
         ["+ desde(valor) : TokenDeDispositivo", "+ esIgualA(otro) : boolean"])
CODIGO = ("CodigoDeRecuperacion", "vo", ["+ valor : string"],
          ["+ LONGITUD = 6", "+ desde(texto) : CodigoDeRecuperacion", "+ esIgualA(otro) : boolean"])

# ---- enumeraciones ----
E_TOMA = ("EstadoDeToma", "enum", ["PENDIENTE", "POSPUESTA", "TOMADA", "OMITIDA"], [])
E_VINCULO = ("EstadoDeVinculo", "enum", ["PENDIENTE", "ACEPTADO", "RECHAZADO", "REVOCADO"], [])
E_NIVEL = ("NivelDeAdherencia", "enum", ["BUENA", "REGULAR", "BAJA", "SIN_DATOS"], [])
E_PROP = ("TipoDePropietario", "enum", ["PACIENTE", "CUIDADOR"], [])
E_MOTIVO = ("MotivoDeRechazo", "enum",
            ["CADUCADA", "YA_USADA", "DEMASIADOS_INTENTOS", "CODIGO_INCORRECTO"], [])


def _medidas(clase) -> tuple[float, float]:
    nombre, familia, attrs, metodos = clase
    return medir_tarjeta(nombre, [attrs, metodos], familia)


def _columna(L: Lienzo, x: float, y: float, etiqueta: str, clases: list) -> tuple[Caja, dict]:
    """Apila las clases de un agregado dentro de un contenedor etiquetado."""
    anchos = [_medidas(c)[0] for c in clases]
    w = max(anchos)
    alto = PAD_G_TOP + sum(_medidas(c)[1] for c in clases) + SEP * (len(clases) - 1) + PAD_G
    caja_grupo = grupo(L, x, y, w + PAD_G * 2, alto, etiqueta)
    puestas: dict[str, Caja] = {}
    cy = y + PAD_G_TOP
    for clase in clases:
        nombre, familia, attrs, metodos = clase
        puestas[nombre] = tarjeta(L, x + PAD_G, cy, nombre, [attrs, metodos], familia, w)
        cy += _medidas(clase)[1] + SEP
    return caja_grupo, puestas


def clases_del_dominio() -> Lienzo:
    COLUMNAS = [
        ("Seguimiento de la toma", [TOMA, RESUMEN, E_TOMA, E_NIVEL]),
        ("Tratamiento", [MEDICAMENTO, DOSIS, STOCK, FRECUENCIA, HORA]),
        ("Personas", [PACIENTE, CUIDADOR, PREFERENCIAS, ZONA, FECHA]),
        ("Acompañamiento", [VINCULO, E_VINCULO]),
        ("Avisos en el teléfono", [DISPOSITIVO, TOKEN, E_PROP]),
        ("Recuperación de la cuenta", [SOLICITUD, CODIGO, E_MOTIVO]),
    ]
    # Identificador y Email no cuelgan de ningun agregado: los usan todos.
    COMPARTIDOS = ("Compartidos por todo el dominio", [IDENT, EMAIL])

    HUECO = 82
    x = 130
    y0 = 156
    L = Lienzo(4000, 4000)  # se ajusta al final
    titulo_de_lamina(
        L,
        "Clases del dominio",
        "Una columna por agregado: la entidad raíz y los objetos de valor que solo viven dentro de ella",
    )

    grupos: dict[str, Caja] = {}
    columna_de: dict[str, Caja] = {}
    cajas: dict[str, Caja] = {}
    for etiqueta, clases in COLUMNAS:
        g, puestas = _columna(L, x, y0, etiqueta, clases)
        grupos[etiqueta] = g
        cajas.update(puestas)
        for nombre in puestas:
            columna_de[nombre] = g
        x = g.x2 + HUECO

    # Compartidos no cuelga de ningun agregado: lo usan todos. Va en el
    # hueco que deja la columna corta de Acompanamiento.
    g_acomp = grupos["Acompañamiento"]
    g_comp, puestas = _columna(L, g_acomp.x, g_acomp.y2 + 44, COMPARTIDOS[0], COMPARTIDOS[1])
    cajas.update(puestas)
    for nombre in puestas:
        columna_de[nombre] = g_comp

    ancho_total = x - HUECO + 130
    alto_columnas = max(g.y2 for g in list(grupos.values()) + [g_comp])
    B = cajas

    # ---- pasillos ----
    # Ninguna linea pasa por encima de una caja: las relaciones dentro de
    # una columna salen por el costado y bajan por el pasillo que queda
    # entre esa columna y la anterior.
    def canal(nombre: str, carril: int = 0) -> float:
        return columna_de[nombre].x - 18 - carril * 13

    def compone(padre: str, hijo: str, carril: int, card: str = "1", etiqueta: str = "", t: float = 0.92):
        cx = canal(padre, carril)
        camino(
            L,
            [B[padre].izq(t), (cx, B[padre].y + B[padre].h * t), (cx, B[hijo].cy), B[hijo].izq()],
            fin=None,
            inicio="rombo-lleno",
        )
        cardinalidad(L, B[hijo].x - 22, B[hijo].cy - 9, card)
        if etiqueta:
            rotulo(L, cx, B[hijo].cy - 21, etiqueta)

    def usa(desde: str, hasta: str, carril: int, etiqueta: str = "", t: float = 0.92):
        cx = canal(desde, carril)
        camino(
            L,
            [B[desde].izq(t), (cx, B[desde].y + B[desde].h * t), (cx, B[hasta].cy), B[hasta].izq()],
            fin="punta",
            discontinuo="6 5",
        )
        if etiqueta:
            rotulo(L, cx, B[hasta].cy - 21, etiqueta)

    def directo(padre: str, hijo: str, marca: str, card: str = "", etiqueta: str = "", punteado=None):
        conector(
            L,
            B[padre].abajo(),
            B[hijo].arriba(),
            "vhv",
            fin="punta" if marca == "punta" else None,
            inicio=None if marca == "punta" else marca,
            discontinuo=punteado,
        )
        if card:
            cardinalidad(L, B[hijo].cx + 22, B[hijo].y - 11, card)
        if etiqueta:
            rotulo(L, B[hijo].cx, (B[padre].y2 + B[hijo].y) / 2, etiqueta)

    # ---- composiciones dentro del agregado ----
    compone("Medicamento", "Dosis", 0)
    compone("Medicamento", "Stock", 1)
    compone("Medicamento", "Frecuencia", 2)
    compone("Medicamento", "Hora", 3, "1..12", "horarios")
    compone("Paciente", "PreferenciasDeAccesibilidad", 0)
    compone("Paciente", "ZonaHoraria", 1)
    compone("Dispositivo", "TokenDeDispositivo", 0)
    compone("SolicitudDeRecuperacion", "CodigoDeRecuperacion", 0, "1", "cifra")

    # ---- dependencias hacia las enumeraciones ----
    usa("Toma", "EstadoDeToma", 0)
    usa("ResumenDeAdherencia", "NivelDeAdherencia", 1)
    usa("Dispositivo", "TipoDePropietario", 1)
    usa("SolicitudDeRecuperacion", "MotivoDeRechazo", 1)
    directo("Vinculo", "EstadoDeVinculo", "punta", punteado="6 5")
    directo("ZonaHoraria", "FechaLocal", "punta", etiqueta="traduce con", punteado="6 5")

    # ResumenDeAdherencia se calcula sobre las tomas.
    cx = canal("Toma", 2)
    camino(
        L,
        [
            B["ResumenDeAdherencia"].izq(0.3),
            (cx, B["ResumenDeAdherencia"].y + B["ResumenDeAdherencia"].h * 0.3),
            (cx, B["Toma"].y + B["Toma"].h * 0.88),
            B["Toma"].izq(0.88),
        ],
        fin="punta",
        discontinuo="6 5",
    )
    rotulo(L, cx, (B["Toma"].y2 + B["ResumenDeAdherencia"].y) / 2, "calcula\nsobre")

    # ---- agregaciones entre columnas vecinas ----
    def agrega(uno: str, muchos: str, etiqueta: str, t_uno: float = 0.5, t_muchos: float = 0.5):
        izquierda = B[uno].x < B[muchos].x
        p1 = B[uno].der(t_uno) if izquierda else B[uno].izq(t_uno)
        p2 = B[muchos].izq(t_muchos) if izquierda else B[muchos].der(t_muchos)
        conector(L, p1, p2, "recto", fin=None, inicio="rombo-hueco")
        rotulo(L, (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2 - 12, etiqueta)
        cardinalidad(L, p1[0] + (26 if izquierda else -26), p1[1] - 10, "1")
        cardinalidad(L, p2[0] - (26 if izquierda else -26), p2[1] - 10, "0..*")

    agrega("Paciente", "Medicamento", "sigue", 0.14, 0.14)
    agrega("Medicamento", "Toma", "genera", 0.26, 0.26)

    # Paciente registra sus tomas: pasa por encima del agregado
    # Tratamiento, el unico camino que no atraviesa ninguna caja.
    lane_sup = y0 - 38
    camino(
        L,
        [
            B["Paciente"].arriba(0.7),
            (B["Paciente"].x + B["Paciente"].w * 0.7, lane_sup),
            (B["Toma"].x + B["Toma"].w * 0.7, lane_sup),
            B["Toma"].arriba(0.7),
        ],
        fin=None,
        inicio="rombo-hueco",
    )
    rotulo(L, (B["Paciente"].cx + B["Toma"].cx) / 2, lane_sup, "registra    1 → 0..*")

    # Paciente y Cuidador con el vinculo: columnas vecinas.
    for quien, t_o, t_v, etiqueta in (
        ("Paciente", 0.88, 0.22, "0..*"),
        ("Cuidador", 0.36, 0.62, "acompaña a   0..*"),
    ):
        p1 = B[quien].der(t_o)
        p2 = B["Vinculo"].izq(t_v)
        conector(L, p1, p2, "recto", fin=None)
        rotulo(L, (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2 - 12, etiqueta)

    # Medicamento guarda dos fechas de calendario.
    cx = canal("Paciente", 3)
    camino(
        L,
        [
            B["Medicamento"].der(0.06),
            (cx, B["Medicamento"].y + B["Medicamento"].h * 0.06),
            (cx, B["FechaLocal"].cy),
            B["FechaLocal"].izq(),
        ],
        fin=None,
        inicio="rombo-lleno",
    )
    cardinalidad(L, B["FechaLocal"].x - 22, B["FechaLocal"].cy - 9, "1..2")
    rotulo(L, cx, B["FechaLocal"].cy - 21, "inicio / fin")

    # ---- las cuatro que no caben de lado ----
    carril = alto_columnas + 60
    salida = grupos["Personas"].x2 + 20
    for i, (origen, destino, etiqueta) in enumerate(
        [
            ("Paciente", "Dispositivo", "recibe avisos en"),
            ("Cuidador", "Dispositivo", "recibe avisos en"),
            ("Paciente", "SolicitudDeRecuperacion", "abre"),
            ("Cuidador", "SolicitudDeRecuperacion", "abre"),
        ]
    ):
        y_carril = carril + i * 30
        t_o = 0.94 - i * 0.06 if origen == "Paciente" else 0.86 - i * 0.06
        x_salida = salida + i * 13
        x_entrada = canal(destino, 2 + (i % 2))
        y_destino = B[destino].y + B[destino].h * (0.30 + 0.18 * (i % 2))
        camino(
            L,
            [
                B[origen].der(t_o),
                (x_salida, B[origen].y + B[origen].h * t_o),
                (x_salida, y_carril),
                (x_entrada, y_carril),
                (x_entrada, y_destino),
                (B[destino].x, y_destino),
            ],
            fin=None,
            inicio="rombo-hueco",
        )
        rotulo(L, (x_salida + x_entrada) / 2, y_carril, f"{origen} {etiqueta}    1 → 0..*", 10)

    # ================= notas =================
    NOTAS = [
        "*adherencia = tomadas / (tomadas + omitidas)*. Las tomas pendientes no cuentan: todavía se pueden confirmar.  BUENA ≥ 80%  ·  REGULAR ≥ 50%  ·  BAJA < 50%",
        "*programadaOriginalmentePara* nunca cambia. La puntualidad se mide contra esa hora y no contra la corrida por los aplazamientos: de lo contrario, posponer tres veces haría que toda toma pareciera puntual.",
        "*ZonaHoraria* traduce entre la *hora de pared* del paciente («las 8 de la mañana») y el *instante* que se guarda y dispara la alarma. Sin ella, un servidor en UTC agendaba la pastilla de las 08:00 de una paciente colombiana a las 03:00 de la madrugada.",
        "*sesionesValidasDesde* es lo que permite cerrar las sesiones abiertas sin que el servidor guarde ni una sola sesión. En vez de recordar los tokens que ha repartido, recuerda DESDE CUÁNDO los acepta: cambiar la contraseña mueve esa fecha y todos los tokens anteriores dejan de valer.",
        "*Stock* es inmutable: descontar() y reabastecer() devuelven un Stock nuevo. El *token* de Dispositivo identifica un aparato, no a una persona; por eso puede cambiar de dueño con *reasignarA()* en vez de crear otra fila.",
        "*SolicitudDeRecuperacion* — tres reglas la protegen y las tres viven *aquí*, no en el servidor web ni en la base: caduca a los 30 minutos, se usa una sola vez y admite cinco intentos. *registrarIntento()* se llama antes de saber si el código era correcto: un contador que solo cuenta fallos se esquiva alternando códigos.",
        "*Identificador*, *Email*, *Telefono* y *FechaLocal* los usan casi todas las entidades. Se dibujan solo las dependencias que no cruzan el diagrama; las demás se omiten a propósito, porque dibujarlas todas tapaba las relaciones que sí importan.",
    ]
    y = carril + 4 * 30 + 56
    ancho_nota = (ancho_total - 96 - 2 * 24) / 3
    alto_fila = 0
    for i, texto in enumerate(NOTAS):
        col = i % 3
        fila = i // 3
        if col == 0:
            alto_fila = max(medir_nota(n, ancho_nota) for n in NOTAS[fila * 3 : fila * 3 + 3])
        nota(L, 48 + col * (ancho_nota + 24), y + fila * (alto_fila + 16), ancho_nota, texto)

    L.ancho = int(ancho_total)
    L.alto = int(y + 3 * (alto_fila + 16) + 20)
    return L
