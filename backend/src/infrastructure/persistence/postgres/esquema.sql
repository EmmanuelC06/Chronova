-- =============================================================
--  Esquema de base de datos de Chronova
--  Se ejecuta con:  npm run db:migrate
--
--  Nota sobre nombres: en SQL se usa snake_case en minusculas.
--  El MVP anterior usaba nombres con mayusculas entre comillas
--  ("idPaciente"), lo que obliga a citar cada columna en cada
--  consulta y es una fuente constante de errores.
-- =============================================================

CREATE TABLE IF NOT EXISTS pacientes (
  id                   UUID PRIMARY KEY,
  nombre               TEXT        NOT NULL,
  email                TEXT        NOT NULL UNIQUE,
  telefono             TEXT,
  fecha_de_nacimiento  DATE,
  contrasena_cifrada   TEXT        NOT NULL,
  -- Zona horaria IANA del paciente. Es la que da sentido a sus horarios:
  -- "las 8:00" significa las 8 donde vive el, no donde este el servidor.
  zona_horaria         TEXT        NOT NULL DEFAULT 'America/Bogota',
  preferencias         JSONB       NOT NULL DEFAULT '{}'::jsonb,
  activo               BOOLEAN     NOT NULL DEFAULT TRUE,
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Todo token emitido antes de esta marca deja de valer. Ver la nota
  -- extensa en la seccion de alteraciones, mas abajo.
  sesiones_validas_desde TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cuidadores (
  id                   UUID PRIMARY KEY,
  nombre               TEXT        NOT NULL,
  email                TEXT        NOT NULL UNIQUE,
  telefono             TEXT,
  contrasena_cifrada   TEXT        NOT NULL,
  rol                  TEXT,
  activo               BOOLEAN     NOT NULL DEFAULT TRUE,
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sesiones_validas_desde TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medicamentos (
  id                    UUID PRIMARY KEY,
  paciente_id           UUID        NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  nombre                TEXT        NOT NULL,
  dosis_cantidad        NUMERIC(10,2) NOT NULL CHECK (dosis_cantidad > 0),
  dosis_unidad          TEXT        NOT NULL,
  frecuencia_tipo       TEXT        NOT NULL
                        CHECK (frecuencia_tipo IN ('DIARIA','DIAS_DE_LA_SEMANA','CADA_N_DIAS')),
  frecuencia_dias       SMALLINT[]  NOT NULL DEFAULT '{}',
  frecuencia_intervalo  INTEGER     NOT NULL DEFAULT 1,
  horarios              TEXT[]      NOT NULL,
  fecha_inicio          DATE        NOT NULL,
  fecha_fin             DATE,
  instrucciones         TEXT,
  stock_unidades        INTEGER     NOT NULL DEFAULT 0 CHECK (stock_unidades >= 0),
  stock_umbral          INTEGER     NOT NULL DEFAULT 0 CHECK (stock_umbral >= 0),
  activo                BOOLEAN     NOT NULL DEFAULT TRUE,
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medicamentos_paciente
  ON medicamentos(paciente_id) WHERE activo;

CREATE TABLE IF NOT EXISTS tomas (
  id                             UUID PRIMARY KEY,
  medicamento_id                 UUID        NOT NULL REFERENCES medicamentos(id) ON DELETE CASCADE,
  paciente_id                    UUID        NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  programada_para                TIMESTAMPTZ NOT NULL,
  programada_originalmente_para  TIMESTAMPTZ NOT NULL,
  estado                         TEXT        NOT NULL
                                 CHECK (estado IN ('PENDIENTE','POSPUESTA','TOMADA','OMITIDA')),
  resuelta_en                    TIMESTAMPTZ,
  origen_del_registro            TEXT CHECK (origen_del_registro IN ('PACIENTE','CUIDADOR','SISTEMA')),
  registrada_por_id              UUID,
  observaciones                  TEXT,
  veces_pospuesta                INTEGER     NOT NULL DEFAULT 0,
  -- Evita que la agenda se duplique si se genera dos veces a la vez.
  UNIQUE (medicamento_id, programada_originalmente_para)
);

CREATE INDEX IF NOT EXISTS idx_tomas_paciente_fecha
  ON tomas(paciente_id, programada_originalmente_para DESC);

CREATE INDEX IF NOT EXISTS idx_tomas_pendientes
  ON tomas(programada_para) WHERE estado IN ('PENDIENTE','POSPUESTA');

CREATE TABLE IF NOT EXISTS vinculos (
  id              UUID PRIMARY KEY,
  cuidador_id     UUID        NOT NULL REFERENCES cuidadores(id) ON DELETE CASCADE,
  paciente_id     UUID        NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  estado          TEXT        NOT NULL
                  CHECK (estado IN ('PENDIENTE','ACEPTADO','RECHAZADO','REVOCADO')),
  parentesco      TEXT,
  permisos        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  solicitado_por  TEXT        NOT NULL CHECK (solicitado_por IN ('PACIENTE','CUIDADOR')),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resuelto_en     TIMESTAMPTZ,
  UNIQUE (cuidador_id, paciente_id)
);

CREATE INDEX IF NOT EXISTS idx_vinculos_cuidador ON vinculos(cuidador_id);
CREATE INDEX IF NOT EXISTS idx_vinculos_paciente ON vinculos(paciente_id);

CREATE TABLE IF NOT EXISTS dispositivos (
  id                   UUID PRIMARY KEY,
  -- Apunta a un paciente O a un cuidador, por lo que no lleva clave
  -- foranea: PostgreSQL no permite una que referencie a dos tablas.
  -- El precio es que la integridad de esta columna la cuida la
  -- aplicacion; a cambio, no hacen falta dos tablas casi identicas.
  propietario_id       UUID        NOT NULL,
  tipo_de_propietario  TEXT        NOT NULL
                       CHECK (tipo_de_propietario IN ('PACIENTE','CUIDADOR')),
  -- El token identifica un aparato, no una persona. Es unico en todo el
  -- sistema: si el telefono cambia de dueno, la fila se reasigna.
  token                TEXT        NOT NULL UNIQUE,
  plataforma           TEXT        NOT NULL CHECK (plataforma IN ('android','ios','web')),
  registrado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultimo_uso_en        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispositivos_propietario
  ON dispositivos(propietario_id);

-- =============================================================
--  Alteraciones para bases de datos que ya existian
--
--  Se ejecutan sin dano si la columna ya esta. Mientras el
--  proyecto no incorpore una herramienta de migraciones, este
--  es el mecanismo para evolucionar el esquema sin perder datos.
-- =============================================================

ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS zona_horaria TEXT NOT NULL DEFAULT 'America/Bogota';

-- ---------------------------------------------------------------
-- Cierre de sesiones abiertas
-- ---------------------------------------------------------------
-- El servidor no guarda las sesiones que reparte: firma un token y
-- confia en la firma. Eso escala bien, pero significa que un token
-- robado sigue valiendo hasta que caduque, y cambiar la contrasena no
-- lo tocaba: el intruso seguia dentro hasta siete dias mas.
--
-- Esta columna lo resuelve sin guardar ni una sesion. En lugar de
-- recordar los tokens repartidos, se recuerda DESDE CUANDO se aceptan:
-- al cambiar la contrasena se pone la hora actual, y todo token emitido
-- antes deja de valer en la siguiente peticion.
--
-- El DEFAULT NOW() es para las filas que ya existen. En una cuenta
-- nueva vale lo mismo que creado_en.
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS sesiones_validas_desde TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE cuidadores
  ADD COLUMN IF NOT EXISTS sesiones_validas_desde TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ---------------------------------------------------------------
-- Autorizacion de tratamiento de datos
-- ---------------------------------------------------------------
-- El articulo 8, literal b) de la Ley 1581 de 2012 le da al titular el
-- derecho a pedir PRUEBA de la autorizacion que otorgo. Una casilla
-- marcada en una pantalla no es prueba de nada si no deja rastro.
--
-- Se guardan dos cosas: la VERSION del documento que acepto y el
-- INSTANTE exacto. Como cada version del texto se conserva en
-- docs/legal/, con esas dos columnas se reconstruye que leyo esa
-- persona, palabra por palabra, y cuando.
--
-- Se dejan NULL a proposito, sin valor por defecto: las cuentas creadas
-- antes de esto NO otorgaron nada, y ponerles una fecha inventada seria
-- fabricar una autorizacion que nadie dio. NULL significa "no consta",
-- y a esas cuentas hay que volver a preguntarles.
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS politica_version TEXT,
  ADD COLUMN IF NOT EXISTS politica_aceptada_en TIMESTAMPTZ;

ALTER TABLE cuidadores
  ADD COLUMN IF NOT EXISTS politica_version TEXT,
  ADD COLUMN IF NOT EXISTS politica_aceptada_en TIMESTAMPTZ;

-- ---------------------------------------------------------------
-- Recuperaciones de contrasena
-- ---------------------------------------------------------------
-- El codigo se guarda CIFRADO, igual que una contrasena: quien leyera
-- esta tabla no obtendria codigos utilizables.
--
-- usuario_id no lleva clave foranea porque apunta a pacientes o a
-- cuidadores segun tipo_de_cuenta. Es el mismo compromiso que en
-- dispositivos: se gana una tabla unica y se pierde integridad
-- referencial, que aqui compensa porque las filas caducan solas.
CREATE TABLE IF NOT EXISTS recuperaciones (
  id                UUID PRIMARY KEY,
  usuario_id        UUID NOT NULL,
  tipo_de_cuenta    TEXT NOT NULL CHECK (tipo_de_cuenta IN ('PACIENTE', 'CUIDADOR')),
  codigo_cifrado    TEXT NOT NULL,
  creada_en         TIMESTAMPTZ NOT NULL,
  expira_en         TIMESTAMPTZ NOT NULL,
  intentos          INTEGER NOT NULL DEFAULT 0,
  usada_en          TIMESTAMPTZ
);

-- Cubre la consulta de "la vigente mas reciente de esta cuenta".
CREATE INDEX IF NOT EXISTS idx_recuperaciones_vigentes
  ON recuperaciones (usuario_id, tipo_de_cuenta, creada_en DESC)
  WHERE usada_en IS NULL;
