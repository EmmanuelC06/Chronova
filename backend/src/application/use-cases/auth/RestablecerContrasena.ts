import { Email } from '../../../domain/shared/Email.js';
import { Identificador } from '../../../domain/shared/Identificador.js';
import { CodigoDeRecuperacion } from '../../../domain/recuperacion/CodigoDeRecuperacion.js';
import type { TipoDeCuenta } from '../../../domain/recuperacion/SolicitudDeRecuperacion.js';
import type { RepositorioDeRecuperaciones } from '../../../domain/recuperacion/RepositorioDeRecuperaciones.js';
import { ErrorDeAutenticacion } from '../../../domain/shared/errores.js';
import type { RepositorioDeCuidadores } from '../../../domain/cuidador/RepositorioDeCuidadores.js';
import type { RepositorioDePacientes } from '../../../domain/paciente/RepositorioDePacientes.js';
import type { CifradorDeContrasenas } from '../../ports/CifradorDeContrasenas.js';
import type { Reloj } from '../../ports/Reloj.js';
import { validarFortalezaDeContrasena } from '../../services/politicaDeContrasenas.js';

/** Una cuenta ya resuelta, sea de paciente o de cuidador. */
interface CuentaResuelta {
  id: Identificador;
  tipo: TipoDeCuenta;
}

export interface ComandoRestablecerContrasena {
  email: string;
  codigo: string;
  nuevaContrasena: string;
  tipo?: TipoDeCuenta;
}

/**
 * CASO DE USO: cambiar la contrasena usando el codigo recibido.
 *
 * El mensaje de error es DELIBERADAMENTE UNO SOLO para todo lo que puede
 * ir mal —codigo equivocado, caducado, ya usado, agotados los intentos, o
 * un correo que no existe—. Distinguirlos ayudaria mas al que esta
 * probando codigos ajenos que al dueno legitimo, que casi siempre tiene
 * el correo abierto delante.
 *
 * La unica excepcion es quedarse sin intentos, donde si conviene decirlo:
 * el usuario tiene que saber que debe pedir un codigo nuevo, o se quedara
 * intentando con el mismo sin entender por que ya nunca funciona.
 */
export class RestablecerContrasena {
  constructor(
    private readonly pacientes: RepositorioDePacientes,
    private readonly cuidadores: RepositorioDeCuidadores,
    private readonly recuperaciones: RepositorioDeRecuperaciones,
    private readonly cifrador: CifradorDeContrasenas,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(comando: ComandoRestablecerContrasena): Promise<{ restablecida: true }> {
    // Se valida la contrasena nueva ANTES de gastar un intento: que la
    // persona escriba una clave demasiado corta no puede costarle uno de
    // los cinco intentos que tiene.
    validarFortalezaDeContrasena(comando.nuevaContrasena);
    const codigo = CodigoDeRecuperacion.desde(comando.codigo);

    const cuenta = await this.buscarCuenta(comando.email, comando.tipo);
    if (!cuenta) throw this.errorGenerico();

    const solicitud = await this.recuperaciones.buscarVigentePorUsuario(cuenta.id, cuenta.tipo);
    if (!solicitud) throw this.errorGenerico();

    const ahora = this.reloj.ahora();
    const motivo = solicitud.motivoParaRechazar(ahora);

    if (motivo === 'DEMASIADOS_INTENTOS') {
      throw new ErrorDeAutenticacion(
        'Ya se agotaron los intentos con ese codigo. Pide uno nuevo.',
      );
    }
    if (motivo !== null) throw this.errorGenerico();

    // El intento se anota ANTES de comprobar, y se guarda pase lo que
    // pase: si solo se contaran los fallos, bastaria con ir alternando.
    solicitud.registrarIntento();
    const acierta = await this.cifrador.verificar(codigo.valor, solicitud.codigoCifrado);

    if (!acierta) {
      await this.recuperaciones.guardar(solicitud);
      throw this.errorGenerico();
    }

    solicitud.marcarComoUsada(ahora);
    await this.recuperaciones.guardar(solicitud);

    await this.cambiarContrasenaDe(cuenta, await this.cifrador.cifrar(comando.nuevaContrasena));

    return { restablecida: true };
  }

  private errorGenerico(): ErrorDeAutenticacion {
    return new ErrorDeAutenticacion(
      'El codigo no es correcto o ya caduco. Pide uno nuevo si hace falta.',
    );
  }

  private async buscarCuenta(
    emailTexto: string,
    tipo: TipoDeCuenta | undefined,
  ): Promise<CuentaResuelta | null> {
    let email: Email;
    try {
      email = Email.desde(emailTexto);
    } catch {
      return null;
    }

    if (tipo !== 'CUIDADOR') {
      const paciente = await this.pacientes.buscarPorEmail(email);
      if (paciente?.activo) return { id: paciente.id, tipo: 'PACIENTE' };
    }
    if (tipo !== 'PACIENTE') {
      const cuidador = await this.cuidadores.buscarPorEmail(email);
      if (cuidador?.activo) return { id: cuidador.id, tipo: 'CUIDADOR' };
    }
    return null;
  }

  private async cambiarContrasenaDe(cuenta: CuentaResuelta, cifrada: string): Promise<void> {
    if (cuenta.tipo === 'PACIENTE') {
      const paciente = await this.pacientes.buscarPorId(cuenta.id);
      if (!paciente) throw this.errorGenerico();
      paciente.cambiarContrasena(cifrada);
      await this.pacientes.guardar(paciente);
      return;
    }

    const cuidador = await this.cuidadores.buscarPorId(cuenta.id);
    if (!cuidador) throw this.errorGenerico();
    cuidador.cambiarContrasena(cifrada);
    await this.cuidadores.guardar(cuidador);
  }
}
