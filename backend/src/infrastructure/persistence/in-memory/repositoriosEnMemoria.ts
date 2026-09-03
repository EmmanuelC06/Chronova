import type { Email } from '../../../domain/shared/Email.js';
import type { Identificador } from '../../../domain/shared/Identificador.js';
import { Cuidador } from '../../../domain/cuidador/Cuidador.js';
import type { CuidadorPlano } from '../../../domain/cuidador/Cuidador.js';
import type { RepositorioDeCuidadores } from '../../../domain/cuidador/RepositorioDeCuidadores.js';
import { Medicamento } from '../../../domain/medicamento/Medicamento.js';
import type { MedicamentoPlano } from '../../../domain/medicamento/Medicamento.js';
import type { RepositorioDeMedicamentos } from '../../../domain/medicamento/RepositorioDeMedicamentos.js';
import { Paciente } from '../../../domain/paciente/Paciente.js';
import type { PacientePlano } from '../../../domain/paciente/Paciente.js';
import type { RepositorioDePacientes } from '../../../domain/paciente/RepositorioDePacientes.js';
import { Toma } from '../../../domain/toma/Toma.js';
import type { TomaPlana } from '../../../domain/toma/Toma.js';
import type { RangoDeFechas, RepositorioDeTomas } from '../../../domain/toma/RepositorioDeTomas.js';
import { Dispositivo } from '../../../domain/dispositivo/Dispositivo.js';
import { SolicitudDeRecuperacion } from '../../../domain/recuperacion/SolicitudDeRecuperacion.js';
import type {
  SolicitudDeRecuperacionPlana,
  TipoDeCuenta,
} from '../../../domain/recuperacion/SolicitudDeRecuperacion.js';
import type { RepositorioDeRecuperaciones } from '../../../domain/recuperacion/RepositorioDeRecuperaciones.js';
import type { DispositivoPlano } from '../../../domain/dispositivo/Dispositivo.js';
import type { RepositorioDeDispositivos } from '../../../domain/dispositivo/RepositorioDeDispositivos.js';
import type { TokenDeDispositivo } from '../../../domain/dispositivo/TokenDeDispositivo.js';
import { Vinculo } from '../../../domain/vinculo/Vinculo.js';
import type { VinculoPlano } from '../../../domain/vinculo/Vinculo.js';
import type { RepositorioDeVinculos } from '../../../domain/vinculo/RepositorioDeVinculos.js';

/**
 * ADAPTADORES de persistencia en memoria.
 *
 * Cumplen exactamente los mismos puertos que los adaptadores de
 * PostgreSQL. Sirven para dos cosas:
 *
 *  1. Pruebas rapidas: los casos de uso se prueban completos, sin base
 *     de datos, en milisegundos.
 *  2. Arrancar el proyecto sin instalar nada (PERSISTENCE=memory).
 *
 * Que esto sea posible es la mejor demostracion de que la arquitectura
 * hexagonal esta bien aplicada: si el dominio dependiera de SQL, este
 * archivo no podria existir.
 *
 * Se guardan objetos planos y se reconstruyen las entidades al leer, que
 * es justo lo que hace una base de datos real. Asi el comportamiento es
 * equivalente y no se comparten referencias por accidente.
 */

export class RepositorioDePacientesEnMemoria implements RepositorioDePacientes {
  private readonly datos = new Map<string, PacientePlano>();

  async guardar(paciente: Paciente): Promise<void> {
    this.datos.set(paciente.id.valor, paciente.aPlano());
  }

  async buscarPorId(id: Identificador): Promise<Paciente | null> {
    const plano = this.datos.get(id.valor);
    return plano ? Paciente.desdePlano(plano) : null;
  }

  async buscarPorEmail(email: Email): Promise<Paciente | null> {
    for (const plano of this.datos.values()) {
      if (plano.email === email.valor) return Paciente.desdePlano(plano);
    }
    return null;
  }

  async existeConEmail(email: Email): Promise<boolean> {
    return (await this.buscarPorEmail(email)) !== null;
  }

  async listarPorIds(ids: readonly Identificador[]): Promise<Paciente[]> {
    const buscados = new Set(ids.map((i) => i.valor));
    return [...this.datos.values()]
      .filter((p) => buscados.has(p.id))
      .map((p) => Paciente.desdePlano(p));
  }
}

export class RepositorioDeCuidadoresEnMemoria implements RepositorioDeCuidadores {
  private readonly datos = new Map<string, CuidadorPlano>();

  async guardar(cuidador: Cuidador): Promise<void> {
    this.datos.set(cuidador.id.valor, cuidador.aPlano());
  }

  async buscarPorId(id: Identificador): Promise<Cuidador | null> {
    const plano = this.datos.get(id.valor);
    return plano ? Cuidador.desdePlano(plano) : null;
  }

