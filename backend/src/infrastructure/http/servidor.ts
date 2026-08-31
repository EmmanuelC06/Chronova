import cors from 'cors';
import express from 'express';
import type { Express } from 'express';
import type { Contenedor } from '../../contenedor.js';
import { manejadorDeErrores } from './middlewares/manejadorDeErrores.js';
import { rutasDeAutenticacion } from './routes/autenticacion.js';
import { rutasDeCuidadores } from './routes/cuidadores.js';
import { rutasDeMedicamentos } from './routes/medicamentos.js';
import { rutasDeTomas } from './routes/tomas.js';

/**
 * ADAPTADOR DE ENTRADA: la API HTTP.
 *
 * Es solo una de las formas posibles de invocar la aplicacion. Podrian
 * anadirse otras (una CLI, una cola de mensajes, tareas programadas) sin
 * tocar ni el dominio ni los casos de uso, porque todas usarian el mismo
 * contenedor.
 *
 * Se devuelve la app sin arrancarla para que las pruebas puedan usarla
 * sin ocupar un puerto de red.
 */
export function crearServidor(contenedor: Contenedor): Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '256kb' }));

  // Comprobacion de vida: util para el despliegue y para verificar
  // desde el telefono que la API responde.
  app.get('/api/salud', (_peticion, respuesta) => {
    respuesta.json({
      servicio: 'Chronova API',
      estado: 'ok',
      persistencia: contenedor.entorno.persistencia,
      fecha: new Date().toISOString(),
    });
  });

  app.use('/api/auth', rutasDeAutenticacion(contenedor));
  app.use('/api/medicamentos', rutasDeMedicamentos(contenedor));
  app.use('/api/tomas', rutasDeTomas(contenedor));
  app.use('/api', rutasDeCuidadores(contenedor));

  // Ruta no encontrada.
  app.use((peticion, respuesta) => {
    respuesta.status(404).json({
      error: {
        codigo: 'NO_ENCONTRADO',
        mensaje: `La ruta ${peticion.method} ${peticion.path} no existe en esta API.`,
      },
    });
  });

  // El manejador de errores va al final: Express lo reconoce por tener
  // cuatro parametros.
  app.use(manejadorDeErrores);

  return app;
}
