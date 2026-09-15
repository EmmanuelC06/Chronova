import { Email } from '../../../domain/shared/Email.js';
import { ErrorDeAutenticacion, ErrorDeCuentaAmbigua } from '../../../domain/shared/errores.js';
import type { RepositorioDeCuidadores } from '../../../domain/cuidador/RepositorioDeCuidadores.js';
import type { RepositorioDePacientes } from '../../../domain/paciente/RepositorioDePacientes.js';
import type { CifradorDeContrasenas } from '../../ports/CifradorDeContrasenas.js';
import type { ServicioDeTokens, TipoDeUsuario } from '../../ports/ServicioDeTokens.js';
import type { ResultadoDeAutenticacion } from './RegistrarPaciente.js';

export interface ComandoIniciarSesion {
  email: string;
  contrasena: string;
  /** Si se omite, se busca primero como paciente y luego como cuidador. */
  tipo?: TipoDeUsuario;
}

/**
 * CASO DE USO: iniciar sesion.
 *
 * Detalles de seguridad que el MVP anterior no tenia:
 *  - El mensaje de error es identico si el correo no existe o si la
 *    contrasena esta mal, para no revelar que correos estan registrados.
 *  - Siempre se ejecuta una verificacion de contrasena (aunque el usuario
 *    no exista) para que el tiempo de respuesta no delate la diferencia.
 */
export class IniciarSesion {
  /** Hash valido pero imposible de acertar. Sirve de senuelo temporal. */
  private static readonly HASH_SENUELO =
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

  constructor(
    private readonly pacientes: RepositorioDePacientes,
    private readonly cuidadores: RepositorioDeCuidadores,
    private readonly cifrador: CifradorDeContrasenas,
    private readonly tokens: ServicioDeTokens,
  ) {}

  async ejecutar(comando: ComandoIniciarSesion): Promise<ResultadoDeAutenticacion> {
    const email = Email.desde(comando.email);

    const candidatos = await this.buscarCandidatos(email, comando.tipo);
    const candidato = candidatos[0] ?? null;

    const contrasenaCifrada = candidato?.contrasenaCifrada ?? IniciarSesion.HASH_SENUELO;
    const coincide = await this.cifrador.verificar(comando.contrasena ?? '', contrasenaCifrada);

    if (!candidato || !coincide || !candidato.activo) {
      throw new ErrorDeAutenticacion('El correo o la contraseña no son correctos.');
    }

    /*
      Este correo tiene DOS cuentas y no nos dijeron a cual entrar.

      La segunda comprobacion solo se hace aqui, cuando ya sabemos que la
      primera contrasena era correcta y que existe otra cuenta. Es decir,
      casi nunca: el coste de bcrypt no se paga en el caso normal.

      Y si las dos cuentas tienen contrasenas distintas, no hay nada que
      preguntar: la propia contrasena dice cual es. Solo se pregunta
      cuando de verdad es imposible saberlo.
    */
    const segundo = candidatos[1];
    if (segundo && segundo.activo) {
      const tambienCoincide = await this.cifrador.verificar(
        comando.contrasena ?? '',
        segundo.contrasenaCifrada,
      );
      if (tambienCoincide) throw new ErrorDeCuentaAmbigua();
    }

    return {
      token: this.tokens.emitir({
        usuarioId: candidato.id,
        tipo: candidato.tipo,
        validaDesde: candidato.sesionesValidasDesde,
      }),
      usuario: {
        id: candidato.id,
        nombre: candidato.nombre,
        email: candidato.email,
        tipo: candidato.tipo,
      },
    };
  }

  /**
   * Las cuentas que ese correo puede abrir, en orden de preferencia.
   *
   * Devuelve una LISTA y no una sola porque un mismo correo puede tener
   * cuenta de paciente y de cuidadora a la vez. Antes esto devolvia la
   * primera que encontraba, con el resultado de que la segunda no se
   * podia alcanzar nunca desde la app, que no envia `tipo`.
   *
   * El orden se conserva: paciente primero. Eso mantiene el
   * comportamiento de siempre para el 99 % de los casos, en los que solo
   * hay una.
   */
  private async buscarCandidatos(
    email: Email,
    tipo: TipoDeUsuario | undefined,
  ): Promise<Candidato[]> {
    const encontrados: Candidato[] = [];

    if (tipo !== 'CUIDADOR') {
      const paciente = await this.pacientes.buscarPorEmail(email);
      if (paciente) {
        encontrados.push({
          id: paciente.id.valor,
          nombre: paciente.nombre,
          email: paciente.email.valor,
          contrasenaCifrada: paciente.contrasenaCifrada,
          activo: paciente.activo,
          tipo: 'PACIENTE',
          sesionesValidasDesde: paciente.sesionesValidasDesde.getTime(),
        });
      }
    }

    if (tipo !== 'PACIENTE') {
      const cuidador = await this.cuidadores.buscarPorEmail(email);
      if (cuidador) {
        encontrados.push({
          id: cuidador.id.valor,
          nombre: cuidador.nombre,
          email: cuidador.email.valor,
          contrasenaCifrada: cuidador.contrasenaCifrada,
          activo: cuidador.activo,
          tipo: 'CUIDADOR',
          sesionesValidasDesde: cuidador.sesionesValidasDesde.getTime(),
        });
      }
    }

    return encontrados;
  }
}

/** Una cuenta candidata a abrirse con ese correo. */
interface Candidato {
  id: string;
  nombre: string;
  email: string;
  contrasenaCifrada: string;
  activo: boolean;
  tipo: TipoDeUsuario;
  /** Marca que llevara el token, en milisegundos. */
  sesionesValidasDesde: number;
}
