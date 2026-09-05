import { Email } from '../../../domain/shared/Email.js';
import { Telefono } from '../../../domain/shared/Telefono.js';
import { ErrorDeConflicto } from '../../../domain/shared/errores.js';
import { Cuidador } from '../../../domain/cuidador/Cuidador.js';
import type { RepositorioDeCuidadores } from '../../../domain/cuidador/RepositorioDeCuidadores.js';
import type { CifradorDeContrasenas } from '../../ports/CifradorDeContrasenas.js';
import type { GeneradorDeIds } from '../../ports/GeneradorDeIds.js';
import type { Reloj } from '../../ports/Reloj.js';
import type { ServicioDeTokens } from '../../ports/ServicioDeTokens.js';
import { validarFortalezaDeContrasena } from '../../services/politicaDeContrasenas.js';
import { versionAutorizadaOFallar } from '../../services/politicaDeDatos.js';
import type { ResultadoDeAutenticacion } from './RegistrarPaciente.js';

export interface ComandoRegistrarCuidador {
  nombre: string;
  email: string;
  contrasena: string;
  telefono?: string | null;
  rol?: string | null;
  /**
   * Autorizacion del titular. Obligatoria: sin ella no hay cuenta.
   * Ver application/services/politicaDeDatos.ts.
   */
  aceptaPoliticaDeDatos?: boolean;
  /** Version del texto que la persona tuvo delante al aceptar. */
  versionDePolitica?: string | null;
}

/** CASO DE USO: registrar un cuidador (familiar o profesional de la salud). */
export class RegistrarCuidador {
  constructor(
    private readonly cuidadores: RepositorioDeCuidadores,
    private readonly cifrador: CifradorDeContrasenas,
    private readonly tokens: ServicioDeTokens,
    private readonly ids: GeneradorDeIds,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(comando: ComandoRegistrarCuidador): Promise<ResultadoDeAutenticacion> {
    const email = Email.desde(comando.email);
    validarFortalezaDeContrasena(comando.contrasena);

    const versionDePolitica = versionAutorizadaOFallar(comando);

    if (await this.cuidadores.existeConEmail(email)) {
      throw new ErrorDeConflicto('Ya existe una cuenta de cuidador con ese correo electronico.');
    }

    const cuidador = Cuidador.registrar({
      id: this.ids.nuevo(),
      nombre: comando.nombre,
      email,
      telefono: Telefono.opcional(comando.telefono),
      contrasenaCifrada: await this.cifrador.cifrar(comando.contrasena),
      versionDePolitica,
      rol: comando.rol ?? null,
      ahora: this.reloj.ahora(),
    });

    await this.cuidadores.guardar(cuidador);

    return {
      token: this.tokens.emitir({
        usuarioId: cuidador.id.valor,
        tipo: 'CUIDADOR',
        validaDesde: cuidador.sesionesValidasDesde.getTime(),
      }),
      usuario: {
        id: cuidador.id.valor,
        nombre: cuidador.nombre,
        email: cuidador.email.valor,
        tipo: 'CUIDADOR',
      },
    };
  }
}
