import type pg from 'pg';
import type { Email } from '../../../domain/shared/Email.js';
import type { Identificador } from '../../../domain/shared/Identificador.js';
import { Cuidador } from '../../../domain/cuidador/Cuidador.js';
import type { RepositorioDeCuidadores } from '../../../domain/cuidador/RepositorioDeCuidadores.js';
import { Medicamento } from '../../../domain/medicamento/Medicamento.js';
import type { RepositorioDeMedicamentos } from '../../../domain/medicamento/RepositorioDeMedicamentos.js';
import { Paciente } from '../../../domain/paciente/Paciente.js';
import type { RepositorioDePacientes } from '../../../domain/paciente/RepositorioDePacientes.js';
import { Toma } from '../../../domain/toma/Toma.js';
import type { RangoDeFechas, RepositorioDeTomas } from '../../../domain/toma/RepositorioDeTomas.js';
import { Vinculo } from '../../../domain/vinculo/Vinculo.js';
import type { RepositorioDeVinculos } from '../../../domain/vinculo/RepositorioDeVinculos.js';

/**
 * ADAPTADORES de persistencia con PostgreSQL.
 *
 * Toda consulta SQL del proyecto vive en este archivo. Si manana hay que
 * optimizar un indice o migrar a otro motor, se toca aqui y en ningun
 * otro sitio: el dominio y los casos de uso ni se enteran.
 *
 * Todas las consultas usan parametros ($1, $2...) y nunca concatenan
 * texto, que es lo que evita la inyeccion SQL.
 */

function aFechaIso(valor: Date | string | null): string | null {
  if (valor === null) return null;
  return valor instanceof Date ? valor.toISOString() : new Date(valor).toISOString();
}

// =================================================================
// Pacientes
// =================================================================

export class RepositorioDePacientesPostgres implements RepositorioDePacientes {
  constructor(private readonly pool: pg.Pool) {}

  async guardar(paciente: Paciente): Promise<void> {
    const p = paciente.aPlano();
    await this.pool.query(
      `INSERT INTO pacientes
         (id, nombre, email, telefono, fecha_de_nacimiento, contrasena_cifrada, preferencias, activo, creado_en)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET
         nombre = EXCLUDED.nombre,
         telefono = EXCLUDED.telefono,
         fecha_de_nacimiento = EXCLUDED.fecha_de_nacimiento,
         contrasena_cifrada = EXCLUDED.contrasena_cifrada,
         preferencias = EXCLUDED.preferencias,
         activo = EXCLUDED.activo`,
      [
        p.id,
        p.nombre,
        p.email,
        p.telefono,
        p.fechaDeNacimiento,
        p.contrasenaCifrada,
        JSON.stringify(p.preferencias),
        p.activo,
        p.creadoEn,
      ],
    );
  }

  async buscarPorId(id: Identificador): Promise<Paciente | null> {
    const { rows } = await this.pool.query('SELECT * FROM pacientes WHERE id = $1', [id.valor]);
    return rows[0] ? this.aEntidad(rows[0]) : null;
  }

  async buscarPorEmail(email: Email): Promise<Paciente | null> {
    const { rows } = await this.pool.query('SELECT * FROM pacientes WHERE email = $1', [
      email.valor,
    ]);
    return rows[0] ? this.aEntidad(rows[0]) : null;
  }

  async existeConEmail(email: Email): Promise<boolean> {
    const { rowCount } = await this.pool.query('SELECT 1 FROM pacientes WHERE email = $1', [
      email.valor,
    ]);
    return (rowCount ?? 0) > 0;
  }

  async listarPorIds(ids: readonly Identificador[]): Promise<Paciente[]> {
    if (ids.length === 0) return [];
    const { rows } = await this.pool.query('SELECT * FROM pacientes WHERE id = ANY($1::uuid[])', [
      ids.map((i) => i.valor),
    ]);
    return rows.map((fila) => this.aEntidad(fila));
  }

  private aEntidad(fila: Record<string, any>): Paciente {
    return Paciente.desdePlano({
      id: fila.id,
      nombre: fila.nombre,
      email: fila.email,
      telefono: fila.telefono,
      fechaDeNacimiento: aFechaIso(fila.fecha_de_nacimiento),
      contrasenaCifrada: fila.contrasena_cifrada,
      preferencias: fila.preferencias ?? {},
      activo: fila.activo,
      creadoEn: aFechaIso(fila.creado_en)!,
    });
  }
}

// =================================================================
// Cuidadores
// =================================================================

export class RepositorioDeCuidadoresPostgres implements RepositorioDeCuidadores {
  constructor(private readonly pool: pg.Pool) {}

