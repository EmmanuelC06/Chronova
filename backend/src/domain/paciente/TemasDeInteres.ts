import { ErrorDeValidacion } from '../shared/errores.js';

/**
 * Los temas que una persona puede marcar como de su interes.
 *
 * El servidor guarda CLAVES, no textos. Los titulos y los contenidos
 * viven en la aplicacion, y es a proposito: si manana se reescribe el
 * texto de "El sueño" no hay que migrar ninguna fila, y una version
 * vieja de la app que no conozca una clave nueva simplemente no la
 * dibuja, en vez de enseñar una cadena rara.
 *
 * La lista es CERRADA. No es texto libre, y no debe serlo nunca: un
 * campo abierto aqui seria un sitio donde la gente escribiria el nombre
 * de su enfermedad, y eso convertiria una preferencia de lectura en un
 * dato de salud guardado sin que nadie lo decidiera.
 */
export const TEMAS_DISPONIBLES = [
  'MEMORIA',
  'CITA',
  'SUENO',
  'ALIMENTACION',
  'MOVIMIENTO',
  'ANIMO',
] as const;

export type Tema = (typeof TEMAS_DISPONIBLES)[number];

/**
 * Cuantos se pueden marcar a la vez.
 *
 * El tope no es tecnico. Marcarlos todos equivale a no elegir nada, y
 * ademas el reporte tiene que caber en una linea legible: "le interesan
 * el sueño, la alimentacion, moverse, el animo, la memoria y la cita"
 * no le dice nada a quien lo lee. Cuatro obliga a elegir, que es lo que
 * hace util el dato.
 */
export const MAXIMO_DE_TEMAS = 4;

/**
 * Cuantos periodos cerrados se conservan.
 *
 * El historial crece cada vez que alguien marca o desmarca, y sin tope
 * una persona indecisa acabaria con una fila enorme que no le sirve a
 * nadie: un reporte mira como mucho un año. Al pasarse, se tiran los
 * periodos cerrados mas antiguos. Los abiertos no se tiran nunca,
 * porque son el estado actual.
 */
export const MAXIMO_DE_PERIODOS = 60;

/**
 * Un periodo en el que un tema estuvo marcado.
 *
 * `desde` en null significa "no se sabe desde cuando", y le pasa a las
 * cuentas anteriores a que esto se guardara con fecha: entonces solo se
 * guardaba la lista de lo marcado. Se trata como "desde siempre", que es
 * lo unico honesto que se puede decir de ellas.
 *
 * `hasta` en null significa que sigue marcado ahora.
 */
export interface PeriodoDeTema {
  tema: Tema;
  desde: Date | null;
  hasta: Date | null;
}

interface PeriodoPlano {
  tema: string;
  desde: string | null;
  hasta: string | null;
}

/**
 * Value Object: los temas de un paciente, CON SU HISTORIA.
 *
 * Por que una historia y no la lista de lo marcado ahora
 * ------------------------------------------------------
 * La primera version guardaba solo la foto del momento, y el reporte la
 * imprimia debajo de un encabezado que dice "Periodo del 15 de abril al
 * 12 de octubre". Eran dos marcos de tiempo distintos en la misma hoja:
 * si la persona marco el sueño ayer, el documento insinuaba seis meses
 * de interes; y si tuvo el animo marcado cinco meses y lo quito la
 * semana pasada, no aparecia, cuando probablemente era lo que mas le
 * decia al medico.
 *
 * Guardando desde cuando y hasta cuando, la pregunta que el reporte
 * necesita —"¿que le interesaba durante estos meses?"— tiene respuesta.
 *
 * Que esto NO es
 * --------------
 * No es un registro de lo que la persona LEYO. No se cuenta cuantas
 * veces abrio cada tema ni cuanto tiempo estuvo en el. Solo queda
 * constancia de lo que ella misma declaro, y cuando lo declaro, que es
 * un dato suyo que ella controla y puede quitar.
 */
export class TemasDeInteres {
  private constructor(readonly periodos: readonly PeriodoDeTema[]) {}