  async buscarPorEmail(email: Email): Promise<Cuidador | null> {
    for (const plano of this.datos.values()) {
      if (plano.email === email.valor) return Cuidador.desdePlano(plano);
    }
    return null;
  }

  async existeConEmail(email: Email): Promise<boolean> {
    return (await this.buscarPorEmail(email)) !== null;
  }
}

export class RepositorioDeMedicamentosEnMemoria implements RepositorioDeMedicamentos {
  private readonly datos = new Map<string, MedicamentoPlano>();

  async guardar(medicamento: Medicamento): Promise<void> {
    this.datos.set(medicamento.id.valor, medicamento.aPlano());
  }

  async buscarPorId(id: Identificador): Promise<Medicamento | null> {
    const plano = this.datos.get(id.valor);
    return plano ? Medicamento.desdePlano(plano) : null;
  }

  async listarPorPaciente(
    pacienteId: Identificador,
    incluirSuspendidos = false,
  ): Promise<Medicamento[]> {
    return [...this.datos.values()]
      .filter((m) => m.pacienteId === pacienteId.valor && (incluirSuspendidos || m.activo))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map((m) => Medicamento.desdePlano(m));
  }

  async listarConStockBajo(pacienteId: Identificador): Promise<Medicamento[]> {
    const activos = await this.listarPorPaciente(pacienteId, false);
    return activos.filter((m) => m.stock.necesitaReabastecimiento);
  }

  async eliminar(id: Identificador): Promise<void> {
    this.datos.delete(id.valor);
  }
}

export class RepositorioDeTomasEnMemoria implements RepositorioDeTomas {
  private readonly datos = new Map<string, TomaPlana>();

  async guardar(toma: Toma): Promise<void> {
    this.datos.set(toma.id.valor, toma.aPlano());
  }

  async guardarVarias(tomas: readonly Toma[]): Promise<void> {
    for (const toma of tomas) this.datos.set(toma.id.valor, toma.aPlano());
  }

  async programarSiNoExisten(tomas: readonly Toma[]): Promise<number> {
    // Equivalente al UNIQUE (medicamento_id, programada_originalmente_para)
    // del esquema de PostgreSQL.
    const ocupadas = new Set(
      [...this.datos.values()].map(
        (t) => `${t.medicamentoId}@${t.programadaOriginalmentePara}`,
      ),
    );

    let insertadas = 0;
    for (const toma of tomas) {
      const plano = toma.aPlano();
      const clave = `${plano.medicamentoId}@${plano.programadaOriginalmentePara}`;
      if (ocupadas.has(clave)) continue;
      this.datos.set(plano.id, plano);
      ocupadas.add(clave);
      insertadas += 1;
    }
    return insertadas;
  }

  async buscarPorId(id: Identificador): Promise<Toma | null> {
    const plano = this.datos.get(id.valor);
    return plano ? Toma.desdePlano(plano) : null;
  }

  async listarPorPacienteEnRango(
    pacienteId: Identificador,
    rango: RangoDeFechas,
  ): Promise<Toma[]> {
    return this.filtrarEnRango(
      (t) => t.pacienteId === pacienteId.valor,
      rango,
    );
  }

  async listarPorMedicamentoEnRango(
    medicamentoId: Identificador,
    rango: RangoDeFechas,
  ): Promise<Toma[]> {
    return this.filtrarEnRango((t) => t.medicamentoId === medicamentoId.valor, rango);
  }

  async listarVencidas(limite: Date): Promise<Toma[]> {
    return [...this.datos.values()]
      .filter(
        (t) =>
          (t.estado === 'PENDIENTE' || t.estado === 'POSPUESTA') &&
          new Date(t.programadaPara).getTime() <= limite.getTime(),
      )
      .map((t) => Toma.desdePlano(t));
  }

  async eliminarPorMedicamento(medicamentoId: Identificador): Promise<void> {
    for (const [id, plano] of this.datos) {
      if (plano.medicamentoId === medicamentoId.valor) this.datos.delete(id);
    }
  }

  async eliminarPendientesDesde(medicamentoId: Identificador, desde: Date): Promise<number> {
    let retiradas = 0;
    for (const [id, plano] of this.datos) {
      const sinResolver = plano.estado === 'PENDIENTE' || plano.estado === 'POSPUESTA';
      // Se compara contra la hora ORIGINAL, que es la casilla por la que
      // la agenda identifica cada toma. Una toma pospuesta cuyo horario
      // original ya paso pertenece al pasado, aunque su nueva hora sea
      // dentro de un rato.
      const enElFuturo =
        new Date(plano.programadaOriginalmentePara).getTime() >= desde.getTime();

      if (plano.medicamentoId === medicamentoId.valor && sinResolver && enElFuturo) {
        this.datos.delete(id);
        retiradas += 1;
      }
    }
    return retiradas;
  }

