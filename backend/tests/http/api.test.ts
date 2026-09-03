import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { cuidadorDePrueba, levantarApi, pacienteDePrueba } from '../ayudasHttp.js';
import type { ApiDePrueba } from '../ayudasHttp.js';

/**
 * Pruebas de la API por HTTP.
 *
 * Cada bloque de este archivo corresponde a un defecto REAL que la
 * revision encontro y que las 146 pruebas anteriores no podian ver,
 * porque llaman a los casos de uso directamente y se saltan la capa
 * HTTP entera. Se escriben aqui para que, si alguna vuelve, falle.
 */
describe('API HTTP', () => {
  let api: ApiDePrueba;

  beforeEach(async () => {
    api = await levantarApi();
  });

  afterEach(async () => {
    await api.cerrar();
  });

  /** Deja una paciente con un medicamento, una toma confirmada y un cuidador vinculado. */
  async function escenarioConVinculo() {
    const paciente = await pacienteDePrueba(api);
    const cuidador = await cuidadorDePrueba(api);

    await api.peticion('POST', '/api/medicamentos', {
      token: paciente.token,
      cuerpo: {
        nombre: 'Losartan',
        dosis: { cantidad: 1, unidad: 'TABLETA' },
        frecuencia: { tipo: 'DIARIA' },
        horarios: ['08:00', '20:00'],
        fechaInicio: '2026-08-01',
      },
    });

    const agenda = await api.peticion('GET', '/api/tomas/agenda', { token: paciente.token });
    await api.peticion('POST', `/api/tomas/${agenda.cuerpo.elementos[0].tomaId}/registro`, {
      token: paciente.token,
      cuerpo: { accion: 'CONFIRMAR' },
    });

    const solicitud = await api.peticion('POST', '/api/vinculos', {
      token: cuidador.token,
      cuerpo: { emailDeLaOtraParte: 'rosa.a@prueba.test' },
    });
    const vinculoId = solicitud.cuerpo.vinculo?.id ?? solicitud.cuerpo.id;

    await api.peticion('POST', `/api/vinculos/${vinculoId}/respuesta`, {
      token: paciente.token,
      cuerpo: { respuesta: 'ACEPTAR' },
    });

    return { paciente, cuidador, vinculoId };
  }

  const panelDe = async (token: string) => {
    const { estado, cuerpo } = await api.peticion('GET', '/api/cuidadores/pacientes', { token });
    return { estado, fila: cuerpo.pacientes[0] };
  };

  describe('el panel del cuidador respeta puedeVerHistorial', () => {
    /**
     * El defecto: `ListarPacientesDelCuidador` era el unico caso de uso
     * que leia datos clinicos sin pasar por PoliticaDeAcceso. Al retirar
     * el permiso, tres endpoints devolvian 403 y el panel seguia
     * devolviendo la adherencia, los medicamentos y la ultima actividad.
     */
    it('muestra los datos clinicos mientras el permiso esta concedido', async () => {
      const { cuidador } = await escenarioConVinculo();

      const { estado, fila } = await panelDe(cuidador.token);

      expect(estado).toBe(200);
      expect(fila.datosClinicosVisibles).toBe(true);
      expect(fila.medicamentosActivos).toBe(1);
      expect(fila.adherencia.tomadas).toBe(1);
      expect(fila.ultimaActividad).not.toBeNull();
    });

    it('los deja de mostrar en cuanto el paciente retira el permiso', async () => {
      const { paciente, cuidador, vinculoId } = await escenarioConVinculo();

      const cambio = await api.peticion('PATCH', `/api/vinculos/${vinculoId}/permisos`, {
        token: paciente.token,
        cuerpo: { puedeVerHistorial: false },
      });
      expect(cambio.estado).toBe(200);

      const { fila } = await panelDe(cuidador.token);

      expect(fila.datosClinicosVisibles).toBe(false);
      expect(fila.medicamentosActivos).toBe(0);
      expect(fila.adherencia.tomadas).toBe(0);
      expect(fila.adherencia.nivel).toBe('SIN_DATOS');
      expect(fila.ultimaActividad).toBeNull();
    });

    it('coincide con lo que responden los demas endpoints', async () => {
      const { paciente, cuidador, vinculoId } = await escenarioConVinculo();
      await api.peticion('PATCH', `/api/vinculos/${vinculoId}/permisos`, {
        token: paciente.token,
        cuerpo: { puedeVerHistorial: false },
      });

      // Esta es la comprobacion que importa: que las cuatro puertas
      // digan lo mismo. Antes tres decian 403 y la cuarta abria.
      for (const ruta of [
        `/api/medicamentos?pacienteId=${paciente.id}`,
        `/api/tomas/agenda?pacienteId=${paciente.id}`,
        `/api/tomas/historial?pacienteId=${paciente.id}`,
      ]) {
        const { estado } = await api.peticion('GET', ruta, { token: cuidador.token });
        expect(estado, ruta).toBe(403);
      }

      const { fila } = await panelDe(cuidador.token);
      expect(fila.datosClinicosVisibles).toBe(false);
    });

    it('sigue mostrando la fila, para que el cuidador sepa que el vinculo existe', async () => {
      const { paciente, cuidador, vinculoId } = await escenarioConVinculo();
      await api.peticion('PATCH', `/api/vinculos/${vinculoId}/permisos`, {
        token: paciente.token,
        cuerpo: { puedeVerHistorial: false },
      });

      const { fila } = await panelDe(cuidador.token);

      // Ocultar la fila entera seria peor: el cuidador creeria que el
      // vinculo desaparecio y volveria a solicitarlo.
      expect(fila.nombre).toBe('Rosa Valencia');
      expect(fila.estadoDelVinculo).toBe('ACEPTADO');
      expect(fila.permisos.puedeVerHistorial).toBe(false);
    });

    it('vuelve a mostrarlos si el paciente lo concede de nuevo', async () => {
      const { paciente, cuidador, vinculoId } = await escenarioConVinculo();

      await api.peticion('PATCH', `/api/vinculos/${vinculoId}/permisos`, {
        token: paciente.token,
        cuerpo: { puedeVerHistorial: false },
      });
      await api.peticion('PATCH', `/api/vinculos/${vinculoId}/permisos`, {
        token: paciente.token,
        cuerpo: { puedeVerHistorial: true },
      });

      const { fila } = await panelDe(cuidador.token);
      expect(fila.datosClinicosVisibles).toBe(true);
      expect(fila.medicamentosActivos).toBe(1);
    });
  });

  describe('consultar un dia pasado no fabrica incumplimientos', () => {
    /**
     * El defecto: pedir la agenda de un dia anterior materializaba sus
     * tomas en PENDIENTE con fecha vencida, y la tarea de cierre las
     * convertia en OMITIDA por el SISTEMA. Mirar el calendario hacia
     * atras hundia la adherencia a 0% con faltas que nunca ocurrieron.
     */
    async function pacienteConTratamiento() {
      const paciente = await pacienteDePrueba(api);
      await api.peticion('POST', '/api/medicamentos', {
        token: paciente.token,
        cuerpo: {
          nombre: 'Losartan',
          dosis: { cantidad: 1, unidad: 'TABLETA' },
          frecuencia: { tipo: 'DIARIA' },
          horarios: ['08:00', '20:00'],
          fechaInicio: '2026-08-01',
        },
      });
      return paciente;
    }

    it('la agenda de un dia pasado se lee, pero no crea tomas', async () => {
      const paciente = await pacienteConTratamiento();

      const agenda = await api.peticion('GET', '/api/tomas/agenda?fecha=2026-08-25', {
        token: paciente.token,
      });

      expect(agenda.estado).toBe(200);
      expect(agenda.cuerpo.elementos).toHaveLength(0);
    });

    it('mirar hacia atras no cambia el historial ni la adherencia', async () => {
      const paciente = await pacienteConTratamiento();

      for (const fecha of ['2026-08-25', '2026-08-26', '2026-08-27']) {
        await api.peticion('GET', `/api/tomas/agenda?fecha=${fecha}`, { token: paciente.token });
      }
      await api.contenedor.casosDeUso.cerrarTomasVencidas.ejecutar();

      const { cuerpo } = await api.peticion('GET', '/api/tomas/historial', {
        token: paciente.token,
      });

      expect(cuerpo.registros).toHaveLength(0);
      expect(cuerpo.resumen.omitidas).toBe(0);
      expect(cuerpo.resumen.nivel).toBe('SIN_DATOS');
    });

    it('la agenda de hoy si se materializa: son tomas que aun se pueden confirmar', async () => {
      const paciente = await pacienteConTratamiento();

      const hoy = await api.peticion('GET', '/api/tomas/agenda', { token: paciente.token });

      expect(hoy.cuerpo.elementos).toHaveLength(2);
    });

    it('la semana que viene tambien: es lo que la app necesita para las alarmas', async () => {
      const paciente = await pacienteConTratamiento();

      const enSieteDias = await api.peticion('GET', '/api/tomas/agenda?fecha=2026-09-07', {
        token: paciente.token,
      });

      expect(enSieteDias.cuerpo.elementos).toHaveLength(2);
    });

    it('un futuro lejano se lee, pero no escribe nada en la base de datos', async () => {
      const paciente = await pacienteConTratamiento();

      const en2030 = await api.peticion('GET', '/api/tomas/agenda?fecha=2030-01-01', {
        token: paciente.token,
      });

      expect(en2030.estado).toBe(200);
      expect(en2030.cuerpo.elementos).toHaveLength(0);
    });
  });

  describe('el filtro del historial por medicamento', () => {
    /**
     * El defecto: el id se comparaba con el texto tal como llegaba, sin
     * pasar por `Identificador`, que normaliza a minusculas. Un UUID en
     * mayusculas —igual de valido— devolvia 200 con la lista vacia.
     */
    it('encuentra las tomas escriba el id como lo escriba', async () => {
      // Con ids REALES a proposito: el generador secuencial de las demas
      // pruebas produce ids de solo digitos, y una prueba de mayusculas
      // sobre un id sin letras pasa siempre, este el defecto o no.
      await api.cerrar();
      api = await levantarApi({ idsReales: true });

      const paciente = await pacienteDePrueba(api);
      const medicamento = await api.peticion('POST', '/api/medicamentos', {
        token: paciente.token,
        cuerpo: {
          nombre: 'Losartan',
          dosis: { cantidad: 1, unidad: 'TABLETA' },
          frecuencia: { tipo: 'DIARIA' },
          horarios: ['08:00', '20:00'],
          fechaInicio: '2026-08-01',
        },
      });
      const id: string = medicamento.cuerpo.medicamento?.id ?? medicamento.cuerpo.id;

      await api.peticion('GET', '/api/tomas/agenda', { token: paciente.token });

      const enMinusculas = await api.peticion(`GET`, `/api/tomas/historial?medicamentoId=${id}`, {
        token: paciente.token,
      });
      const enMayusculas = await api.peticion(
        `GET`,
        `/api/tomas/historial?medicamentoId=${id.toUpperCase()}`,
        { token: paciente.token },
      );

      expect(enMinusculas.cuerpo.registros.length).toBeGreaterThan(0);
      expect(enMayusculas.cuerpo.registros).toHaveLength(enMinusculas.cuerpo.registros.length);
    });
  });

  describe('los errores del cliente no se presentan como fallos del servidor', () => {
    /**
     * El defecto: TODOS los 500 que devolvia la API eran en realidad
     * errores 400 del cliente. Ademas cada uno imprimia una traza
     * completa en el log del servidor, tapando los fallos de verdad.
     */
    it('un cuerpo que no es JSON valido es 400, no 500', async () => {
      const { estado } = await api.peticion('POST', '/api/auth/sesion', {
        cuerpoCrudo: '{"email": ',
      });
      expect(estado).toBe(400);
    });

    it('un cuerpo demasiado grande es 413, no 500', async () => {
      const { estado } = await api.peticion('POST', '/api/auth/sesion', {
        cuerpoCrudo: JSON.stringify({ email: 'x'.repeat(300_000) }),
      });
      expect(estado).toBe(413);
    });

    it('un parametro de la URL repetido es 400, no 500', async () => {
      const paciente = await pacienteDePrueba(api);

      // Express entrega un ARRAY cuando el parametro viene dos veces, y
      // el dominio llamaba .trim() sobre el.
      const { estado } = await api.peticion(
        'GET',
        '/api/tomas/agenda?fecha=2026-08-31&fecha=2026-09-01',
        { token: paciente.token },
      );
      expect(estado).toBe(400);
    });

    it('un parametro de la URL con corchetes es 400, no 500', async () => {
      const paciente = await pacienteDePrueba(api);

      const { estado } = await api.peticion('GET', '/api/medicamentos?pacienteId[a]=1', {
        token: paciente.token,
      });
      expect(estado).toBe(400);
    });

    it('el panel rechaza un numero de dias desmesurado', async () => {
      const cuidador = await cuidadorDePrueba(api);

      const { estado } = await api.peticion('GET', '/api/cuidadores/pacientes?dias=100000', {
        token: cuidador.token,
      });
      expect(estado).toBe(400);
    });
  });

  describe('las puertas de entrada estan cerradas', () => {
    it('sin token, los datos de un paciente devuelven 401', async () => {
      const { estado } = await api.peticion('GET', '/api/tomas/agenda');
      expect(estado).toBe(401);
    });

    it('un cuidador sin vinculo no accede a los datos de un paciente', async () => {
      const paciente = await pacienteDePrueba(api);
      const cuidador = await cuidadorDePrueba(api);

      const { estado } = await api.peticion(
        'GET',
        `/api/medicamentos?pacienteId=${paciente.id}`,
        { token: cuidador.token },
      );
      expect(estado).toBe(403);
    });

    it('un paciente no accede a los datos de otro paciente', async () => {
      const primera = await pacienteDePrueba(api, 'a');
      const segunda = await pacienteDePrueba(api, 'b');

      const { estado } = await api.peticion(
        'GET',
        `/api/medicamentos?pacienteId=${segunda.id}`,
        { token: primera.token },
      );
      expect(estado).toBe(403);
    });

    it('el panel del cuidador no es alcanzable con un token de paciente', async () => {
      const paciente = await pacienteDePrueba(api);

      const { estado } = await api.peticion('GET', '/api/cuidadores/pacientes', {
        token: paciente.token,
      });
      expect(estado).toBe(403);
    });
  });
});