  static ninguno(): TemasDeInteres {
    return new TemasDeInteres([]);
  }

  /** Los que estan marcados ahora mismo, en el orden del catalogo. */
  get vigentes(): Tema[] {
    const abiertos = this.periodos.filter((p) => p.hasta === null).map((p) => p.tema);
    return TEMAS_DISPONIBLES.filter((t) => abiertos.includes(t));
  }

  get estanVacios(): boolean {
    return this.vigentes.length === 0;
  }

  /**
   * Los temas que estuvieron marcados en algun momento del periodo.
   *
   * Se usa SOLAPAMIENTO y no "estaba marcado el ultimo dia": un tema que
   * se tuvo marcado de abril a julio formo parte de esos meses aunque
   * hoy no lo este, y es justo el caso que esta clase existe para
   * resolver.
   *
   * Los extremos cuentan. Un tema marcado el mismo dia en que termina el
   * periodo entra: excluirlo seria una precision falsa sobre un dato que
   * la persona declaro a mano.
   */
  marcadosEntre(desde: Date, hasta: Date): Tema[] {
    const dentro = this.periodos
      .filter((p) => {
        // Empezo antes de que el periodo acabara...
        const empezoATiempo = p.desde === null || p.desde.getTime() <= hasta.getTime();
        // ...y no habia terminado cuando el periodo empezo.
        const seguiaVivo = p.hasta === null || p.hasta.getTime() >= desde.getTime();
        return empezoATiempo && seguiaVivo;
      })
      .map((p) => p.tema);

    return TEMAS_DISPONIBLES.filter((t) => dentro.includes(t));
  }

  /**
   * Deja marcados exactamente estos temas, y anota el cambio.
   *
   * Recibe la lista COMPLETA de lo que queda marcado, no un añadir ni un
   * quitar: asi dos telefonos de la misma persona no pueden acabar
   * sumando temas que ella ya habia quitado en el otro.
   *
   * Los que ya estaban marcados conservan su fecha de inicio. Volver a
   * mandar la misma lista no parte un periodo en dos ni mueve nada, que
   * importa porque la pantalla guarda en cada toque y un reintento de
   * red no debe inventar historia.
   */
  cambiarA(claves: readonly unknown[], ahora: Date): TemasDeInteres {
    const deseados = validar(claves);
    const vigentes = this.vigentes;

    const periodos = this.periodos.map((p) => {
      // Lo que estaba abierto y ya no se quiere, se cierra ahora.
      if (p.hasta === null && !deseados.includes(p.tema)) {
        return { ...p, hasta: ahora };
      }
      return p;
    });

    for (const tema of deseados) {
      if (!vigentes.includes(tema)) {
        periodos.push({ tema, desde: ahora, hasta: null });
      }
    }

    return new TemasDeInteres(podar(periodos));
  }

  /** Para leer lo guardado, tolerando filas antiguas o corruptas. */
  static desdePlano(valor: unknown): TemasDeInteres {
    if (!Array.isArray(valor)) return TemasDeInteres.ninguno();

    try {
      const periodos: PeriodoDeTema[] = [];

      for (const bruto of valor) {
        /*
          Formato ANTIGUO: una lista de cadenas, sin fechas.

          Asi se guardo entre que existio el selector de temas y que
          existio esta historia. Se lee como "marcado desde siempre",
          que es lo unico honesto: consta que lo marco y no consta
          cuando. Como `desde` es null, cuenta para cualquier periodo que
          se consulte, en vez de desaparecer de los reportes.
        */
        if (typeof bruto === 'string') {
          periodos.push({ tema: validarUna(bruto), desde: null, hasta: null });
          continue;
        }

        if (typeof bruto !== 'object' || bruto === null) {
          throw new ErrorDeValidacion('Formato de temas no reconocido.', 'temasDeInteres');
        }

        const plano = bruto as Partial<PeriodoPlano>;
        periodos.push({
          tema: validarUna(String(plano.tema)),
          desde: aFecha(plano.desde),
          hasta: aFecha(plano.hasta),
        });
      }

      // Lo guardado puede traer mas temas abiertos de los que hoy se
      // permiten (si manana bajara el tope, por ejemplo). Se respeta lo
      // que hay: el tope gobierna lo que se puede MARCAR, no invalida lo
      // que alguien marco cuando se podia.
      return new TemasDeInteres(podar(periodos));
    } catch {
      /*
        Una fila ilegible no debe impedir iniciar sesion.

        Esto es una preferencia de lectura: si se corrompio, lo peor que
        pasa es que la persona vuelva a marcar sus temas. Dejar que
        reviente aqui bloquearia el perfil entero, y con el la agenda y
        los recordatorios, por culpa de la parte menos importante del
        sistema.
      */
      return TemasDeInteres.ninguno();
    }
  }

