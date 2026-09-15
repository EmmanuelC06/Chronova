import type { Identificador } from '../../../domain/shared/Identificador.js';
import { ErrorDeAutenticacion } from '../../../domain/shared/errores.js';
import type { RepositorioDeCuidadores } from '../../../domain/cuidador/RepositorioDeCuidadores.js';
import type { RepositorioDePacientes } from '../../../domain/paciente/RepositorioDePacientes.js';
import type { CifradorDeContrasenas } from '../../ports/CifradorDeContrasenas.js';
import type { Reloj } from '../../ports/Reloj.js';
import type { ServicioDeTokens, TipoDeUsuario } from '../../ports/ServicioDeTokens.js';
import { validarFortalezaDeContrasena } from '../../services/politicaDeContrasenas.js';

export interface ComandoCambiarContrasena {
  usuarioId: Identificador;
  tipo: TipoDeUsuario;
  contrasenaActual: string;
  nuevaContrasena: string;
}

export interface ResultadoDelCambio {
  /**
   * Un token nuevo para ESTE dispositivo.
   *
   * Cambiar la contrasena invalida todas las sesiones, incluida la que
   * hizo la peticion. Sin devolver uno nuevo, la persona quedaria fuera
   * de su propia cuenta justo despues de hacer lo correcto.
   */
  token: string;
}

/**
 * CASO DE USO: cambiar la contrasena estando dentro.
 *
 * Hasta ahora la unica forma de cambiarla era cerrar sesion, decir que
 * la habia olvidado, esperar un codigo de seis digitos por correo y
 * teclearlo. Para el publico de Chronova eso no es un rodeo: es una
 * barrera que hace que la contrasena no se cambie nunca.
 *
 * Tres decisiones que valen la pena explicar:
 *
 * 1. **Se pide la contrasena actual.** No es burocracia: sin ella, un
 *    telefono desbloqueado y olvidado encima de una mesa es una cuenta
 *    secuestrada. Es la unica prueba de que quien escribe es el dueño y
 *    no alguien que paso por delante.
 *
 * 2. **Se cierran las demas sesiones.** La razon principal para cambiar
 *    una contrasena es sospechar que alguien mas la sabe. Cambiarla y
 *    dejarle la sesion abierta no arregla nada.
 *
 * 3. **Menos esta.** Por eso se devuelve un token nuevo. Echar a la
 *    persona de su propio telefono por haber hecho lo correcto seria
 *    castigar la buena practica, y la siguiente vez no lo haria.
 */
export class CambiarContrasena {
  constructor(
    private readonly pacientes: RepositorioDePacientes,
    private readonly cuidadores: RepositorioDeCuidadores,
    private readonly cifrador: CifradorDeContrasenas,
    private readonly tokens: ServicioDeTokens,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(comando: ComandoCambiarContrasena): Promise<ResultadoDelCambio> {
    // La fortaleza se valida ANTES de tocar nada, para que un rechazo por
    // contrasena debil no gaste una verificacion ni deje estado a medias.
    validarFortalezaDeContrasena(comando.nuevaContrasena);

    const ahora = this.reloj.ahora();

    if (comando.tipo === 'PACIENTE') {
      const paciente = await this.pacientes.buscarPorId(comando.usuarioId);
      if (!paciente?.activo) throw this.noAutenticado();

      await this.comprobarLaActual(comando.contrasenaActual, paciente.contrasenaCifrada);
      paciente.cambiarContrasena(await this.cifrador.cifrar(comando.nuevaContrasena), ahora);
      await this.pacientes.guardar(paciente);

      return {
        token: this.tokens.emitir({
          usuarioId: paciente.id.valor,
          tipo: 'PACIENTE',
          validaDesde: paciente.sesionesValidasDesde.getTime(),
        }),
      };
    }

    const cuidador = await this.cuidadores.buscarPorId(comando.usuarioId);
    if (!cuidador?.activo) throw this.noAutenticado();

    await this.comprobarLaActual(comando.contrasenaActual, cuidador.contrasenaCifrada);
    cuidador.cambiarContrasena(await this.cifrador.cifrar(comando.nuevaContrasena), ahora);
    await this.cuidadores.guardar(cuidador);

    return {
      token: this.tokens.emitir({
        usuarioId: cuidador.id.valor,
        tipo: 'CUIDADOR',
        validaDesde: cuidador.sesionesValidasDesde.getTime(),
      }),
    };
  }

  private async comprobarLaActual(escrita: string, cifrada: string): Promise<void> {
    const acierta = await this.cifrador.verificar(escrita ?? '', cifrada);
    if (!acierta) {
      throw new ErrorDeAutenticacion('La contraseña actual no es correcta.');
    }
  }

  /**
   * El token era valido pero la cuenta ya no existe o esta desactivada.
   *
   * Es raro, y precisamente por eso conviene que devuelva 401 y no 404:
   * lo que procede es volver a iniciar sesion, no reintentar.
   */
  private noAutenticado(): ErrorDeAutenticacion {
    return new ErrorDeAutenticacion('No hay una sesión activa.');
  }
}
