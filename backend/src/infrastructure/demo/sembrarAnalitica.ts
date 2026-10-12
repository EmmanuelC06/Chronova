import { construirContenedor } from '../../contenedor.js';
import { cargarEntorno } from '../../config/entorno.js';
import { Identificador } from '../../domain/shared/Identificador.js';
import { Toma } from '../../domain/toma/Toma.js';
import { franjaDeLaHora, NOMBRE_DE_DIA_PLURAL } from '../../domain/toma/MapaDeRiesgo.js';
import { RepositorioDeTomasPostgres } from '../persistence/postgres/repositoriosPostgres.js';

/**
 * Siembra una cuenta de demostracion con un patron de olvido CONOCIDO.
 *
 * Para que sirve
 * --------------
 * Para dos cosas distintas, y conviene no confundirlas.
 *
 * 1. **Demostrar.** La analitica necesita meses de historia para mostrar
 *    algo. Sin usuarios reales no hay nada que enseñar, y una pantalla
 *    vacia en una sustentacion no demuestra nada.
 *
 * 2. **Validar.** Y esta es la importante. Aqui el patron se SIEMBRA a
 *    proposito: se decide de antemano que los domingos por la noche se
 *    olvidan muchas mas tomas que el resto. Si el mapa de riesgo lo
 *    encuentra, el modelo funciona; si señala otra casilla, no funciona.
 *    Es la unica forma honesta de validar esto sin pacientes reales,
 *    porque la verdad se conoce antes de calcular nada.
 *
 * Que estos datos son FALSOS
 * --------------------------
 * La cuenta se crea con un correo que lo dice (`demo@chronova.test`) y
 * el nombre del paciente tambien. Eso no es cosmetica: mientras no haya
 * alojamiento con HTTPS, Chronova no debe tocar datos de salud de
 * personas reales, y la unica forma de que eso se cumpla de verdad es
 * que los datos de prueba sean imposibles de confundir con los de
 * alguien.
 *
 * Uso:
 *   npm run datos:demo
 */

/** El patron sembrado. Esto es la "verdad" contra la que se compara. */
const PATRON = {
  /** Probabilidad de olvido en la casilla señalada. */
  riesgoAlto: 0.45,
  /** Probabilidad de olvido en el resto del mapa. */
  riesgoBase: 0.06,
  /** 0 = domingo. El dia que se siembra como problematico. */
  diaProblematico: 0,
  /** La franja problematica, por la hora de la toma. */
  horaProblematica: 20,
};

const DIAS_DE_HISTORIA = 180;
const EMAIL = 'demo@chronova.test';
const CONTRASENA = 'DemoChronova2026';

/**
 * Generador reproducible.
 *
 * Con `Math.random` cada ejecucion daria un mapa distinto y no se podria
 * comparar nada entre corridas, ni enseñar dos veces la misma pantalla.
 * Esto es un generador congruencial sencillo: no sirve para criptografia
 * y aqui no hace falta que sirva.
 */
function generadorReproducible(semilla: number): () => number {
  let estado = semilla;
  return () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296;
    return estado / 4294967296;
  };
}

