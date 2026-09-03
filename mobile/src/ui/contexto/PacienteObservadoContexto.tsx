import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useFocusEffect } from 'expo-router';

import { ErrorDeApi } from '../../dominio/modelos';
import type {
  AgendaDelDia,
  ElementoDeAgenda,
  Historial,
  Medicamento,
  PacienteEnPanel,
} from '../../dominio/modelos';
import { confirmarSuspension, pedirReabastecimiento } from '../componentes/accionesDeMedicamento';
import { primerNombre } from '../texto';
import { useSesion } from './SesionContexto';

/**
 * El paciente que el cuidador esta mirando, compartido por las pestanas.
 *
 * Existe por una razon concreta. Al separar la ficha en tres pestanas
 * —Hoy, Tratamiento e Historial— cada una necesita datos que se piden
 * juntos: el vinculo dice que permisos hay, y sin el no se sabe siquiera
 * si conviene pedir lo demas. Si cada pestana cargara por su cuenta
 * serian tres veces las mismas peticiones, tres estados de carga
 * distintos y tres sitios donde repetir la comprobacion de permisos.
 *
 * Asi se carga UNA vez aqui y las pestanas solo pintan. Es el mismo
 * patron del proveedor de sesion, un nivel mas abajo.
 */

export const DIAS_DE_RESUMEN = 7;

/**
 * Por que no se puede mostrar la ficha, si es que no se puede.
 *
 * `FALLO_DE_CARGA` es distinto de los otros tres: no dice nada sobre el
 * vinculo, solo que no se pudo preguntar. Existe porque faltaba, y su
 * ausencia dejaba la ficha COMPLETAMENTE EN BLANCO: al fallar la red, el
 * contexto guardaba el mensaje de error pero no bloqueaba nada, el layout
 * montaba las tres pestanas igual, y la primera hacia `if (!paciente)
 * return null`. El cuidador tocaba la tarjeta de su madre y veia una
 * pantalla vacia con una barra de pestanas: sin aviso, sin rueda de
 * carga y sin forma de reintentar.
 */
export type MotivoDeBloqueo =
  'NO_ENCONTRADO' | 'SIN_ACEPTAR' | 'SIN_PERMISO' | 'FALLO_DE_CARGA' | null;

interface Valor {
  paciente: PacienteEnPanel | null;
  agenda: AgendaDelDia | null;
  medicamentos: Medicamento[];
  historial: Historial | null;

  /** Nombre completo, o "Paciente" mientras no se sabe. */
  nombre: string;
  /** Solo el nombre de pila: es como se habla de alguien en la interfaz. */
  nombreCorto: string;

  cargando: boolean;
  refrescando: boolean;
  error: string | null;
  bloqueo: MotivoDeBloqueo;

  /** Id del elemento sobre el que hay una accion en curso, o null. */
  procesando: string | null;

  recargar: () => Promise<void>;
  alTirarParaRefrescar: () => void;

  registrarToma: (elemento: ElementoDeAgenda, accion: 'CONFIRMAR' | 'OMITIR') => void;
  reabastecer: (medicamento: Medicamento) => void;
  suspender: (medicamento: Medicamento) => void;
}

const Contexto = createContext<Valor | null>(null);

export function usePacienteObservado(): Valor {
  const valor = useContext(Contexto);
  if (!valor) {
    throw new Error('usePacienteObservado solo funciona dentro de ProveedorDePacienteObservado.');
  }
  return valor;
}

