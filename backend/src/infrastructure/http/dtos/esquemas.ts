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
  // La app envia la zona del telefono. Si no llega, el dominio usa
  // America/Bogota, que es el contexto del proyecto.
  zonaHoraria: z.string().max(64).nullish(),
  /**
   * Autorizacion del titular para tratar sus datos, los de salud
   * incluidos. Tiene que llegar en `true`: una casilla premarcada o un
   * campo ausente no son autorizacion expresa (art. 6, Ley 1581/2012).
   */
  aceptaPoliticaDeDatos: z.literal(true, {
    errorMap: () => ({
      message:
        'Para crear la cuenta hace falta autorizar el tratamiento de los datos personales.',
    }),
  }),
  /** Version del texto que la persona vio, para poder probar que acepto eso. */
  versionDePolitica: z.string().regex(/^\d+\.\d+$/).max(10).optional(),

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
  /**
   * Autorizacion del titular para tratar sus datos, los de salud
   * incluidos. Tiene que llegar en `true`: una casilla premarcada o un
   * campo ausente no son autorizacion expresa (art. 6, Ley 1581/2012).
   */
  aceptaPoliticaDeDatos: z.literal(true, {
    errorMap: () => ({
      message:
        'Para crear la cuenta hace falta autorizar el tratamiento de los datos personales.',
    }),
  }),
  /** Version del texto que la persona vio, para poder probar que acepto eso. */
  versionDePolitica: z.string().regex(/^\d+\.\d+$/).max(10).optional(),

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

export const esquemaDeSolicitudDeRecuperacion = z.object({
  email: z.string().min(1, 'Escribe tu correo.').max(200),
  tipo: z.enum(['PACIENTE', 'CUIDADOR']).optional(),
});

export const esquemaDeRestablecimiento = z.object({
  email: z.string().min(1, 'Escribe tu correo.').max(200),
  codigo: z.string().min(1, 'Escribe el codigo que te llego al correo.').max(20),
  nuevaContrasena: z.string().min(1, 'Escribe tu contrasena nueva.').max(200),
  tipo: z.enum(['PACIENTE', 'CUIDADOR']).optional(),
});

export const esquemaDeDispositivo = z.object({
  token: z.string().min(1, 'El token del dispositivo es obligatorio.').max(200),
  plataforma: z.enum(['android', 'ios', 'web']),
});

export const esquemaDeBajaDeDispositivo = z.object({
  token: z.string().min(1, 'El token del dispositivo es obligatorio.').max(200),
});

/**
 * Parametros que viajan en la URL (?fecha=...&pacienteId=...).
 *
 * Estaban sin validar: las rutas hacian `peticion.query.fecha as string`
 * y confiaban. Pero `as` es una promesa al compilador, no una
 * comprobacion, y Express entrega un ARRAY cuando el parametro se repite
 * y un OBJETO cuando lleva corchetes. Cualquiera de las dos formas hacia
 * que el dominio llamara `.trim()` sobre algo que no era texto, y eso
 * salia como 500 "error inesperado del servidor" cuando en realidad el
 * error venia del cliente:
 *
 *   ?fecha=2026-08-31&fecha=2026-09-01   ->  500
 *   ?pacienteId[a]=1                     ->  500
 *
 * `z.string()` rechaza las dos y el manejador de errores las convierte
 * en un 400 con el campo senalado, que es lo que eran desde el principio.
 */
const textoDeConsulta = (max = 200) => z.string().trim().min(1).max(max).optional();

export const esquemaDeConsultaDeAgenda = z.object({
  pacienteId: textoDeConsulta(),
  fecha: textoDeConsulta(10),
});

export const esquemaDeConsultaDeHistorial = z.object({
  pacienteId: textoDeConsulta(),
  desde: textoDeConsulta(10),
  hasta: textoDeConsulta(10),
  medicamentoId: textoDeConsulta(),
});

export const esquemaDeConsultaDeMedicamentos = z.object({
  pacienteId: textoDeConsulta(),
  incluirSuspendidos: textoDeConsulta(10),
});

/**
 * Dias hacia atras del panel del cuidador.
 *
 * Con un tope: sin el, `?dias=100000` se aceptaba y lanzaba una consulta
 * de rango descomunal por CADA paciente del panel. Un ano es mas de lo
 * que ninguna pantalla muestra.
 */
export const esquemaDeConsultaDelPanel = z.object({
  dias: z.coerce.number().int().min(1).max(365).optional(),
});
