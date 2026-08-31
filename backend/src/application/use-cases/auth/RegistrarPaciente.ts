import { Email } from '../../../domain/shared/Email.js';
import { Telefono } from '../../../domain/shared/Telefono.js';
import { ErrorDeConflicto } from '../../../domain/shared/errores.js';
import { Paciente } from '../../../domain/paciente/Paciente.js';
import { PreferenciasDeAccesibilidad } from '../../../domain/paciente/PreferenciasDeAccesibilidad.js';
import type { RepositorioDePacientes } from '../../../domain/paciente/RepositorioDePacientes.js';
import type { CifradorDeContrasenas } from '../../ports/CifradorDeContrasenas.js';
import type { GeneradorDeIds } from '../../ports/GeneradorDeIds.js';
import type { Reloj } from '../../ports/Reloj.js';
import type { ServicioDeTokens } from '../../ports/ServicioDeTokens.js';
import { validarFortalezaDeContrasena } from '../../services/politicaDeContrasenas.js';

/** Datos que entran al caso de uso (un "comando"). */
export interface ComandoRegistrarPaciente {
  nombre: string;
  email: string;
  contrasena: string;
  telefono?: string | null;
  fechaDeNacimiento?: string | null;
  preferencias?: {
    tamanoDeLetra?: string;
    altoContraste?: boolean;
    alertasSonoras?: boolean;
    alertasVibracion?: boolean;
    minutosDeGracia?: number;
  };
}

export interface ResultadoDeAutenticacion {
  token: string;
  usuario: {
    id: string;
    nombre: string;
    email: string;
    tipo: 'PACIENTE' | 'CUIDADOR';
  };
}

/**
 * CASO DE USO: registrar un paciente nuevo.
 *
 * Un caso de uso orquesta; no contiene reglas de negocio propias. Las
 * reglas ("el email debe tener formato valido", "el nombre minimo son
 * 2 caracteres") viven en el dominio. Aqui solo se define la secuencia:
 * validar, comprobar que no exista, cifrar, guardar, emitir sesion.
 */
export class RegistrarPaciente {
  constructor(
    private readonly pacientes: RepositorioDePacientes,
    private readonly cifrador: CifradorDeContrasenas,
    private readonly tokens: ServicioDeTokens,
    private readonly ids: GeneradorDeIds,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(comando: ComandoRegistrarPaciente): Promise<ResultadoDeAutenticacion> {
    const email = Email.desde(comando.email);
    validarFortalezaDeContrasena(comando.contrasena);

    if (await this.pacientes.existeConEmail(email)) {
      throw new ErrorDeConflicto('Ya existe una cuenta registrada con ese correo electronico.');
    }

    const paciente = Paciente.registrar({
      id: this.ids.nuevo(),
      nombre: comando.nombre,
      email,
      telefono: Telefono.opcional(comando.telefono),
      fechaDeNacimiento: comando.fechaDeNacimiento ? new Date(comando.fechaDeNacimiento) : null,
      contrasenaCifrada: await this.cifrador.cifrar(comando.contrasena),
      preferencias: comando.preferencias
        ? PreferenciasDeAccesibilidad.desde(comando.preferencias)
        : PreferenciasDeAccesibilidad.porDefecto(),
      ahora: this.reloj.ahora(),
    });

    await this.pacientes.guardar(paciente);

    return {
      token: this.tokens.emitir({ usuarioId: paciente.id.valor, tipo: 'PACIENTE' }),
      usuario: {
        id: paciente.id.valor,
        nombre: paciente.nombre,
        email: paciente.email.valor,
        tipo: 'PACIENTE',
      },
    };
  }
}