  private filtrarEnRango(
    predicado: (t: TomaPlana) => boolean,
    rango: RangoDeFechas,
  ): Toma[] {
    return [...this.datos.values()]
      .filter((t) => {
        if (!predicado(t)) return false;
        // Se filtra por la hora ORIGINAL para que una toma pospuesta
        // siga perteneciendo al dia en que estaba programada.
        const instante = new Date(t.programadaOriginalmentePara).getTime();
        return instante >= rango.desde.getTime() && instante < rango.hasta.getTime();
      })
      .sort((a, b) => a.programadaPara.localeCompare(b.programadaPara))
      .map((t) => Toma.desdePlano(t));
  }
}

export class RepositorioDeVinculosEnMemoria implements RepositorioDeVinculos {
  private readonly datos = new Map<string, VinculoPlano>();

  async guardar(vinculo: Vinculo): Promise<void> {
    this.datos.set(vinculo.id.valor, vinculo.aPlano());
  }

  async buscarPorId(id: Identificador): Promise<Vinculo | null> {
    const plano = this.datos.get(id.valor);
    return plano ? Vinculo.desdePlano(plano) : null;
  }

  async buscarEntre(
    cuidadorId: Identificador,
    pacienteId: Identificador,
  ): Promise<Vinculo | null> {
    for (const plano of this.datos.values()) {
      if (plano.cuidadorId === cuidadorId.valor && plano.pacienteId === pacienteId.valor) {
        return Vinculo.desdePlano(plano);
      }
    }
    return null;
  }

  async listarPorCuidador(cuidadorId: Identificador): Promise<Vinculo[]> {
    return [...this.datos.values()]
      .filter((v) => v.cuidadorId === cuidadorId.valor)
      .map((v) => Vinculo.desdePlano(v));
  }

  async listarPorPaciente(pacienteId: Identificador): Promise<Vinculo[]> {
    return [...this.datos.values()]
      .filter((v) => v.pacienteId === pacienteId.valor)
      .map((v) => Vinculo.desdePlano(v));
  }
}

export class RepositorioDeDispositivosEnMemoria implements RepositorioDeDispositivos {
  private readonly datos = new Map<string, DispositivoPlano>();

  async guardar(dispositivo: Dispositivo): Promise<void> {
    this.datos.set(dispositivo.token.valor, dispositivo.aPlano());
  }

  async buscarPorToken(token: TokenDeDispositivo): Promise<Dispositivo | null> {
    const plano = this.datos.get(token.valor);
    return plano ? Dispositivo.desdePlano(plano) : null;
  }

  async listarPorPropietario(propietarioId: Identificador): Promise<Dispositivo[]> {
    return [...this.datos.values()]
      .filter((d) => d.propietarioId === propietarioId.valor)
      .map((d) => Dispositivo.desdePlano(d));
  }

  async eliminarPorToken(token: TokenDeDispositivo): Promise<void> {
    this.datos.delete(token.valor);
  }
}

// =================================================================
// Recuperaciones de contrasena
// =================================================================

export class RepositorioDeRecuperacionesEnMemoria implements RepositorioDeRecuperaciones {
  private readonly datos = new Map<string, SolicitudDeRecuperacionPlana>();

  async guardar(solicitud: SolicitudDeRecuperacion): Promise<void> {
    this.datos.set(solicitud.id.valor, solicitud.aPlano());
  }

  async buscarVigentePorUsuario(
    usuarioId: Identificador,
    tipoDeCuenta: TipoDeCuenta,
  ): Promise<SolicitudDeRecuperacion | null> {
    const candidatas = [...this.datos.values()]
      .filter(
        (s) =>
          s.usuarioId === usuarioId.valor &&
          s.tipoDeCuenta === tipoDeCuenta &&
          s.usadaEn === null,
      )
      // La mas reciente primero: si por lo que sea quedaran varias, la
      // que vale es la ultima que se pidio.
      .sort((a, b) => new Date(b.creadaEn).getTime() - new Date(a.creadaEn).getTime());

    const encontrada = candidatas[0];
    return encontrada ? SolicitudDeRecuperacion.desdePlano(encontrada) : null;
  }

  async invalidarAnteriores(
    usuarioId: Identificador,
    tipoDeCuenta: TipoDeCuenta,
  ): Promise<void> {
    for (const [id, plano] of this.datos) {
      if (
        plano.usuarioId === usuarioId.valor &&
        plano.tipoDeCuenta === tipoDeCuenta &&
        plano.usadaEn === null
      ) {
        this.datos.delete(id);
      }
    }
  }

  async eliminarCaducadas(limite: Date): Promise<number> {
    let borradas = 0;
    for (const [id, plano] of this.datos) {
      if (new Date(plano.expiraEn).getTime() < limite.getTime()) {
        this.datos.delete(id);
        borradas += 1;
      }
    }
    return borradas;
  }
}
