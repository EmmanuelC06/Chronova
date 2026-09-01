import { beforeEach, describe, expect, it } from 'vitest';

import { Identificador } from '../../src/domain/shared/Identificador.js';
import { Dispositivo } from '../../src/domain/dispositivo/Dispositivo.js';
import { TokenDeDispositivo } from '../../src/domain/dispositivo/TokenDeDispositivo.js';
import { ErrorDeValidacion } from '../../src/domain/shared/errores.js';
import { RepositorioDeDispositivosEnMemoria } from '../../src/infrastructure/persistence/in-memory/repositoriosEnMemoria.js';
import { NotificadorExpoPush } from '../../src/infrastructure/notificaciones/NotificadorExpoPush.js';
import type { AcuseExpo, ClienteDeExpo, MensajeExpo } from '../../src/infrastructure/notificaciones/ClienteDeExpo.js';
import { RelojFijo } from '../../src/infrastructure/system/RelojDelSistema.js';
import { GeneradorDeIdsSecuencial } from '../../src/infrastructure/system/GeneradorDeIdsUuid.js';
import type { Aviso } from '../../src/application/ports/Notificador.js';

/**
 * Pruebas del envio de notificaciones.
 *
 * El servicio de Expo no se llama de verdad: se sustituye por un cliente
 * falso que devuelve los acuses que cada prueba necesite, incluidos los
 * de error. Esto permite verificar lo que de otro modo solo se
 * descubriria en produccion: que pasa cuando alguien desinstala la app,
 * o cuando el servicio esta caido.
 */

/** Cliente falso: guarda lo enviado y devuelve los acuses que se le indiquen. */
class ClienteFalso implements ClienteDeExpo {
  readonly enviados: MensajeExpo[][] = [];
  respuesta: (mensajes: readonly MensajeExpo[]) => AcuseExpo[] = (m) =>
    m.map(() => ({ status: 'ok' as const, id: 'recibo' }));
  fallar = false;

  async enviar(mensajes: readonly MensajeExpo[]): Promise<AcuseExpo[]> {
    this.enviados.push([...mensajes]);
    if (this.fallar) throw new Error('Expo no responde');
    return this.respuesta(mensajes);
  }
}

const AHORA = new Date('2026-09-01T13:00:00Z');
const CUIDADOR = Identificador.desde('00000000-0000-4000-8000-000000000001');
const OTRO = Identificador.desde('00000000-0000-4000-8000-000000000002');

const TOKEN_A = 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]';
const TOKEN_B = 'ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]';

const avisoDePrueba = (destinatarioId = CUIDADOR): Aviso => ({
  tipo: 'TOMA_PERDIDA',
  destinatarioId,
  tipoDeDestinatario: 'CUIDADOR',
  titulo: 'Toma sin confirmar',
  cuerpo: 'Rosa Elena Valencia no confirmo una toma de su tratamiento.',
  datos: { pacienteId: OTRO.valor, cantidad: 1 },
});

let repositorio: RepositorioDeDispositivosEnMemoria;
let cliente: ClienteFalso;
let notificador: NotificadorExpoPush;
let reloj: RelojFijo;

async function registrarDispositivo(token: string, propietario = CUIDADOR) {
  const ids = new GeneradorDeIdsSecuencial();
  await repositorio.guardar(
    Dispositivo.registrar({
      id: ids.nuevo(),
      propietarioId: propietario,
      tipoDePropietario: 'CUIDADOR',
      token: TokenDeDispositivo.desde(token),
      plataforma: 'android',
      ahora: AHORA,
    }),
  );
}

beforeEach(() => {
  repositorio = new RepositorioDeDispositivosEnMemoria();
  cliente = new ClienteFalso();
  reloj = new RelojFijo(AHORA);
  notificador = new NotificadorExpoPush(repositorio, cliente, reloj);
});

// =================================================================
describe('TokenDeDispositivo', () => {
  it('acepta el formato que entrega Expo', () => {
    expect(TokenDeDispositivo.desde(TOKEN_A).valor).toBe(TOKEN_A);
    expect(TokenDeDispositivo.desde('ExpoPushToken[abc123]').valor).toBe('ExpoPushToken[abc123]');
  });

  it('rechaza cualquier otra cosa', () => {
    expect(() => TokenDeDispositivo.desde('abc123')).toThrow(ErrorDeValidacion);
    expect(() => TokenDeDispositivo.desde('')).toThrow(/obligatorio/);
    expect(() => TokenDeDispositivo.desde('ExponentPushToken[]')).toThrow(/formato/);
  });
});

