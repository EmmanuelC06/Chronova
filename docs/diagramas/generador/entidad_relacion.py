"""
Diagrama 08 — modelo entidad-relacion.

Refleja backend/src/infrastructure/persistence/postgres/esquema.sql.

Las relaciones se dibujan con la notacion de pata de gallo, que es la
que se usa en base de datos: la raya sencilla es "uno" y la pata abierta
es "muchos". La linea continua es una clave foranea de verdad; la
punteada NO lo es, y esa distincion es el punto del diagrama:
dispositivos y recuperaciones apuntan a pacientes O a cuidadores segun
una columna de tipo, y PostgreSQL no admite una foranea con dos
destinos.
"""

from __future__ import annotations

from lienzo import C, Lienzo
from piezas import Caja, camino, medir_nota, medir_tarjeta, nota, rotulo, tarjeta, titulo_de_lamina

PACIENTES = ("pacientes", [
    "*PK*   id : UUID",
], [
    "nombre : TEXT  NN",
    "*UQ*   email : TEXT  NN",
    "telefono : TEXT",
    "fecha_de_nacimiento : DATE",
    "contrasena_cifrada : TEXT  NN",
    "zona_horaria : TEXT  NN",
    "preferencias : JSONB  NN",
    "politica_version : TEXT",
    "politica_otorgada_en : TIMESTAMPTZ",
    "activo : BOOLEAN  NN",
    "creado_en : TIMESTAMPTZ  NN",
    "sesiones_validas_desde : TIMESTAMPTZ  NN",
])

CUIDADORES = ("cuidadores", [
    "*PK*   id : UUID",
], [
    "nombre : TEXT  NN",
    "*UQ*   email : TEXT  NN",
    "telefono : TEXT",
    "contrasena_cifrada : TEXT  NN",
    "rol : TEXT",
    "preferencias : JSONB",
    "politica_version : TEXT",
    "activo : BOOLEAN  NN",
    "creado_en : TIMESTAMPTZ  NN",
    "sesiones_validas_desde : TIMESTAMPTZ  NN",
])

MEDICAMENTOS = ("medicamentos", [
    "*PK*   id : UUID",
    "*FK*   paciente_id : UUID  NN",
], [
    "nombre : TEXT  NN",
    "dosis_cantidad : NUMERIC(10,2)  NN",
    "dosis_unidad : TEXT  NN",
    "frecuencia_tipo : TEXT  NN",
    "frecuencia_dias : SMALLINT[]  NN",
    "frecuencia_intervalo : INTEGER  NN",
    "horarios : TEXT[]  NN",
    "fecha_inicio : DATE  NN",
    "fecha_fin : DATE",
    "instrucciones : TEXT",
    "stock_unidades : INTEGER  NN",
    "stock_umbral : INTEGER  NN",
    "activo : BOOLEAN  NN",
    "creado_en : TIMESTAMPTZ  NN",
    "actualizado_en : TIMESTAMPTZ  NN",
])

TOMAS = ("tomas", [
    "*PK*   id : UUID",
    "*FK*   medicamento_id : UUID  NN",
    "*FK*   paciente_id : UUID  NN",
], [
    "programada_para : TIMESTAMPTZ  NN",
    "*UQ*   programada_originalmente_para : TIMESTAMPTZ  NN",
    "estado : TEXT  NN",
    "resuelta_en : TIMESTAMPTZ",
    "origen_del_registro : TEXT",
    "registrada_por_id : UUID",
    "observaciones : TEXT",
    "veces_pospuesta : INTEGER  NN",
])

VINCULOS = ("vinculos", [
    "*PK*   id : UUID",
    "*FK*   cuidador_id : UUID  NN",
    "*FK*   paciente_id : UUID  NN",
], [
    "estado : TEXT  NN",
    "parentesco : TEXT",
    "permisos : JSONB  NN",
    "solicitado_por : TEXT  NN",
    "creado_en : TIMESTAMPTZ  NN",
    "resuelto_en : TIMESTAMPTZ",
])

DISPOSITIVOS = ("dispositivos", [
    "*PK*   id : UUID",
], [
    "propietario_id : UUID  NN",
    "tipo_de_propietario : TEXT  NN",
    "*UQ*   token : TEXT  NN",
    "plataforma : TEXT  NN",
    "registrado_en : TIMESTAMPTZ  NN",
    "ultimo_uso_en : TIMESTAMPTZ  NN",
])