  async guardar(cuidador: Cuidador): Promise<void> {
    const c = cuidador.aPlano();
    await this.pool.query(
      `INSERT INTO cuidadores
         (id, nombre, email, telefono, contrasena_cifrada, rol, activo, creado_en)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET
         nombre = EXCLUDED.nombre,
         telefono = EXCLUDED.telefono,
         contrasena_cifrada = EXCLUDED.contrasena_cifrada,
         rol = EXCLUDED.rol,
         activo = EXCLUDED.activo`,
      [c.id, c.nombre, c.email, c.telefono, c.contrasenaCifrada, c.rol, c.activo, c.creadoEn],
    );
  }

  async buscarPorId(id: Identificador): Promise<Cuidador | null> {
    const { rows } = await this.pool.query('SELECT * FROM cuidadores WHERE id = $1', [id.valor]);
    return rows[0] ? this.aEntidad(rows[0]) : null;
  }

  async buscarPorEmail(email: Email): Promise<Cuidador | null> {
    const { rows } = await this.pool.query('SELECT * FROM cuidadores WHERE email = $1', [
      email.valor,
    ]);
    return rows[0] ? this.aEntidad(rows[0]) : null;
  }

  async existeConEmail(email: Email): Promise<boolean> {
    const { rowCount } = await this.pool.query('SELECT 1 FROM cuidadores WHERE email = $1', [
      email.valor,
    ]);
    return (rowCount ?? 0) > 0;
  }

  private aEntidad(fila: Record<string, any>): Cuidador {
    return Cuidador.desdePlano({
      id: fila.id,
      nombre: fila.nombre,
      email: fila.email,
      telefono: fila.telefono,
      contrasenaCifrada: fila.contrasena_cifrada,
      rol: fila.rol,
      activo: fila.activo,
      creadoEn: aFechaIso(fila.creado_en)!,
    });
  }
}

// =================================================================
// Medicamentos
// =================================================================

export class RepositorioDeMedicamentosPostgres implements RepositorioDeMedicamentos {
  constructor(private readonly pool: pg.Pool) {}

  async guardar(medicamento: Medicamento): Promise<void> {
    const m = medicamento.aPlano();
    await this.pool.query(
      `INSERT INTO medicamentos
         (id, paciente_id, nombre, dosis_cantidad, dosis_unidad, frecuencia_tipo,
          frecuencia_dias, frecuencia_intervalo, horarios, fecha_inicio, fecha_fin,
          instrucciones, stock_unidades, stock_umbral, activo, creado_en, actualizado_en)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT (id) DO UPDATE SET
         nombre = EXCLUDED.nombre,
         dosis_cantidad = EXCLUDED.dosis_cantidad,
         dosis_unidad = EXCLUDED.dosis_unidad,
         frecuencia_tipo = EXCLUDED.frecuencia_tipo,
         frecuencia_dias = EXCLUDED.frecuencia_dias,
         frecuencia_intervalo = EXCLUDED.frecuencia_intervalo,
         horarios = EXCLUDED.horarios,
         fecha_fin = EXCLUDED.fecha_fin,
         instrucciones = EXCLUDED.instrucciones,
         stock_unidades = EXCLUDED.stock_unidades,
         stock_umbral = EXCLUDED.stock_umbral,
         activo = EXCLUDED.activo,
         actualizado_en = EXCLUDED.actualizado_en`,
      [
        m.id,
        m.pacienteId,
        m.nombre,
        m.dosis.cantidad,
        m.dosis.unidad,
        m.frecuencia.tipo,
        m.frecuencia.diasDeLaSemana,
        m.frecuencia.intervaloEnDias,
        m.horarios,
        m.fechaInicio,
        m.fechaFin,
        m.instrucciones,
        m.stock.unidadesDisponibles,
        m.stock.umbralDeAlerta,
        m.activo,
        m.creadoEn,
        m.actualizadoEn,
      ],
    );
  }

  async buscarPorId(id: Identificador): Promise<Medicamento | null> {
    const { rows } = await this.pool.query('SELECT * FROM medicamentos WHERE id = $1', [id.valor]);
    return rows[0] ? this.aEntidad(rows[0]) : null;
  }

