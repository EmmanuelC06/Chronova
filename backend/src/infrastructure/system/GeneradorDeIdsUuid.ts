import { randomInt, randomUUID } from 'node:crypto';
import { Identificador } from '../../domain/shared/Identificador.js';
import type { GeneradorDeIds } from '../../application/ports/GeneradorDeIds.js';
import type { GeneradorDeCodigos } from '../../application/ports/GeneradorDeCodigos.js';

/** ADAPTADOR del puerto GeneradorDeIds usando UUID v4. */
export class GeneradorDeIdsUuid implements GeneradorDeIds {
  nuevo(): Identificador {
    return Identificador.desde(randomUUID());
  }
}

/** Generador predecible para pruebas: uuid v4 valido pero secuencial. */
export class GeneradorDeIdsSecuencial implements GeneradorDeIds {
  private contador = 0;

  nuevo(): Identificador {
    this.contador += 1;
    const sufijo = String(this.contador).padStart(12, '0');
    return Identificador.desde(`00000000-0000-4000-8000-${sufijo}`);
  }
}

/**
 * ADAPTADOR del generador de codigos.
 *
 * Usa randomInt del modulo crypto, que toma su aleatoriedad del sistema
 * operativo. Math.random NO sirve aqui: es predecible, y un codigo de
 * recuperacion predecible es una puerta abierta a cualquier cuenta.
 */
export class GeneradorDeCodigosSeguro implements GeneradorDeCodigos {
  nuevo(longitud: number): string {
    let codigo = '';
    for (let i = 0; i < longitud; i += 1) codigo += String(randomInt(0, 10));
    return codigo;
  }
}

/** Codigo fijo, para pruebas. */
export class GeneradorDeCodigosFijo implements GeneradorDeCodigos {
  constructor(private readonly codigo = '123456') {}
  nuevo(longitud: number): string {
    return this.codigo.padStart(longitud, '0').slice(0, longitud);
  }
}