RECUPERACIONES = ("recuperaciones", [
    "*PK*   id : UUID",
], [
    "usuario_id : UUID  NN",
    "tipo_de_cuenta : TEXT  NN",
    "codigo_cifrado : TEXT  NN",
    "creada_en : TIMESTAMPTZ  NN",
    "expira_en : TIMESTAMPTZ  NN",
    "intentos : INTEGER  NN",
    "usada_en : TIMESTAMPTZ",
])


def _tabla(L: Lienzo, x: float, y: float, spec, w: float = None) -> Caja:
    nombre, claves, columnas = spec
    return tarjeta(L, x, y, nombre, [claves, columnas], "tabla", w)


def _medida(spec):
    nombre, claves, columnas = spec
    return medir_tarjeta(nombre, [claves, columnas], "tabla")


def modelo_relacional() -> Lienzo:
    MARGEN = 52
    HUECO = 96

    anchos = {s[0]: _medida(s)[0] for s in
              (PACIENTES, CUIDADORES, MEDICAMENTOS, TOMAS, VINCULOS, DISPOSITIVOS, RECUPERACIONES)}
    w = max(anchos.values())

    # Fila de arriba: las dos tablas de personas y las dos del tratamiento.
    # Fila de abajo: las tres que cuelgan de ellas.
    x = [MARGEN + i * (w + HUECO) for i in range(4)]
    y0 = 156

    L = Lienzo(int(x[3] + w + MARGEN), 4000)
    titulo_de_lamina(
        L,
        "Modelo entidad-relación",
        "Las siete tablas de PostgreSQL, tal como las crea esquema.sql",
    )

    t_tom = _tabla(L, x[0], y0, TOMAS, w)
    t_med = _tabla(L, x[1], y0, MEDICAMENTOS, w)
    t_pac = _tabla(L, x[2], y0, PACIENTES, w)
    t_cui = _tabla(L, x[3], y0, CUIDADORES, w)

    y1 = max(t_med.y2, t_tom.y2, t_pac.y2, t_cui.y2) + 132
    t_vin = _tabla(L, x[1], y1, VINCULOS, w)
    t_dis = _tabla(L, x[2], y1, DISPOSITIVOS, w)
    t_rec = _tabla(L, x[3], y1, RECUPERACIONES, w)

    alto_tablas = max(t_vin.y2, t_dis.y2, t_rec.y2)

    # ================= relaciones =================
    # Cada linea entra por un lado libre. Las que saltan una columna
    # bajan a un carril propio entre las dos filas, en vez de cruzar en
    # diagonal por encima de las tablas de en medio.

    def uno_a_muchos(puntos, etiqueta, xe, ye, foranea=True):
        camino(
            L,
            puntos,
            fin="pata",
            inicio="uno",
            discontinuo=None if foranea else "7 5",
            color=C["textoSuave"] if foranea else C["advertencia"],
        )
        if etiqueta:
            rotulo(L, xe, ye, etiqueta, 10.5, None if foranea else C["advertencia"])

    # --- vecinas: en linea recta ---
    uno_a_muchos([t_pac.izq(0.16), t_med.der(0.16)], "sigue",
                 (t_pac.x + t_med.x2) / 2, t_pac.y + t_pac.h * 0.16 - 13)
    uno_a_muchos([t_med.izq(0.34), t_tom.der(0.34)], "genera",
                 (t_med.x + t_tom.x2) / 2, t_med.y + t_med.h * 0.34 - 13)

    # --- pacientes registra sus tomas: por encima de medicamentos ---
    lane = y0 - 34
    uno_a_muchos(
        [t_pac.arriba(0.5), (t_pac.cx, lane), (t_tom.cx, lane), t_tom.arriba(0.5)],
        "registra", (t_pac.cx + t_tom.cx) / 2, lane,
    )

    # --- las que bajan a la fila de abajo ---
    carril = y1 - 24
    for k, (origen, t_o, destino, t_d, etiqueta, foranea) in enumerate([
        (t_pac, 0.18, t_vin, 0.30, "autoriza", True),
        (t_cui, 0.30, t_vin, 0.70, "acompaña", True),
        (t_pac, 0.52, t_dis, 0.30, "", False),
        (t_cui, 0.52, t_dis, 0.70, "", False),
        (t_pac, 0.84, t_rec, 0.30, "", False),
        (t_cui, 0.84, t_rec, 0.70, "", False),
    ]):
        xo = origen.x + origen.w * t_o
        xd = destino.x + destino.w * t_d
        y_carril = carril - k * 15
        if abs(xo - xd) < 2:
            puntos = [origen.abajo(t_o), destino.arriba(t_d)]
        else:
            y_carril = carril - k * 15
            puntos = [origen.abajo(t_o), (xo, y_carril), (xd, y_carril), destino.arriba(t_d)]
        uno_a_muchos(puntos, etiqueta, (xo + xd) / 2, y_carril - 13 if abs(xo - xd) >= 2 else 0, foranea)

    L.texto(
        t_tom.x,
        y1 - 62,
        "las líneas punteadas no son claves foráneas: propietario_id y usuario_id",
        10.5,
        700,
        C["advertencia"],
    )
    L.texto(
        t_tom.x,
        y1 - 46,
        "apuntan a pacientes O a cuidadores según una columna de tipo",
        10.5,
        400,
        C["advertencia"],
    )

    # ================= notas =================
    NOTAS = [
        "*tomas* — UNIQUE (medicamento_id, programada_originalmente_para) impide que la agenda de un día se duplique si dos peticiones la generan a la vez. El adaptador usa ON CONFLICT DO NOTHING para que ese choque no se convierta en un error para el usuario. CHECK estado IN (PENDIENTE, POSPUESTA, TOMADA, OMITIDA) y CHECK origen_del_registro IN (PACIENTE, CUIDADOR, SISTEMA). Todas las claves foráneas son ON DELETE CASCADE.",
        "*medicamentos* — horarios es TEXT[]: un mismo tratamiento puede tener varias tomas al día. En el MVP anterior era una sola columna TIME, lo que obligaba a duplicar el medicamento por cada horario. La dosis se guarda separada en cantidad y unidad; como texto libre no se podía calcular el consumo. fecha_inicio y fecha_fin son DATE, no TIMESTAMP: son días del calendario, no instantes, y un día no se desplaza al cambiar de huso horario.",
        "*pacientes* — preferencias (JSONB) guarda tamaño de letra, contraste, alertas y minutos de gracia; vive en el servidor para que acompañen al paciente en cualquier teléfono donde inicie sesión. sesiones_validas_desde es como se cierran las sesiones abiertas sin guardar ninguna: el token lleva dentro esta fecha y, si no coincide con la guardada, deja de valer. zona_horaria (IANA, «America/Bogota») da sentido a los horarios: se guarda el nombre y no un desfase fijo porque el desfase cambia con el horario de verano.",
        "*dispositivos* y *recuperaciones* — propietario_id apunta a pacientes O a cuidadores según tipo_de_propietario, y PostgreSQL no admite una foránea con dos destinos. Se pierde integridad referencial y se gana no tener dos tablas casi idénticas; la integridad la cuida la aplicación. UNIQUE (token): el token identifica un aparato, así que si cambia de dueño se reasigna la fila, no se añade otra.",
        "*vinculos* — UNIQUE (cuidador_id, paciente_id): una sola relación por pareja. CHECK estado IN (PENDIENTE, ACEPTADO, RECHAZADO, REVOCADO). permisos es JSONB porque el conjunto de permisos puede crecer sin migrar la tabla.",
        "*recuperaciones* — codigo_cifrado: el código se guarda cifrado igual que una contraseña, así que quien leyera esta tabla no obtendría códigos utilizables. intentos y expira_en son lo que convierte seis dígitos en algo que no se puede adivinar: un millón de combinaciones, cinco disparos y treinta minutos. Índice parcial WHERE usada_en IS NULL: solo se busca entre las solicitudes vivas.",
    ]
    y_notas = alto_tablas + 52
    w_nota = (L.ancho - MARGEN * 2 - 2 * 24) / 3
    alto_fila = 0
    for i, texto in enumerate(NOTAS):
        col, fila = i % 3, i // 3
        if col == 0:
            alto_fila = max(medir_nota(n, w_nota) for n in NOTAS[fila * 3 : fila * 3 + 3])
        nota(L, MARGEN + col * (w_nota + 24), y_notas + fila * (alto_fila + 16), w_nota, texto)

    L.alto = int(y_notas + 2 * (alto_fila + 16) + 26)
    return L