  async listarPorPaciente(
    pacienteId: Identificador,
    incluirSuspendidos = false,
  ): Promise<Medicamento[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM medicamentos
        WHERE paciente_id = $1 AND ($2::boolean OR activo)
        ORDER BY nombre`,
      [pacienteId.valor, incluirSuspendidos],
    );
    return rows.map((fila) => this.aEntidad(fila));
  }

  async listarConStockBajo(pacienteId: Identificador): Promise<Medicamento[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM medicamentos
        WHERE paciente_id = $1 AND activo
          AND stock_umbral > 0 AND stock_unidades <= stock_umbral
        ORDER BY stock_unidades`,
      [pacienteId.valor],
    );
    return rows.map((fila) => this.aEntidad(fila));
  }

  async eliminar(id: Identificador): Promise<void> {
    await this.pool.query('DELETE FROM medicamentos WHERE id = $1', [id.valor]);
  }

  private aEntidad(fila: Record<string, any>): Medicamento {
    return Medicamento.desdePlano({
      id: fila.id,
      pacienteId: fila.paciente_id,
      nombre: fila.nombre,
      dosis: { cantidad: Number(fila.dosis_cantidad), unidad: fila.dosis_unidad },
      frecuencia: {
        tipo: fila.frecuencia_tipo,
        diasDeLaSemana: (fila.frecuencia_dias ?? []).map(Number),
        intervaloEnDias: Number(fila.frecuencia_intervalo),
      },
      horarios: fila.horarios ?? [],
      fechaInicio: aFechaIso(fila.fecha_inicio)!,
      fechaFin: aFechaIso(fila.fecha_fin),
      instrucciones: fila.instrucciones,
      stock: {
        unidadesDisponibles: Number(fila.stock_unidades),
        umbralDeAlerta: Number(fila.stock_umbral),
      },
      activo: fila.activo,
      creadoEn: aFechaIso(fila.creado_en)!,
      actualizadoEn: aFechaIso(fila.actualizado_en)!,
    });
  }
}

// =================================================================
// Tomas
// =================================================================

export class RepositorioDeTomasPostgres implements RepositorioDeTomas {
  constructor(private readonly pool: pg.Pool) {}

  async guardar(toma: Toma): Promise<void> {
    await this.guardarVarias([toma]);
  }

  async guardarVarias(tomas: readonly Toma[]): Promise<void> {
    if (tomas.length === 0) return;

    // Una sola transaccion para todo el lote: o entran todas o ninguna.
    const cliente = await this.pool.connect();
    try {
      await cliente.query('BEGIN');
      for (const toma of tomas) {
        const t = toma.aPlano();
        await cliente.query(
          `INSERT INTO tomas
             (id, medicamento_id, paciente_id, programada_para, programada_originalmente_para,
              estado, resuelta_en, origen_del_registro, registrada_por_id, observaciones, veces_pospuesta)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (id) DO UPDATE SET
             programada_para = EXCLUDED.programada_para,
             estado = EXCLUDED.estado,
             resuelta_en = EXCLUDED.resuelta_en,
             origen_del_registro = EXCLUDED.origen_del_registro,
             registrada_por_id = EXCLUDED.registrada_por_id,
             observaciones = EXCLUDED.observaciones,
             veces_pospuesta = EXCLUDED.veces_pospuesta`,
          [
            t.id,
            t.medicamentoId,
            t.pacienteId,
            t.programadaPara,
            t.programadaOriginalmentePara,
            t.estado,
            t.resueltaEn,
            t.origenDelRegistro,
            t.registradaPorId,
            t.observaciones,
            t.vecesPospuesta,
          ],
        );
      }
      await cliente.query('COMMIT');
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    } finally {
      cliente.release();
    }
  }

  async programarSiNoExisten(tomas: readonly Toma[]): Promise<number> {
    if (tomas.length === 0) return 0;

    const cliente = await this.pool.connect();
    let insertadas = 0;
    try {
      await cliente.query('BEGIN');
      for (const toma of tomas) {
        const t = toma.aPlano();
        // La restriccion UNIQUE (medicamento_id, programada_originalmente_para)
        // es la que hace de arbitro si dos peticiones llegan a la vez.
        // DO NOTHING convierte ese choque en un no-evento en lugar de un error.
        const { rowCount } = await cliente.query(
          `INSERT INTO tomas
             (id, medicamento_id, paciente_id, programada_para, programada_originalmente_para,
              estado, resuelta_en, origen_del_registro, registrada_por_id, observaciones, veces_pospuesta)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (medicamento_id, programada_originalmente_para) DO NOTHING`,
          [
            t.id,
            t.medicamentoId,
            t.pacienteId,
            t.programadaPara,
            t.programadaOriginalmentePara,
            t.estado,
            t.resueltaEn,
            t.origenDelRegistro,
            t.registradaPorId,
            t.observaciones,
            t.vecesPospuesta,
          ],
        );
        insertadas += rowCount ?? 0;
      }
      await cliente.query('COMMIT');
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    } finally {
      cliente.release();
    }
    return insertadas;
  }

  async buscarPorId(id: Identificador): Promise<Toma | null> {
    const { rows } = await this.pool.query('SELECT * FROM tomas WHERE id = $1', [id.valor]);
    return rows[0] ? this.aEntidad(rows[0]) : null;
  }

