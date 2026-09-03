import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
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

/** Por que no se puede mostrar la ficha, si es que no se puede. */
export type MotivoDeBloqueo = 'NO_ENCONTRADO' | 'SIN_ACEPTAR' | 'SIN_PERMISO' | null;

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

      if (!fila) {
        setBloqueo('NO_ENCONTRADO');
        return;
      }
      if (fila.estadoDelVinculo !== 'ACEPTADO') {
        setBloqueo('SIN_ACEPTAR');
        return;
      }
      if (!fila.permisos.puedeVerHistorial) {
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
  const nombreCorto = nombre.split(' ')[0]!;

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