  toJSON(): PeriodoPlano[] {
    return this.periodos.map((p) => ({
      tema: p.tema,
      desde: p.desde ? p.desde.toISOString() : null,
      hasta: p.hasta ? p.hasta.toISOString() : null,
    }));
  }
}

// -----------------------------------------------------------------

function validarUna(clave: string): Tema {
  const normalizada = clave.trim().toUpperCase();
  if (!TEMAS_DISPONIBLES.includes(normalizada as Tema)) {
    throw new ErrorDeValidacion(
      `"${clave}" no es un tema de los que ofrece la aplicación.`,
      'temasDeInteres',
    );
  }
  return normalizada as Tema;
}

/**
 * Comprueba la lista que llega de fuera y la deja en orden de catalogo.
 *
 * El orden normalizado importa porque de el sale la frase del reporte:
 * dos reportes del mismo mes no pueden diferenciarse solo en que una vez
 * se toco antes el sueño que la cita. Un documento que cambia sin que
 * haya cambiado nada hace dudar de todo lo demas que dice.
 */
function validar(claves: readonly unknown[]): Tema[] {
  if (!Array.isArray(claves)) {
    throw new ErrorDeValidacion(
      'Los temas de interés deben venir en una lista.',
      'temasDeInteres',
    );
  }

  const limpias: Tema[] = [];
  for (const clave of claves) {
    if (typeof clave !== 'string') {
      throw new ErrorDeValidacion('Cada tema de interés debe ser un texto.', 'temasDeInteres');
    }
    const tema = validarUna(clave);
    // Repetir un tema no es un error del usuario, es ruido de la red o
    // un doble toque. Se ignora en vez de rechazar la peticion.
    if (!limpias.includes(tema)) limpias.push(tema);
  }

  if (limpias.length > MAXIMO_DE_TEMAS) {
    throw new ErrorDeValidacion(
      `Se pueden elegir como máximo ${MAXIMO_DE_TEMAS} temas.`,
      'temasDeInteres',
    );
  }

  return TEMAS_DISPONIBLES.filter((t) => limpias.includes(t));
}

function aFecha(valor: unknown): Date | null {
  if (valor === null || valor === undefined) return null;
  const fecha = new Date(String(valor));
  if (Number.isNaN(fecha.getTime())) {
    throw new ErrorDeValidacion('Fecha de tema inválida.', 'temasDeInteres');
  }
  return fecha;
}

/**
 * Tira los periodos cerrados mas viejos cuando sobran.
 *
 * Los abiertos nunca se tiran: son el estado actual, y perderlos
 * desmarcaria temas a espaldas de la persona.
 */
function podar(periodos: readonly PeriodoDeTema[]): PeriodoDeTema[] {
  const abiertos = periodos.filter((p) => p.hasta === null);
  const cerrados = periodos.filter((p) => p.hasta !== null);

  const sobran = abiertos.length + cerrados.length - MAXIMO_DE_PERIODOS;
  if (sobran <= 0) return [...periodos];

  const conservados = cerrados
    .slice()
    .sort((a, b) => (a.hasta!.getTime() ?? 0) - (b.hasta!.getTime() ?? 0))
    .slice(sobran);

  // Se devuelven en el orden original de los que sobreviven, para que
  // guardar y volver a leer no reordene la fila sin motivo.
  return periodos.filter((p) => p.hasta === null || conservados.includes(p));
}
