import 'dotenv/config';

export type ModoDePersistencia = 'memory' | 'postgres';
export type ModoDeNotificaciones = 'consola' | 'push' | 'ambos';
export type ModoDeCorreo = 'consola' | 'resend';

export interface Entorno {
  puerto: number;
  entornoDeEjecucion: 'development' | 'production' | 'test';
  jwtSecreto: string;
  jwtDuracion: string;
  persistencia: ModoDePersistencia;
  urlDeBaseDeDatos: string;
  baseDeDatosConSsl: boolean;
  ventanaDeToleranciaEnMinutos: number;
  notificaciones: ModoDeNotificaciones;
  /** Como salen los correos: por consola o por un proveedor real. */
  correo: ModoDeCorreo;
  correoClaveApi: string | undefined;
  correoRemitente: string;
  expoTokenDeAcceso: string | undefined;
}

function leerNumero(valor: string | undefined, porDefecto: number): number {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : porDefecto;
}

/**
 * Lee y valida la configuracion una sola vez, al arrancar.
 *
 * Si falta algo critico, el servidor no levanta y dice exactamente que
 * falta. Es preferible fallar al iniciar que descubrir a las 3 semanas
 * que los tokens se estaban firmando con la clave de ejemplo.
 */
export function cargarEntorno(): Entorno {
  const entornoDeEjecucion = (process.env.NODE_ENV ?? 'development') as Entorno['entornoDeEjecucion'];
  const persistencia = (process.env.PERSISTENCE ?? 'memory') as ModoDePersistencia;

  if (persistencia !== 'memory' && persistencia !== 'postgres') {
    throw new Error(`PERSISTENCE debe ser "memory" o "postgres", no "${persistencia}".`);
  }

  const jwtSecreto = process.env.JWT_SECRET ?? '';
  if (jwtSecreto.length < 16) {
    throw new Error(
      'Falta JWT_SECRET o es demasiado corto (minimo 16 caracteres). ' +
        'Copia el archivo .env.example a .env y completa el valor.',
    );
  }
  if (entornoDeEjecucion === 'production' && jwtSecreto.includes('cambia-esta-clave')) {
    throw new Error('Estas usando el JWT_SECRET de ejemplo en produccion. Cambialo.');
  }

  const urlDeBaseDeDatos = process.env.DATABASE_URL ?? '';
  if (persistencia === 'postgres' && urlDeBaseDeDatos.length === 0) {
    throw new Error('PERSISTENCE=postgres requiere que definas DATABASE_URL en el archivo .env.');
  }

  const correo = (process.env.CORREO ?? 'consola') as ModoDeCorreo;
  if (correo !== 'consola' && correo !== 'resend') {
    throw new Error(`CORREO debe ser "consola" o "resend", no "${correo}".`);
  }
  if (correo === 'resend' && !process.env.RESEND_API_KEY) {
    throw new Error('CORREO=resend requiere que definas RESEND_API_KEY en el archivo .env.');
  }

  const notificaciones = (process.env.NOTIFICACIONES ?? 'consola') as ModoDeNotificaciones;
  if (!['consola', 'push', 'ambos'].includes(notificaciones)) {
    throw new Error(
      `NOTIFICACIONES debe ser "consola", "push" o "ambos", no "${notificaciones}".`,
    );
  }

  return {
    puerto: leerNumero(process.env.PORT, 4000),
    entornoDeEjecucion,
    jwtSecreto,
    jwtDuracion: process.env.JWT_EXPIRES_IN ?? '7d',
    persistencia,
    urlDeBaseDeDatos,
    baseDeDatosConSsl: process.env.DATABASE_SSL === 'true',
    ventanaDeToleranciaEnMinutos: leerNumero(process.env.VENTANA_TOLERANCIA_MINUTOS, 60),
    notificaciones,
    correo,
    correoClaveApi: process.env.RESEND_API_KEY,
    correoRemitente: process.env.CORREO_REMITENTE ?? 'Chronova <onboarding@resend.dev>',
    expoTokenDeAcceso: process.env.EXPO_ACCESS_TOKEN || undefined,
  };
}
