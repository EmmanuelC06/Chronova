import type { Identificador } from '../shared/Identificador.js';
import type { SolicitudDeRecuperacion, TipoDeCuenta } from './SolicitudDeRecuperacion.js';

/** PUERTO de persistencia de las solicitudes de recuperacion. */
export interface RepositorioDeRecuperaciones {
  guardar(solicitud: SolicitudDeRecuperacion): Promise<void>;

  /**
   * La solicitud vigente mas reciente de esa cuenta, o null.
   *
   * "Vigente" quiere decir sin usar. La caducidad y los intentos los
   * comprueba la entidad, porque son reglas de negocio y no del almacen:
   * asi el motivo del rechazo se puede explicar con precision en vez de
   * responder un generico "codigo invalido".
   */
  buscarVigentePorUsuario(
    usuarioId: Identificador,
    tipoDeCuenta: TipoDeCuenta,
  ): Promise<SolicitudDeRecuperacion | null>;

  /**
   * Invalida las solicitudes anteriores de esa cuenta.
   *
   * Se llama al abrir una nueva: si alguien pide el codigo tres veces, el
   * unico que debe servir es el ultimo. Dejar los anteriores vivos
   * multiplica sin motivo las ventanas de ataque abiertas a la vez.
   */
  invalidarAnteriores(usuarioId: Identificador, tipoDeCuenta: TipoDeCuenta): Promise<void>;

  /** Borra las caducadas. Higiene, no seguridad. */
  eliminarCaducadas(limite: Date): Promise<number>;
}
