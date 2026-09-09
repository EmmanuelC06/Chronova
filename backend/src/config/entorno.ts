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
      'Falta JWT_SECRET o es demasiado corto (mínimo 16 caracteres). ' +
        'Copia el archivo .env.example a .env y completa el valor.',
    );
  }

  /**
   * La clave de ejemplo se rechaza SIEMPRE, no solo en produccion.
   *
   * Antes esta comprobacion pedia que NODE_ENV fuera exactamente
   * "production", y ese es justo el detalle que se olvida al desplegar:
   * en una plataforma en la nube, si nadie declara esa variable, el
   * servidor arranca creyendose de desarrollo y acepta la clave que esta
   * escrita en .env.example —es decir, en el repositorio, a la vista de
   * cualquiera—.
   *
   * Con esa clave, quien la tenga puede FABRICAR un token de sesion
   * valido para cualquier cuenta. No hay que adivinar contrasenas ni
   * romper nada: se firma un token a nombre de quien sea y el servidor lo
   * da por bueno, con acceso a los datos de salud de esa persona. Es el
   * fallo mas grave que puede tener este proyecto, y la unica proteccion
   * dependia de acordarse de una variable de entorno.
   */
  if (jwtSecreto.includes('cambia-esta-clave')) {
    throw new Error(
      'Estas usando el JWT_SECRET de ejemplo, el que viene en .env.example y esta publicado ' +
        'en el repositorio. Con esa clave cualquiera puede fabricar una sesión válida a nombre ' +
        'de cualquier paciente. Genera una propia, por ejemplo con: ' +
        'node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"',
    );
  }

  // Con base de datos real hay personas reales detras. Una clave corta se
  // puede probar por fuerza bruta fuera de linea: quien tenga UN token
  // firmado puede ensayar claves hasta dar con la que lo valida, sin
  // tocar el servidor y sin que nadie lo note.
  if (persistencia === 'postgres' && jwtSecreto.length < 32) {
    throw new Error(
      'Con PERSISTENCE=postgres el JWT_SECRET debe tener al menos 32 caracteres. ' +
        'Genera uno con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"',
    );
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
