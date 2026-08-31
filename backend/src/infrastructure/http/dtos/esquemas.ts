import { z } from 'zod';

/**
 * Esquemas de validacion de entrada (DTOs) con Zod.
 *
 * Primera linea de defensa: comprueban la FORMA de los datos (que exista
 * el campo, que sea texto, que el numero sea entero). Las reglas de
 * NEGOCIO no estan aqui, sino en el dominio, donde no se pueden saltar.
 *
 * Por que ambas cosas: si solo se valida aqui, cualquier otro punto de
 * entrada (una tarea programada, un script, otro adaptador) se saltaria
 * las reglas. Si solo se valida en el dominio, los mensajes de error
 * llegan tarde y peor explicados. Cada capa valida lo suyo.
 */

const HORA = z
  .string()
  .regex(/^\d{1,2}:\d{2}$/, 'La hora debe tener el formato HH:mm, por ejemplo 08:30.');

const FECHA = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato AAAA-MM-DD.');

export const esquemaDeRegistroDePaciente = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.').max(120),
  email: z.string().min(1, 'El correo es obligatorio.'),
  contrasena: z.string().min(1, 'La contrasena es obligatoria.'),
  telefono: z.string().nullish(),
  fechaDeNacimiento: FECHA.nullish(),
  preferencias: z
    .object({
      tamanoDeLetra: z.enum(['NORMAL', 'GRANDE', 'MUY_GRANDE']).optional(),
      altoContraste: z.boolean().optional(),
      alertasSonoras: z.boolean().optional(),
      alertasVibracion: z.boolean().optional(),
      minutosDeGracia: z.number().int().min(15).max(720).optional(),
    })
    .optional(),
});

export const esquemaDeRegistroDeCuidador = z.object({
  nombre: z.string().min(2).max(120),
  email: z.string().min(1),
  contrasena: z.string().min(1),
  telefono: z.string().nullish(),
  rol: z.string().max(60).nullish(),
});

export const esquemaDeInicioDeSesion = z.object({
  email: z.string().min(1, 'El correo es obligatorio.'),
  contrasena: z.string().min(1, 'La contrasena es obligatoria.'),
  tipo: z.enum(['PACIENTE', 'CUIDADOR']).optional(),
});

export const esquemaDePreferencias = z.object({
  tamanoDeLetra: z.enum(['NORMAL', 'GRANDE', 'MUY_GRANDE']).optional(),
  altoContraste: z.boolean().optional(),
  alertasSonoras: z.boolean().optional(),
  alertasVibracion: z.boolean().optional(),
  minutosDeGracia: z.number().int().min(15).max(720).optional(),
});

const DOSIS = z.object({
  cantidad: z.number().positive('La cantidad debe ser mayor que cero.'),
  unidad: z.string().min(1),
});

const FRECUENCIA = z.object({
  tipo: z.enum(['DIARIA', 'DIAS_DE_LA_SEMANA', 'CADA_N_DIAS']),
  diasDeLaSemana: z.array(z.number().int().min(0).max(6)).optional(),
  intervaloEnDias: z.number().int().min(1).max(90).optional(),
});

export const esquemaDeMedicamentoNuevo = z.object({
  pacienteId: z.string().uuid('El identificador del paciente no es valido.').optional(),
  nombre: z.string().min(2, 'El nombre del medicamento es obligatorio.').max(120),
  dosis: DOSIS,
  frecuencia: FRECUENCIA,
  horarios: z.array(HORA).min(1, 'Debes indicar al menos una hora de toma.').max(12),
  fechaInicio: FECHA.optional(),
  fechaFin: FECHA.nullish(),
  instrucciones: z.string().max(500).nullish(),
  stock: z
    .object({
      unidadesDisponibles: z.number().int().min(0),
      umbralDeAlerta: z.number().int().min(0),
    })
    .optional(),
});

export const esquemaDeMedicamentoActualizado = z.object({
  nombre: z.string().min(2).max(120).optional(),
  dosis: DOSIS.optional(),
  frecuencia: FRECUENCIA.optional(),
  horarios: z.array(HORA).min(1).max(12).optional(),
  fechaFin: FECHA.nullish(),
  instrucciones: z.string().max(500).nullish(),
});

export const esquemaDeReabastecimiento = z.object({
  unidades: z.number().int().positive('Las unidades deben ser un numero mayor que cero.'),
  nuevoUmbralDeAlerta: z.number().int().min(0).optional(),
});

export const esquemaDeRegistroDeToma = z.object({
  accion: z.enum(['CONFIRMAR', 'OMITIR', 'POSPONER']),
  observaciones: z.string().max(300).nullish(),
  minutos: z.number().int().min(5).max(180).optional(),
});

export const esquemaDeSolicitudDeVinculo = z.object({
  emailDeLaOtraParte: z.string().min(1, 'El correo es obligatorio.'),
  parentesco: z.string().max(60).nullish(),
  permisos: z
    .object({
      puedeVerHistorial: z.boolean().optional(),
      puedeRegistrarTomas: z.boolean().optional(),
      puedeGestionarMedicamentos: z.boolean().optional(),
      recibeAlertas: z.boolean().optional(),
    })
    .optional(),
});

export const esquemaDeRespuestaAVinculo = z.object({
  respuesta: z.enum(['ACEPTAR', 'RECHAZAR', 'REVOCAR']),
});

export const esquemaDePermisos = z.object({
  puedeVerHistorial: z.boolean().optional(),
  puedeRegistrarTomas: z.boolean().optional(),
  puedeGestionarMedicamentos: z.boolean().optional(),
  recibeAlertas: z.boolean().optional(),
});