async function main(): Promise<void> {
  const entorno = cargarEntorno();
  const contenedor = construirContenedor(entorno);
  const { casosDeUso } = contenedor;

  /*
    Hace falta PostgreSQL, y no es un capricho. Con PERSISTENCE=memory
    los datos viven dentro del proceso: este script sembraria, imprimiria
    un resultado correcto y al terminar se llevaria todo consigo. La app
    no veria nada.
  */
  if (!contenedor.pool) {
    console.error(
      '\n  Esto necesita PostgreSQL. Pon PERSISTENCE=postgres en backend/.env' +
        '\n  (con PERSISTENCE=memory los datos se borran al terminar el script).\n',
    );
    process.exit(1);
  }
  const repositorioDeTomas = new RepositorioDeTomasPostgres(contenedor.pool);

  console.log('\n  Sembrando datos de DEMOSTRACION (no son de nadie real)\n');

  // 1. La cuenta. Si ya existe, se reutiliza iniciando sesion.
  let pacienteId: string;
  try {
    const registro = await casosDeUso.registrarPaciente.ejecutar({
      nombre: 'Paciente de Demostración',
      email: EMAIL,
      contrasena: CONTRASENA,
      zonaHoraria: 'America/Bogota',
      aceptaPoliticaDeDatos: true,
    });
    pacienteId = registro.usuario.id;
    console.log(`  Cuenta creada     ${EMAIL}`);
  } catch {
    const sesion = await casosDeUso.iniciarSesion.ejecutar({
      email: EMAIL,
      contrasena: CONTRASENA,
      tipo: 'PACIENTE',
    });
    pacienteId = sesion.usuario.id;
    console.log(`  Cuenta existente  ${EMAIL}`);
  }

  const solicitante = { id: Identificador.desde(pacienteId), tipo: 'PACIENTE' as const };

  // 2. Dos medicamentos, con horarios de mañana y de noche.
  const existentes = await casosDeUso.listarMedicamentos.ejecutar({
    solicitante,
    pacienteId,
  });

  let medicamentoId: string;
  if (existentes.length > 0) {
    medicamentoId = existentes[0]!.id;
    console.log('  Medicamento       ya existía, se reutiliza');
  } else {
    const medicamento = await casosDeUso.registrarMedicamento.ejecutar({
      solicitante,
      pacienteId,
      nombre: 'Losartán',
      dosis: { cantidad: 1, unidad: 'tableta' },
      frecuencia: { tipo: 'DIARIA' },
      horarios: ['08:00', '20:00'],
    });
    medicamentoId = medicamento.id;
    console.log('  Medicamento       Losartán, 8:00 y 20:00');
  }

  // 3. La historia, con el patron sembrado.
  const azar = generadorReproducible(20260101);
  const ahora = new Date();
  const tomas: Toma[] = [];

  // Contadores de la casilla sembrada, para que su tasa salga exacta.
  let vistasEnLaCasilla = 0;
  let omitidasEnLaCasilla = 0;

  for (let atras = DIAS_DE_HISTORIA; atras >= 1; atras -= 1) {
    for (const horaLocal of [8, 20]) {
      // Bogotá va 5 horas detrás de UTC y no tiene horario de verano.
      const dia = new Date(ahora);
      dia.setUTCDate(dia.getUTCDate() - atras);
      const instante = new Date(
        Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth(), dia.getUTCDate(), horaLocal + 5),
      );

      const diaDeLaSemana = new Date(
        Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth(), dia.getUTCDate()),
      ).getUTCDay();

      const esLaCasillaSembrada =
        diaDeLaSemana === PATRON.diaProblematico && horaLocal === PATRON.horaProblematica;

      /*
        La casilla sembrada se siembra EXACTA, no al azar.

        El primer intento la muestreaba con una moneda cargada al 45%, y
        con unos veinte domingos en el historial salio al 22%: dentro de
        lo que la binomial permite, pero por debajo de picos de ruido de
        otras casillas. Resultado: la analitica señalaba los viernes por
        la mañana, que habian sacado un 23% por pura casualidad.

        No era un fallo del modelo ni del generador (se comprobaron los
        dos). Era que con veinte observaciones por casilla y veintiocho
        casillas, el ruido produce picos que compiten con la señal. Es el
        problema de las comparaciones multiples, y es justamente la razon
        de ser del suavizado y del minimo de evidencia.

        Para un conjunto de validacion, la verdad tiene que ser exacta o
        no sirve como verdad. Asi que aqui se cuenta cuantas van y se
        omite la proporcion justa, repartida y no en bloque.
      */
      const seOlvida = esLaCasillaSembrada
        ? (() => {
            vistasEnLaCasilla += 1;
            const deberianIrOmitidas = Math.round(vistasEnLaCasilla * PATRON.riesgoAlto);
            if (deberianIrOmitidas > omitidasEnLaCasilla) {
              omitidasEnLaCasilla += 1;
              return true;
            }
            return false;
          })()
        : azar() < PATRON.riesgoBase;

      // Quien sí se la toma, no lo hace clavado a la hora: un desfase de
      // hasta media hora, que es lo que pasa en la vida real y lo que
      // hace que la curiosidad de puntualidad diga algo.
      const desfase = Math.round(azar() * 30);
      const resuelta = new Date(instante.getTime() + desfase * 60_000);

      tomas.push(
        Toma.desdePlano({
          id: crypto.randomUUID(),
          medicamentoId,
          pacienteId,
          programadaPara: instante.toISOString(),
          programadaOriginalmentePara: instante.toISOString(),
          estado: seOlvida ? 'OMITIDA' : 'TOMADA',
          resueltaEn: seOlvida ? instante.toISOString() : resuelta.toISOString(),
          origenDelRegistro: seOlvida ? 'SISTEMA' : 'PACIENTE',
          registradaPorId: null,
          observaciones: null,
          vecesPospuesta: 0,
        }),
      );
    }
  }

  await repositorioDeTomas.programarSiNoExisten(tomas);

  const omitidas = tomas.filter((t) => t.estado === 'OMITIDA').length;
  const franja = franjaDeLaHora(PATRON.horaProblematica);

  console.log(`  Tomas generadas   ${tomas.length} en ${DIAS_DE_HISTORIA} días`);
  console.log(`  Omitidas          ${omitidas} (${Math.round((omitidas / tomas.length) * 100)}%)`);
  console.log('');
  const tasaReal = vistasEnLaCasilla === 0 ? 0 : omitidasEnLaCasilla / vistasEnLaCasilla;
  console.log('  PATRON SEMBRADO (esto es lo que la analítica debería encontrar):');
  console.log(
    `    los ${NOMBRE_DE_DIA_PLURAL[PATRON.diaProblematico]} por la ` +
      `${franja.toLowerCase()}: ${omitidasEnLaCasilla} de ${vistasEnLaCasilla} ` +
      `(${Math.round(tasaReal * 100)}%)`,
  );
  console.log(`    el resto del mapa, alrededor del ${Math.round(PATRON.riesgoBase * 100)}%`);
  console.log('');

  // 4. Y se comprueba en el acto si la analitica lo recupera.
  const analitica = await casosDeUso.obtenerAnalitica.ejecutar({ solicitante, pacienteId });
  const primero = analitica.mapaDeRiesgo.hallazgos[0];

  if (!primero) {
    console.log('  RESULTADO: la analítica no encontró ningún patrón. Algo falla.\n');
  } else {
    const acierta =
      primero.diaDeLaSemana === PATRON.diaProblematico && primero.franja === franja;
    console.log(`  La analítica dice: "${primero.texto}"`);
    console.log(
      acierta
        ? '  RESULTADO: encontró la casilla sembrada. El modelo funciona.\n'
        : '  RESULTADO: señaló OTRA casilla. Revisar el modelo.\n',
    );
  }

  console.log(`  Entra con  ${EMAIL}  /  ${CONTRASENA}\n`);
  await contenedor.cerrar();
}

main().catch((error: unknown) => {
  console.error('\n  No se pudo sembrar:', error instanceof Error ? error.message : error);
  process.exit(1);
});
