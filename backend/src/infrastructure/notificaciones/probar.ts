import { cargarEntorno } from '../../config/entorno.js';
import { construirContenedor } from '../../contenedor.js';
import { ClienteDeExpoHttp } from './ClienteDeExpo.js';

/**
 * Comprobar las notificaciones remotas sin esperar a que se pierda una toma.
 *
 * Se ejecuta con:  npm run push:probar
 *
 * Por que existe: el aviso al cuidador solo se dispara cuando una toma
 * vence, y eso tarda horas. Depurar con un ciclo de espera de tres horas
 * no es depurar, es adivinar. Este script recorre exactamente el mismo
 * camino que usa el servidor de verdad —los mismos telefonos guardados,
 * el mismo cliente HTTP hacia Expo— pero se dispara cuando uno quiera.
 *
 * Responde tres preguntas, en orden, y cada una descarta una causa:
 *
 *   1. Hay algun telefono registrado?
 *      Si no, la aplicacion movil nunca consiguio su token. El problema
 *      esta en el telefono (permisos, credenciales de Firebase), no aqui.
 *
 *   2. Expo acepta el mensaje?
 *      Si responde error, lo dice con su motivo. El mas comun es que
 *      falten las credenciales de FCM del proyecto.
 *
 *   3. Llego al telefono?
 *      Eso ya se mira en el aparato. Si Expo dijo "ok" y no llego, el
 *      mensaje se perdio despues de Expo.
 */
async function probar(): Promise<void> {
  const entorno = cargarEntorno();
  const contenedor = construirContenedor(entorno);

  try {
    if (entorno.notificaciones === 'consola') {
      console.log(
        'NOTIFICACIONES=consola: el servidor no envia avisos remotos.\n' +
          'Ponlo en "ambos" o en "push" en el archivo .env si quieres probarlos.',
      );
      return;
    }

    // Se consulta la base de datos directamente y no por el repositorio.
    // El puerto RepositorioDeDispositivos no tiene —ni debe tener— un
    // "listarTodos": ningun caso de uso necesita todos los telefonos del
    // sistema, y agregarlo al dominio para que lo use un script de
    // diagnostico seria meter una necesidad de depuracion dentro de las
    // reglas de negocio. Este archivo ES infraestructura, asi que puede
    // hablar con la base de datos.
    const dispositivos = await listarTelefonos(contenedor.pool);

    console.log('');
    console.log('  1. Telefonos registrados');
    console.log('  ------------------------');

    if (dispositivos.length === 0) {
      console.log('  Ninguno.');
      console.log('');
      console.log('  La aplicacion movil no ha conseguido registrar ningun telefono. Eso');
      console.log('  ocurre antes de llegar al servidor, asi que el problema no esta aqui.');
      console.log('  Mira la terminal de Expo: si sale un aviso "[push] Este dispositivo no');
      console.log('  recibira avisos REMOTOS", el motivo esta escrito ahi.');
      console.log('  Ver docs/NOTIFICACIONES.md');
      console.log('');
      return;
    }

    for (const telefono of dispositivos) {
      console.log(
        `  ${telefono.plataforma.padEnd(8)} ${telefono.tipoDePropietario.padEnd(9)} ${ocultar(telefono.token)}`,
      );
    }

    console.log('');
    console.log('  2. Enviando un aviso de prueba a traves de Expo');
    console.log('  -----------------------------------------------');

    const cliente = new ClienteDeExpoHttp(entorno.expoTokenDeAcceso);
    const mensajes = dispositivos.map((telefono) => ({
      to: telefono.token,
      title: 'Chronova: prueba',
      body: 'Si ves este aviso, las notificaciones remotas funcionan.',
      sound: 'default' as const,
      priority: 'high' as const,
      channelId: 'chronova-tomas',
      data: { tipo: 'PRUEBA' },
    }));

    let acuses;
    try {
      acuses = await cliente.enviar(mensajes);
    } catch (error) {
      // Si ni siquiera se pudo hablar con Expo, el fallo esta antes de
      // las credenciales de Firebase y conviene decirlo: buscar en el
      // sitio equivocado cuesta mas que el fallo mismo.
      const motivo = error instanceof Error ? error.message : String(error);
      console.log(`  No se pudo hablar con Expo: ${motivo}`);
      console.log('');
      console.log('  Esto NO es lo de Firebase: la peticion no llego a salir. Suele ser:');
      console.log('    - Sin conexion a internet, o una red que bloquea exp.host.');
      console.log('    - Un EXPO_ACCESS_TOKEN mal puesto en .env (daria 401 o 403).');
      console.log('      Si no lo necesitas, dejalo vacio: es opcional.');
      console.log('');
      return;
    }

    let aceptados = 0;
    acuses.forEach((acuse, i) => {
      const destino = ocultar(mensajes[i]?.to ?? '');
      if (acuse.status === 'ok') {
        aceptados += 1;
        console.log(`  ${destino}  ACEPTADO`);
      } else {
        console.log(`  ${destino}  RECHAZADO: ${acuse.details?.error ?? ''} ${acuse.message ?? ''}`);
      }
    });

    console.log('');
    console.log('  3. Y ahora?');
    console.log('  -----------');
    if (aceptados === 0) {
      console.log('  Expo rechazo todos los mensajes. El motivo esta escrito arriba.');
      console.log('  Si dice algo de credenciales o de FCM, es lo de Firebase:');
      console.log('  ver docs/NOTIFICACIONES.md');
    } else {
      console.log(`  Expo acepto ${aceptados} mensaje(s). Mira el telefono.`);
      console.log('  Si llego: las notificaciones remotas funcionan de punta a punta.');
      console.log('  Si NO llego: se perdio despues de Expo. Revisa que el telefono tenga');
      console.log('  permiso de notificaciones y que la app no este restringida por bateria.');
      console.log('');
      console.log('  Ojo: "aceptado" significa que Expo lo recibio, no que llego. La entrega');
      console.log('  real se confirma con los recibos, que este proyecto no consulta.');
    }
    console.log('');
  } finally {
    await contenedor.cerrar();
  }
}

interface TelefonoRegistrado {
  token: string;
  plataforma: string;
  tipoDePropietario: string;
}

async function listarTelefonos(pool: unknown): Promise<TelefonoRegistrado[]> {
  if (!pool) {
    console.log('');
    console.log('  PERSISTENCE=memory: no hay base de datos, asi que no hay telefonos');
    console.log('  guardados. Pon PERSISTENCE=postgres para probar esto.');
    return [];
  }

  const { rows } = await (pool as { query: (sql: string) => Promise<{ rows: TelefonoRegistrado[] }> })
    .query(
      'SELECT token, plataforma, tipo_de_propietario AS "tipoDePropietario" ' +
        'FROM dispositivos ORDER BY registrado_en DESC',
    );

  return rows;
}

/** Un token de Expo identifica un telefono: no se imprime entero. */
function ocultar(token: string): string {
  if (token.length <= 16) return '****';
  return `${token.slice(0, 12)}...${token.slice(-6)}`;
}

probar().catch((error) => {
  console.error('\nLa prueba fallo:', error instanceof Error ? error.message : error);
  process.exit(1);
});
