import { cargarEntorno } from '../../../config/entorno.js';
import { construirContenedor } from '../../../contenedor.js';
import { Identificador } from '../../../domain/shared/Identificador.js';

/**
 * Carga datos de ejemplo para poder probar la app sin registrar todo a mano.
 *
 * Se ejecuta con:  npm run db:seed
 *
 * Crea una paciente (Rosa, 74 anos), su hija cuidadora (Ana), tres
 * medicamentos tipicos de un tratamiento cronico y el vinculo entre las
 * dos ya aceptado.
 */
const CREDENCIALES = {
  paciente: { email: 'rosa@chronova.test', contrasena: 'rosa12345' },
  cuidadora: { email: 'ana@chronova.test', contrasena: 'ana123456' },
};

async function sembrar(): Promise<void> {
  const entorno = cargarEntorno();
  const contenedor = construirContenedor(entorno);
  const { casosDeUso } = contenedor;

  try {
    const paciente = await casosDeUso.registrarPaciente.ejecutar({
      nombre: 'Rosa Elena Valencia',
      email: CREDENCIALES.paciente.email,
      contrasena: CREDENCIALES.paciente.contrasena,
      telefono: '+573001112233',
      fechaDeNacimiento: '1952-04-18',
      preferencias: { tamanoDeLetra: 'MUY_GRANDE', minutosDeGracia: 90 },
    });

    const cuidadora = await casosDeUso.registrarCuidador.ejecutar({
      nombre: 'Ana Maria Correa',
      email: CREDENCIALES.cuidadora.email,
      contrasena: CREDENCIALES.cuidadora.contrasena,
      telefono: '+573014445566',
      rol: 'Hija',
    });

    // Los casos de uso esperan un Solicitante ya resuelto, que en la API
    // sale del token. Aqui lo construimos a mano.
    const solicitantePaciente = {
      id: Identificador.desde(paciente.usuario.id),
      tipo: 'PACIENTE' as const,
    };

    const hoy = new Date().toISOString().slice(0, 10);

    await casosDeUso.registrarMedicamento.ejecutar({
      solicitante: solicitantePaciente,
      pacienteId: paciente.usuario.id,
      nombre: 'Losartan',
      dosis: { cantidad: 1, unidad: 'tableta' },
      frecuencia: { tipo: 'DIARIA' },
      horarios: ['08:00', '20:00'],
      fechaInicio: hoy,
      instrucciones: 'Tomar con un vaso lleno de agua, despues de comer.',
      stock: { unidadesDisponibles: 24, umbralDeAlerta: 6 },
    });

    await casosDeUso.registrarMedicamento.ejecutar({
      solicitante: solicitantePaciente,
      pacienteId: paciente.usuario.id,
      nombre: 'Metformina',
      dosis: { cantidad: 850, unidad: 'mg' },
      frecuencia: { tipo: 'DIARIA' },
      horarios: ['07:30', '13:00', '19:30'],
      fechaInicio: hoy,
      instrucciones: 'No tomar en ayunas.',
      stock: { unidadesDisponibles: 40, umbralDeAlerta: 10 },
    });

    await casosDeUso.registrarMedicamento.ejecutar({
      solicitante: solicitantePaciente,
      pacienteId: paciente.usuario.id,
      nombre: 'Vitamina D',
      dosis: { cantidad: 1, unidad: 'capsula' },
      frecuencia: { tipo: 'DIAS_DE_LA_SEMANA', diasDeLaSemana: [1, 4] },
      horarios: ['09:00'],
      fechaInicio: hoy,
      stock: { unidadesDisponibles: 8, umbralDeAlerta: 4 },
    });

    await casosDeUso.solicitarVinculo.ejecutar({
      solicitante: solicitantePaciente,
      emailDeLaOtraParte: CREDENCIALES.cuidadora.email,
      parentesco: 'Hija',
      permisos: {
        puedeVerHistorial: true,
        puedeRegistrarTomas: true,
        puedeGestionarMedicamentos: false,
        recibeAlertas: true,
      },
    });

    console.log('\nDatos de ejemplo creados.\n');
    console.log('  Paciente');
    console.log(`    correo:     ${CREDENCIALES.paciente.email}`);
    console.log(`    contrasena: ${CREDENCIALES.paciente.contrasena}`);
    console.log('  Cuidadora');
    console.log(`    correo:     ${CREDENCIALES.cuidadora.email}`);
    console.log(`    contrasena: ${CREDENCIALES.cuidadora.contrasena}`);
    console.log(`\n  Cuidadora vinculada: ${cuidadora.usuario.nombre}\n`);

    if (entorno.persistencia === 'memory') {
      console.log('  Aviso: PERSISTENCE=memory, asi que estos datos NO quedaron guardados.');
      console.log('  Pon PERSISTENCE=postgres en .env para sembrar la base de datos real.\n');
    }
  } finally {
    await contenedor.cerrar();
  }
}

sembrar().catch((error) => {
  console.error('No se pudieron crear los datos de ejemplo:', error instanceof Error ? error.message : error);
  process.exit(1);
});
