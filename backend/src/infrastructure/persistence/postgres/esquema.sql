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
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cuidadores (
  id                   UUID PRIMARY KEY,
  nombre               TEXT        NOT NULL,
  email                TEXT        NOT NULL UNIQUE,
  telefono             TEXT,
  contrasena_cifrada   TEXT        NOT NULL,
  rol                  TEXT,
  activo               BOOLEAN     NOT NULL DEFAULT TRUE,
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

-- =============================================================
--  Alteraciones para bases de datos que ya existian
--
--  Se ejecutan sin dano si la columna ya esta. Mientras el
--  proyecto no incorpore una herramienta de migraciones, este
--  es el mecanismo para evolucionar el esquema sin perder datos.
-- =============================================================

ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS zona_horaria TEXT NOT NULL DEFAULT 'America/Bogota';