  async listarPorPacienteEnRango(
    pacienteId: Identificador,
    rango: RangoDeFechas,
  ): Promise<Toma[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tomas
        WHERE paciente_id = $1
          AND programada_originalmente_para >= $2
          AND programada_originalmente_para < $3
        ORDER BY programada_originalmente_para`,
      [pacienteId.valor, rango.desde.toISOString(), rango.hasta.toISOString()],
    );
    return rows.map((fila) => this.aEntidad(fila));
  }

  async listarPorMedicamentoEnRango(
    medicamentoId: Identificador,
    rango: RangoDeFechas,
  ): Promise<Toma[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tomas
        WHERE medicamento_id = $1
          AND programada_originalmente_para >= $2
          AND programada_originalmente_para < $3
        ORDER BY programada_originalmente_para`,
      [medicamentoId.valor, rango.desde.toISOString(), rango.hasta.toISOString()],
    );
    return rows.map((fila) => this.aEntidad(fila));
  }

  async listarVencidas(limite: Date): Promise<Toma[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tomas
        WHERE estado IN ('PENDIENTE','POSPUESTA')
          AND programada_para <= $1
        ORDER BY programada_para
        LIMIT 500`,
      [limite.toISOString()],
    );
    return rows.map((fila) => this.aEntidad(fila));
  }

  async eliminarPorMedicamento(medicamentoId: Identificador): Promise<void> {
    await this.pool.query('DELETE FROM tomas WHERE medicamento_id = $1', [medicamentoId.valor]);
  }

  private aEntidad(fila: Record<string, any>): Toma {
    return Toma.desdePlano({
      id: fila.id,
      medicamentoId: fila.medicamento_id,
      pacienteId: fila.paciente_id,
      programadaPara: aFechaIso(fila.programada_para)!,
      programadaOriginalmentePara: aFechaIso(fila.programada_originalmente_para)!,
      estado: fila.estado,
      resueltaEn: aFechaIso(fila.resuelta_en),
      origenDelRegistro: fila.origen_del_registro,
      registradaPorId: fila.registrada_por_id,
      observaciones: fila.observaciones,
      vecesPospuesta: Number(fila.veces_pospuesta),
    });
  }
}

// =================================================================
// Vinculos
// =================================================================

export class RepositorioDeVinculosPostgres implements RepositorioDeVinculos {
  constructor(private readonly pool: pg.Pool) {}

  async guardar(vinculo: Vinculo): Promise<void> {
    const v = vinculo.aPlano();
    await this.pool.query(
      `INSERT INTO vinculos
         (id, cuidador_id, paciente_id, estado, parentesco, permisos, solicitado_por, creado_en, resuelto_en)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET
         estado = EXCLUDED.estado,
         parentesco = EXCLUDED.parentesco,
         permisos = EXCLUDED.permisos,
         resuelto_en = EXCLUDED.resuelto_en`,
      [
        v.id,
        v.cuidadorId,
        v.pacienteId,
        v.estado,
        v.parentesco,
        JSON.stringify(v.permisos),
        v.solicitadoPor,
        v.creadoEn,
        v.resueltoEn,
      ],
    );
  }

  async buscarPorId(id: Identificador): Promise<Vinculo | null> {
    const { rows } = await this.pool.query('SELECT * FROM vinculos WHERE id = $1', [id.valor]);
    return rows[0] ? this.aEntidad(rows[0]) : null;
  }

  async buscarEntre(
    cuidadorId: Identificador,
    pacienteId: Identificador,
  ): Promise<Vinculo | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM vinculos WHERE cuidador_id = $1 AND paciente_id = $2',
      [cuidadorId.valor, pacienteId.valor],
    );
    return rows[0] ? this.aEntidad(rows[0]) : null;
  }

  async listarPorCuidador(cuidadorId: Identificador): Promise<Vinculo[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM vinculos WHERE cuidador_id = $1 ORDER BY creado_en DESC',
      [cuidadorId.valor],
    );
    return rows.map((fila) => this.aEntidad(fila));
  }

  async listarPorPaciente(pacienteId: Identificador): Promise<Vinculo[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM vinculos WHERE paciente_id = $1 ORDER BY creado_en DESC',
      [pacienteId.valor],
    );
    return rows.map((fila) => this.aEntidad(fila));
  }

  private aEntidad(fila: Record<string, any>): Vinculo {
    return Vinculo.desdePlano({
      id: fila.id,
      cuidadorId: fila.cuidador_id,
      pacienteId: fila.paciente_id,
      estado: fila.estado,
      parentesco: fila.parentesco,
      permisos: { ...Vinculo.permisosPorDefecto(), ...(fila.permisos ?? {}) },
      solicitadoPor: fila.solicitado_por,
      creadoEn: aFechaIso(fila.creado_en)!,
      resueltoEn: aFechaIso(fila.resuelto_en),
    });
  }
}
