import type { Reloj } from '../../application/ports/Reloj.js';

/** ADAPTADOR del puerto Reloj: la hora real del servidor. */
export class RelojDelSistema implements Reloj {
  ahora(): Date {
    return new Date();
  }
}

/**
 * Reloj congelado, util en pruebas.
 *
 * Permite escribir "son las 8:05 y la toma era a las 8:00" sin esperar
 * a que sean las ocho de la manana de verdad.
 */
export class RelojFijo implements Reloj {
  constructor(private instante: Date) {}

  ahora(): Date {
    return new Date(this.instante);
  }

  mover(instante: Date): void {
    this.instante = instante;
  }

  avanzarMinutos(minutos: number): void {
    this.instante = new Date(this.instante.getTime() + minutos * 60_000);
  }
}