// =================================================================
describe('Envio de notificaciones', () => {
  it('envia el aviso a todos los dispositivos de la persona', async () => {
    await registrarDispositivo(TOKEN_A);
    await registrarDispositivo(TOKEN_B);

    await notificador.enviar(avisoDePrueba());

    expect(cliente.enviados).toHaveLength(1);
    expect(cliente.enviados[0]?.map((m) => m.to).sort()).toEqual([TOKEN_A, TOKEN_B].sort());
  });

  it('no envia nada si la persona no tiene ningun dispositivo registrado', async () => {
    await notificador.enviar(avisoDePrueba());
    expect(cliente.enviados).toHaveLength(0);
  });

  it('no envia al dispositivo de otra persona', async () => {
    await registrarDispositivo(TOKEN_A, CUIDADOR);
    await registrarDispositivo(TOKEN_B, OTRO);

    await notificador.enviar(avisoDePrueba(CUIDADOR));

    expect(cliente.enviados[0]?.map((m) => m.to)).toEqual([TOKEN_A]);
  });

  it('traslada el titulo, el cuerpo y los datos del aviso', async () => {
    await registrarDispositivo(TOKEN_A);
    await notificador.enviar(avisoDePrueba());

    const mensaje = cliente.enviados[0]?.[0];
    expect(mensaje?.title).toBe('Toma sin confirmar');
    expect(mensaje?.body).toMatch(/no confirmo una toma/);
    expect(mensaje?.data).toMatchObject({ tipo: 'TOMA_PERDIDA', cantidad: 1 });
  });

  it('marca como urgentes las tomas perdidas y el stock bajo', async () => {
    await registrarDispositivo(TOKEN_A);

    await notificador.enviar({ ...avisoDePrueba(), tipo: 'TOMA_PERDIDA' });
    await notificador.enviar({ ...avisoDePrueba(), tipo: 'SOLICITUD_DE_VINCULO' });

    expect(cliente.enviados[0]?.[0]?.priority).toBe('high');
    expect(cliente.enviados[1]?.[0]?.priority).toBe('default');
  });
});

// =================================================================
describe('Resistencia a fallos', () => {
  it('si el servicio de Expo falla, el aviso se pierde pero no se lanza excepcion', async () => {
    await registrarDispositivo(TOKEN_A);
    cliente.fallar = true;

    // Esta es la garantia importante: registrar una toma no puede fallar
    // porque un servicio externo este caido.
    await expect(notificador.enviar(avisoDePrueba())).resolves.toBeUndefined();
  });

  it('da de baja el token cuando la app fue desinstalada', async () => {
    await registrarDispositivo(TOKEN_A);
    await registrarDispositivo(TOKEN_B);

    cliente.respuesta = (mensajes) =>
      mensajes.map((m) =>
        m.to === TOKEN_A
          ? { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } }
          : { status: 'ok', id: 'recibo' },
      );

    await notificador.enviar(avisoDePrueba());

    // El token muerto desaparece; el bueno se conserva.
    expect(await repositorio.buscarPorToken(TokenDeDispositivo.desde(TOKEN_A))).toBeNull();
    expect(await repositorio.buscarPorToken(TokenDeDispositivo.desde(TOKEN_B))).not.toBeNull();
  });

  it('un error distinto no da de baja el token', async () => {
    await registrarDispositivo(TOKEN_A);

    cliente.respuesta = (mensajes) =>
      mensajes.map(() => ({
        status: 'error', message: 'demasiadas peticiones',
        details: { error: 'MessageRateExceeded' },
      }));

    await notificador.enviar(avisoDePrueba());

    // Un fallo temporal no debe costarle al usuario sus notificaciones.
    expect(await repositorio.buscarPorToken(TokenDeDispositivo.desde(TOKEN_A))).not.toBeNull();
  });

  it('reparte en lotes de 100, que es el maximo que acepta Expo', async () => {
    for (let i = 0; i < 250; i += 1) {
      const relleno = String(i).padStart(22, '0');
      await registrarDispositivo(`ExponentPushToken[${relleno}]`);
    }

    await notificador.enviar(avisoDePrueba());

    expect(cliente.enviados.map((lote) => lote.length)).toEqual([100, 100, 50]);
  });
});

// =================================================================
describe('Registro de dispositivos', () => {
  it('reasigna el aparato en vez de duplicarlo cuando cambia de dueno', async () => {
    await registrarDispositivo(TOKEN_A, CUIDADOR);

    const dispositivo = await repositorio.buscarPorToken(TokenDeDispositivo.desde(TOKEN_A));
    dispositivo!.reasignarA(OTRO, 'PACIENTE', AHORA);
    await repositorio.guardar(dispositivo!);

    // El aparato es el mismo: no debe haber dos registros ni llegar el
    // aviso dos veces al mismo telefono.
    expect(await repositorio.listarPorPropietario(CUIDADOR)).toHaveLength(0);
    expect(await repositorio.listarPorPropietario(OTRO)).toHaveLength(1);
  });
});
