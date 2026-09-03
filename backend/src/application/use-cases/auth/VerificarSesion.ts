import { Identificador } from '../../../domain/shared/Identificador.js';
import { ErrorDeAutenticacion } from '../../../domain/shared/errores.js';
import type { RepositorioDeCuidadores } from '../../../domain/cuidador/RepositorioDeCuidadores.js';
import type { RepositorioDePacientes } from '../../../domain/paciente/RepositorioDePacientes.js';
import type { Reloj } from '../../ports/Reloj.js';
import type { ServicioDeTokens } from '../../ports/ServicioDeTokens.js';
import type { Solicitante } from '../../services/PoliticaDeAcceso.js';

export interface SesionValidada {
  solicitante: Solicitante;
  /**
   * Token de recambio, o null si el que traia sigue teniendo cuerda.
   *
   * Cuando no es null, el servidor lo devuelve en una cabecera y la app
   * lo guarda. La persona no se entera de nada, que es exactamente el
   * objetivo.
   */
  tokenRenovado: string | null;
}

/**
 * CASO DE USO: dar por buena —o no— la sesion que trae una peticion.
 *
 * Antes esto lo hacia el middleware verificando la firma del token, y
 * ahi estaban los dos agujeros que arregla este archivo:
 *
 *  1. UNA FIRMA VALIDA NO ES UNA SESION VALIDA. El servidor no guarda
 *     los tokens que reparte, asi que no podia retirarlos: cambiar la
 *     contrasena no echaba a nadie, y desactivar una cuenta tampoco. Un
 *     token robado seguia entrando durante siete dias.
 *
 *     La solucion no es guardar sesiones —eso costaria una tabla que
 *     crece sin parar— sino guardar UNA FECHA por cuenta: desde cuando
 *     se aceptan sus tokens. El token lleva dentro la fecha que habia
 *     cuando se emitio; si no coincide con la guardada, no vale.
 *
 *  2. UN TOKEN QUE CADUCA Y NO SE RENUEVA ES UN CALLEJON SIN SALIDA. A
 *     los siete dias la persona se encontraba fuera sin haber hecho
 *     nada. En una aplicacion de medicacion para adultos mayores eso no
 *     es una molestia: es el dia que no le suenan las alarmas.
 *
 *     Aqui se renueva sola cuando le quedan pocos dias. Y se puede
 *     hacer sin riesgo precisamente por el punto 1: ahora existe una
 *     forma de cortar una sesion, asi que alargarlas ya no es regalar
 *     acceso indefinido.
 *
 * El precio es una consulta a la base de datos por peticion. Es un
 * precio real y conviene decirlo en voz alta; no hay forma de revocar
 * sesiones sin consultar algo. A cambio, la consulta es por clave
 * primaria, que es la mas barata que existe.
 */
export class VerificarSesion {
  /**
   * Cuando le quedan menos de estos dias, el token se cambia por uno
   * nuevo. Tres de siete: suficiente margen para que una persona que
   * abre la app una vez por semana no se quede fuera nunca.
   */
  static readonly DIAS_PARA_RENOVAR = 3;

  constructor(
    private readonly pacientes: RepositorioDePacientes,
    private readonly cuidadores: RepositorioDeCuidadores,
    private readonly tokens: ServicioDeTokens,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(token: string): Promise<SesionValidada> {
    const sesion = this.tokens.verificar(token);
    if (!sesion) throw this.sesionInvalida();

    const id = Identificador.desde(sesion.usuarioId);
    const cuenta =
      sesion.tipo === 'PACIENTE'
        ? await this.pacientes.buscarPorId(id)
        : await this.cuidadores.buscarPorId(id);

    // La cuenta se borro, o el token nombra a alguien que no existe.
    if (!cuenta) throw this.sesionInvalida();

    // Cuenta desactivada: la firma sigue siendo buena y aun asi no entra.
    if (!cuenta.activo) {
      throw new ErrorDeAutenticacion('Esta cuenta ya no esta activa.');
    }

    // El corazon del asunto: el token es anterior al ultimo cambio de
    // contrasena. Se compara por igualdad y no por "es mas viejo que",
    // porque la marca del token es una copia exacta de la guardada.
    if (sesion.validaDesde !== cuenta.sesionesValidasDesde.getTime()) {
      throw new ErrorDeAutenticacion(
        'Tu contrasena cambio, asi que esta sesion se cerro. Inicia sesion de nuevo.',
      );
    }

    return {
      solicitante: { id, tipo: sesion.tipo },
      tokenRenovado: this.renovarSiHaceFalta(sesion.expiraEn, {
        usuarioId: sesion.usuarioId,
        tipo: sesion.tipo,
        validaDesde: sesion.validaDesde,
      }),
    };
  }

  private renovarSiHaceFalta(
    expiraEn: Date,
    sesion: { usuarioId: string; tipo: 'PACIENTE' | 'CUIDADOR'; validaDesde: number },
  ): string | null {
    const diasQueQuedan =
      (expiraEn.getTime() - this.reloj.ahora().getTime()) / (24 * 60 * 60 * 1000);

    if (diasQueQuedan > VerificarSesion.DIAS_PARA_RENOVAR) return null;
    return this.tokens.emitir(sesion);
  }

  private sesionInvalida(): ErrorDeAutenticacion {
    return new ErrorDeAutenticacion('Tu sesion expiro o no es valida. Inicia sesion de nuevo.');
  }
}
