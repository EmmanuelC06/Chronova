import { randomUUID } from 'node:crypto';
import { Identificador } from '../../domain/shared/Identificador.js';
import type { GeneradorDeIds } from '../../application/ports/GeneradorDeIds.js';

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