export function ProveedorDePacienteObservado({
  pacienteId,
  children,
}: {
  pacienteId: string;
  children: ReactNode;
}) {
  const { api } = useSesion();

  const [paciente, setPaciente] = useState<PacienteEnPanel | null>(null);
  const [agenda, setAgenda] = useState<AgendaDelDia | null>(null);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [historial, setHistorial] = useState<Historial | null>(null);

  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bloqueo, setBloqueo] = useState<MotivoDeBloqueo>(null);
  const [procesando, setProcesando] = useState<string | null>(null);

  /**
   * ¿Llegamos alguna vez a tener la ficha?
   *
   * Va en una referencia y no en el estado porque se consulta dentro del
   * `catch` de la propia carga, donde leer `paciente` daria el valor de
   * este render y no el actual. Lo unico que decide es si un fallo deja
   * la pantalla bloqueada o solo pone un aviso encima de lo que ya se
   * estaba leyendo.
   */
  const fichaCargada = useRef(false);

  const recargar = useCallback(async () => {
    try {
      setError(null);

      // Primero el vinculo. Determina el nombre a mostrar y, sobre todo,
      // que permisos concedio el paciente: si no autorizo ver su
      // historial, no tiene sentido pedir datos que el servidor va a
      // rechazar, y el usuario merece una explicacion en vez de un error.
      const lista = await api.listarPacientesDelCuidador(DIAS_DE_RESUMEN);
      const fila = lista.find((p) => p.pacienteId === pacienteId) ?? null;
      setPaciente(fila);
      if (fila) fichaCargada.current = true;

      if (!fila) {
        setBloqueo('NO_ENCONTRADO');
        return;
      }
      if (fila.estadoDelVinculo !== 'ACEPTADO') {
        setBloqueo('SIN_ACEPTAR');
        return;
      }
      // Lo decide el servidor, no la app. `datosClinicosVisibles` es la
      // misma comprobacion que hace el backend antes de calcular la
      // adherencia, asi que las dos partes no pueden discrepar: si viene
      // en falso, los campos clinicos de esta fila vienen vacios y pedir
      // la agenda o el historial devolveria 403.
      if (!fila.datosClinicosVisibles) {
        setBloqueo('SIN_PERMISO');
        return;
      }
      setBloqueo(null);

      // En paralelo, y tolerando fallos por separado: que el historial
      // falle no debe dejar en blanco la agenda de hoy.
      const [resAgenda, resMedicamentos, resHistorial] = await Promise.allSettled([
        api.obtenerAgenda({ pacienteId: fila.pacienteId }),
        api.listarMedicamentos(fila.pacienteId),
        api.consultarHistorial({ pacienteId: fila.pacienteId }),
      ]);

      if (resAgenda.status === 'fulfilled') setAgenda(resAgenda.value);
      if (resMedicamentos.status === 'fulfilled') setMedicamentos(resMedicamentos.value);
      if (resHistorial.status === 'fulfilled') setHistorial(resHistorial.value);

      if (resAgenda.status === 'rejected') {
        setError(
          resAgenda.reason instanceof ErrorDeApi
            ? resAgenda.reason.message
            : 'No pudimos cargar la agenda de hoy.',
        );
      }
    } catch (problema) {
      setError(
        problema instanceof ErrorDeApi
          ? problema.message
          : 'No pudimos cargar la informacion de este paciente.',
      );

      // Si nunca llegamos a tener la ficha, no hay nada que pintar y hay
      // que decirlo: sin esto las pestanas se montaban sobre un paciente
      // nulo y la pantalla quedaba en blanco.
      //
      // Si ya la teniamos, en cambio, NO se bloquea. Es un refresco que
      // fallo: el cuidador se queda con los datos de hace un momento y el
      // aviso de arriba, que es mucho mejor que perder lo que ya estaba
      // leyendo porque el ascensor se llevo la senal.
      if (!fichaCargada.current) setBloqueo('FALLO_DE_CARGA');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [api, pacienteId]);

  // Al volver de la pantalla de edicion —que es una modal encima de
  // esta— se refresca sola. Sin esto, el cuidador cambiaba una dosis y
  // volvia a la ficha vieja.
  useFocusEffect(
    useCallback(() => {
      void recargar();
    }, [recargar]),
  );

  const alTirarParaRefrescar = useCallback(() => {
    setRefrescando(true);
    void recargar();
  }, [recargar]);

  const nombre = paciente?.nombre ?? 'Paciente';
  const nombreCorto = primerNombre(nombre);

  /**
   * El cuidador registra una toma en nombre del paciente.
   *
   * Es el caso de "mi mama me dijo por telefono que ya se la tomo".
   * Queda guardado con origen CUIDADOR, de modo que el historial
   * distingue lo que confirmo el paciente de lo que confirmo alguien por
   * el. Esa distincion importa: una adherencia sostenida por el cuidador
   * no es lo mismo que una adherencia autonoma, y el dato seria
   * enganoso si se mezclaran.
   */
  const registrarToma = useCallback(
    (elemento: ElementoDeAgenda, accion: 'CONFIRMAR' | 'OMITIR') => {
      void (async () => {
        setProcesando(elemento.tomaId);
        try {
          await api.registrarToma(elemento.tomaId, accion);
          await recargar();
        } catch (problema) {
          setError(
            problema instanceof ErrorDeApi ? problema.message : 'No pudimos registrar la toma.',
          );
        } finally {
          setProcesando(null);
        }
      })();
    },
    [api, recargar],
  );

  /**
   * Reabastecer y suspender, sobre el tratamiento de OTRA persona.
   *
   * Los dialogos son los mismos que ve el paciente en su propia pantalla
   * —viven en un modulo compartido— pero el texto se dirige a la persona
   * correcta: "Rosa dejara de recibir recordatorios", no "dejaras".
   */
  const reabastecer = useCallback(
    (medicamento: Medicamento) =>
      pedirReabastecimiento(medicamento, nombre, (unidades) => {
        if (!Number.isInteger(unidades) || unidades <= 0) return;
        void (async () => {
          setProcesando(medicamento.id);
          try {
            await api.reabastecerStock(medicamento.id, unidades);
            await recargar();
          } catch (problema) {
            setError(
              problema instanceof ErrorDeApi
                ? problema.message
                : 'No pudimos actualizar el inventario.',
            );
          } finally {
            setProcesando(null);
          }
        })();
      }),
    [api, nombre, recargar],
  );

  const suspender = useCallback(
    (medicamento: Medicamento) =>
      confirmarSuspension(medicamento, nombre, () => {
        void (async () => {
          setProcesando(medicamento.id);
          try {
            await api.suspenderMedicamento(medicamento.id);
            await recargar();
          } catch (problema) {
            setError(
              problema instanceof ErrorDeApi
                ? problema.message
                : 'No pudimos suspender el medicamento.',
            );
          } finally {
            setProcesando(null);
          }
        })();
      }),
    [api, nombre, recargar],
  );

  return (
    <Contexto.Provider
      value={{
        paciente,
        agenda,
        medicamentos,
        historial,
        nombre,
        nombreCorto,
        cargando,
        refrescando,
        error,
        bloqueo,
        procesando,
        recargar,
        alTirarParaRefrescar,
        registrarToma,
        reabastecer,
        suspender,
      }}
    >
      {children}
    </Contexto.Provider>
  );
}
