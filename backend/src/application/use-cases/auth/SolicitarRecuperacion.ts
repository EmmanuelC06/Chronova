import { Email } from '../../../domain/shared/Email.js';
import { CodigoDeRecuperacion } from '../../../domain/recuperacion/CodigoDeRecuperacion.js';
import { SolicitudDeRecuperacion } from '../../../domain/recuperacion/SolicitudDeRecuperacion.js';
import type { TipoDeCuenta } from '../../../domain/recuperacion/SolicitudDeRecuperacion.js';
import type { RepositorioDeRecuperaciones } from '../../../domain/recuperacion/RepositorioDeRecuperaciones.js';
import type { RepositorioDeCuidadores } from '../../../domain/cuidador/RepositorioDeCuidadores.js';
import type { RepositorioDePacientes } from '../../../domain/paciente/RepositorioDePacientes.js';
import type { CifradorDeContrasenas } from '../../ports/CifradorDeContrasenas.js';
import type { EnviadorDeCorreo } from '../../ports/EnviadorDeCorreo.js';
import type { GeneradorDeCodigos } from '../../ports/GeneradorDeCodigos.js';
import type { GeneradorDeIds } from '../../ports/GeneradorDeIds.js';
import type { Reloj } from '../../ports/Reloj.js';
import type { Identificador } from '../../../domain/shared/Identificador.js';

/** Una cuenta ya resuelta a partir del correo. */
interface CuentaResuelta {
  id: Identificador;
  tipo: TipoDeCuenta;
  nombre: string;
  email: string;
}

export interface ComandoSolicitarRecuperacion {
  email: string;
  /** Si se omite, se busca primero como paciente y luego como cuidador. */
  tipo?: TipoDeCuenta;
}

export interface ResultadoDeSolicitud {
  /** Siempre el mismo, exista o no la cuenta. Ver la nota de abajo. */
  mensaje: string;
  minutosDeVigencia: number;
}

/**
 * CASO DE USO: pedir un codigo para recuperar la contrasena.
 *
 * LA DECISION IMPORTANTE: responde exactamente lo mismo exista o no la
 * cuenta. Si dijera "no hay ninguna cuenta con ese correo", cualquiera
 * podria averiguar quien esta registrado en una aplicacion de salud
 * probando correos, y saber que alguien usa Chronova ya dice algo sobre
 * su salud. Es la misma regla que ya seguia el inicio de sesion.
 *
 * De ahi que este caso de uso no lance ningun error por "no encontrado":
 * cuando la cuenta no existe, simplemente no hace nada y devuelve el
 * mismo mensaje.
 */
export class SolicitarRecuperacion {
  constructor(
    private readonly pacientes: RepositorioDePacientes,
    private readonly cuidadores: RepositorioDeCuidadores,
    private readonly recuperaciones: RepositorioDeRecuperaciones,
    private readonly cifrador: CifradorDeContrasenas,
    private readonly codigos: GeneradorDeCodigos,
    private readonly ids: GeneradorDeIds,
    private readonly reloj: Reloj,
    private readonly correo: EnviadorDeCorreo,
  ) {}

  async ejecutar(comando: ComandoSolicitarRecuperacion): Promise<ResultadoDeSolicitud> {
    const respuesta: ResultadoDeSolicitud = {
      mensaje:
        'Si ese correo tiene una cuenta en Chronova, te enviamos un codigo para restablecer tu contrasena.',
      minutosDeVigencia: SolicitudDeRecuperacion.MINUTOS_DE_VIGENCIA,
    };

    let email: Email;
    try {
      email = Email.desde(comando.email);
    } catch {
      // Un correo mal escrito tampoco distingue: mismo mensaje.
      return respuesta;
    }

    const cuenta = await this.buscarCuenta(email, comando.tipo);
    if (!cuenta) return respuesta;

    const ahora = this.reloj.ahora();

    // Solo el ultimo codigo pedido debe servir.
    await this.recuperaciones.invalidarAnteriores(cuenta.id, cuenta.tipo);

    const codigo = CodigoDeRecuperacion.desde(
      this.codigos.nuevo(CodigoDeRecuperacion.LONGITUD),
    );

    const solicitud = SolicitudDeRecuperacion.abrir({
      id: this.ids.nuevo(),
      usuarioId: cuenta.id,
      tipoDeCuenta: cuenta.tipo,
      // Se guarda cifrado, igual que una contrasena: si alguien leyera la
      // base de datos, no obtendria codigos utilizables.
      codigoCifrado: await this.cifrador.cifrar(codigo.valor),
      ahora,
    });

    await this.recuperaciones.guardar(solicitud);

    await this.correo.enviar({
      para: cuenta.email,
      asunto: 'Tu codigo para recuperar la contrasena de Chronova',
      cuerpo: cuerpoDelCorreo(cuenta.nombre, codigo.valor),
    });

    return respuesta;
  }

  private async buscarCuenta(
    email: Email,
    tipo: TipoDeCuenta | undefined,
  ): Promise<CuentaResuelta | null> {
    if (tipo !== 'CUIDADOR') {
      const paciente = await this.pacientes.buscarPorEmail(email);
      if (paciente?.activo) {
        return {
          id: paciente.id,
          tipo: 'PACIENTE',
          nombre: paciente.nombre,
          email: paciente.email.valor,
        };
      }
    }

    if (tipo !== 'PACIENTE') {
      const cuidador = await this.cuidadores.buscarPorEmail(email);
      if (cuidador?.activo) {
        return {
          id: cuidador.id,
          tipo: 'CUIDADOR',
          nombre: cuidador.nombre,
          email: cuidador.email.valor,
        };
      }
    }

    return null;
  }
}

/**
 * El texto del correo.
 *
 * Escrito para que se entienda en la pantalla de notificaciones de un
 * telefono, donde muchas veces solo se ven las primeras lineas: el codigo
 * va arriba, no al final de un parrafo de cortesia.
 */
function cuerpoDelCorreo(nombre: string, codigo: string): string {
  return [
    `Hola, ${nombre}.`,
    '',
    `Tu codigo para restablecer la contrasena es:  ${codigo}`,
    '',
    `Escribelo en la aplicacion. Caduca en ${SolicitudDeRecuperacion.MINUTOS_DE_VIGENCIA} minutos.`,
    '',
    'Si no fuiste tu quien lo pidio, no tienes que hacer nada: tu contrasena',
    'sigue siendo la misma mientras nadie use este codigo.',
    '',
    'Chronova',
  ].join('\n');
}
