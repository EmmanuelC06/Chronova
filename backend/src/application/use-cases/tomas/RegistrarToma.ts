import { Identificador } from '../../../domain/shared/Identificador.js';
import { ErrorNoEncontrado } from '../../../domain/shared/errores.js';
import type { RepositorioDeMedicamentos } from '../../../domain/medicamento/RepositorioDeMedicamentos.js';
import type { RepositorioDeTomas } from '../../../domain/toma/RepositorioDeTomas.js';
import type { TomaPlana } from '../../../domain/toma/Toma.js';
import type { Notificador } from '../../ports/Notificador.js';
import type { Reloj } from '../../ports/Reloj.js';
import type { PoliticaDeAcceso, Solicitante } from '../../services/PoliticaDeAcceso.js';

export type AccionSobreLaToma = 'CONFIRMAR' | 'OMITIR' | 'POSPONER';

export interface ComandoRegistrarToma {
  solicitante: Solicitante;
  tomaId: string;
  accion: AccionSobreLaToma;
  observaciones?: string | null;
  /** Solo para POSPONER. */
  minutos?: number;
}

export interface ResultadoDeRegistrarToma {
  toma: TomaPlana;
  /** Aviso para la interfaz cuando el inventario queda bajo. */
  avisoDeStock: string | null;
}

/**
 * CASO DE USO: registrar lo que paso con una toma.
 *
 * Concentra las tres acciones (confirmar, omitir, posponer) en un solo
 * caso de uso porque comparten exactamente las mismas comprobaciones de
 * permisos y el mismo efecto sobre el inventario. Separarlas en tres
 * clases casi identicas seria repetir codigo sin ganar nada.
 *
 * Efecto secundario importante: confirmar una toma descuenta stock. Esa
 * regla vive en la entidad Medicamento, no aqui; el caso de uso solo la
 * invoca y persiste el resultado.
 */
export class RegistrarToma {
  constructor(
    private readonly tomas: RepositorioDeTomas,
    private readonly medicamentos: RepositorioDeMedicamentos,
    private readonly politica: PoliticaDeAcceso,
    private readonly reloj: Reloj,
    private readonly notificador: Notificador,
  ) {}

  async ejecutar(comando: ComandoRegistrarToma): Promise<ResultadoDeRegistrarToma> {
    const toma = await this.tomas.buscarPorId(Identificador.desde(comando.tomaId));
    if (!toma) throw new ErrorNoEncontrado('la toma', comando.tomaId);

    await this.politica.asegurarAccesoAPaciente(
      comando.solicitante,
      toma.pacienteId,
      'puedeRegistrarTomas',
    );

    const ahora = this.reloj.ahora();
    const origen = comando.solicitante.tipo;

    switch (comando.accion) {
      case 'CONFIRMAR':
        toma.confirmar({
          ahora,
          origen,
          registradaPorId: comando.solicitante.id,
          observaciones: comando.observaciones ?? null,
        });
        break;
      case 'OMITIR':
        toma.omitir({
          ahora,
          origen,
          registradaPorId: comando.solicitante.id,
          motivo: comando.observaciones ?? null,
        });
        break;
      case 'POSPONER':
        toma.posponer(comando.minutos ?? 15, ahora);
        break;
    }

    await this.tomas.guardar(toma);

    let avisoDeStock: string | null = null;

    if (comando.accion === 'CONFIRMAR') {
      const medicamento = await this.medicamentos.buscarPorId(toma.medicamentoId);
      if (medicamento) {
        medicamento.registrarConsumoDeUnaDosis();
        await this.medicamentos.guardar(medicamento);

        if (medicamento.stock.necesitaReabastecimiento) {
          avisoDeStock = medicamento.stock.estaAgotado
            ? `Se acabo el ${medicamento.nombre}. Consigue mas antes de la proxima toma.`
            : `Te quedan ${medicamento.stock.unidadesDisponibles} unidades de ${medicamento.nombre}.`;

          await this.notificador.enviar({
            tipo: 'STOCK_BAJO',
            destinatarioId: toma.pacienteId,
            tipoDeDestinatario: 'PACIENTE',
            titulo: 'Queda poco medicamento',
            cuerpo: avisoDeStock,
            datos: { medicamentoId: medicamento.id.valor },
          });
        }
      }
    }

    return { toma: toma.aPlano(), avisoDeStock };
  }
}
