import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { cargarEntorno } from '../../src/config/entorno.js';

/**
 * La clave con la que se firman las sesiones.
 *
 * Con la clave de ejemplo —que esta publicada en .env.example, dentro
 * del repositorio— cualquiera puede fabricar un token valido a nombre de
 * cualquier paciente y leer sus datos de salud. No hace falta adivinar
 * una contrasena: se firma y ya. Es el fallo mas grave que puede tener
 * este proyecto, y hasta ahora la unica proteccion era acordarse de
 * declarar NODE_ENV=production al desplegar.
 */
describe('La clave de firma de las sesiones', () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env = { ...original, PERSISTENCE: 'memory', DATABASE_URL: '' };
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it('rechaza la clave de ejemplo aunque NO se declare NODE_ENV', () => {
    delete process.env.NODE_ENV;
    process.env.JWT_SECRET = 'cambia-esta-clave-por-una-larga-y-secreta';

    expect(() => cargarEntorno()).toThrowError(/ejemplo/i);
  });

  it('rechaza la clave de ejemplo en desarrollo', () => {
    process.env.NODE_ENV = 'development';
    process.env.JWT_SECRET = 'cambia-esta-clave-por-una-larga-y-secreta';

    expect(() => cargarEntorno()).toThrowError(/ejemplo/i);
  });

  it('exige al menos 32 caracteres cuando hay base de datos real', () => {
    process.env.NODE_ENV = 'production';
    process.env.PERSISTENCE = 'postgres';
    process.env.DATABASE_URL = 'postgresql://u:p@ejemplo.test/db';
    process.env.JWT_SECRET = 'doce-caracteres-y-algo';

    expect(() => cargarEntorno()).toThrowError(/32 caracteres/);
  });

  it('acepta una clave propia y larga', () => {
    process.env.NODE_ENV = 'production';
    process.env.PERSISTENCE = 'postgres';
    process.env.DATABASE_URL = 'postgresql://u:p@ejemplo.test/db';
    process.env.JWT_SECRET = 'zQ8vN2pR7tK4wX9mL6bH3sD5fG1jY0cA8eU2iO7nP4rT6vB9';

    expect(() => cargarEntorno()).not.toThrow();
  });
});
