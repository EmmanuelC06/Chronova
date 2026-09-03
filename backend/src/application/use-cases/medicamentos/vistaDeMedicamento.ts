import type { Medicamento, MedicamentoPlano } from '../../../domain/medicamento/Medicamento.js';

/**
 * La forma en que un medicamento sale de la aplicacion hacia el cliente.
 *
 * Ademas de los datos guardados lleva tres campos ya "masticados", para
 * que la interfaz solo tenga que pintar: el texto de la dosis, el de la
 * frecuencia y si conviene reabastecer.
 */
export interface MedicamentoListado extends MedicamentoPlano {
  descripcionDeDosis: string;
  descripcionDeFrecuencia: string;
  necesitaReabastecimiento: boolean;
}

/**
 * Traduce una entidad a la vista que ve el cliente.
 *
 * Vive aparte porque **todos** los casos de uso que devuelven un
 * medicamento deben usarla. Cuando no era asi, listar devolvia una forma
 * y reabastecer o actualizar devolvian otra mas pobre, sin avisar: el
 * cliente recibia un objeto al que le faltaban campos que su propio tipo
 * declaraba, y solo se notaba el dia que alguien intentaba leerlos.
 */
export function aVistaDeMedicamento(medicamento: Medicamento): MedicamentoListado {
  return {
    ...medicamento.aPlano(),
    descripcionDeDosis: medicamento.dosis.descripcion,
    descripcionDeFrecuencia: medicamento.frecuencia.descripcion,
    necesitaReabastecimiento: medicamento.stock.necesitaReabastecimiento,
  };
}
