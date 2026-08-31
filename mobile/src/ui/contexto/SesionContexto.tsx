import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { Perfil, Preferencias, Sesion, TipoDeUsuario } from '../../dominio/modelos';
import type { AlmacenDeSesion, ApiDeChronova, ProgramadorDeAlarmas } from '../../dominio/puertos';
import { ClienteChronova } from '../../infraestructura/api/ClienteChronova';
import { SesionEnAsyncStorage } from '../../infraestructura/almacenamiento/SesionEnAsyncStorage';
import { AlarmasExpo } from '../../infraestructura/notificaciones/AlarmasExpo';

const PREFERENCIAS_POR_DEFECTO: Preferencias = {
  tamanoDeLetra: 'GRANDE',
  altoContraste: false,
  alertasSonoras: true,
  alertasVibracion: true,
  minutosDeGracia: 120,
};

interface ValorDeSesion {
  cargando: boolean;
  sesion: Sesion | null;
  perfil: Perfil | null;
  preferencias: Preferencias;
  api: ApiDeChronova;
  alarmas: ProgramadorDeAlarmas;
  iniciarSesion(email: string, contrasena: string, tipo?: TipoDeUsuario): Promise<void>;
  registrarPaciente(datos: {
    nombre: string;
    email: string;
    contrasena: string;
    telefono?: string | null;
    fechaDeNacimiento?: string | null;
    zonaHoraria?: string | null;
  }): Promise<void>;
  registrarCuidador(datos: {
    nombre: string;
    email: string;
    contrasena: string;
    telefono?: string | null;
    rol?: string | null;
  }): Promise<void>;
  cambiarPreferencias(cambios: Partial<Preferencias>): Promise<void>;
  cerrarSesion(): Promise<void>;
}

const Contexto = createContext<ValorDeSesion | null>(null);

/**
 * COMPOSITION ROOT de la app movil.
 *
 * Igual que el contenedor del backend, este es el unico punto donde se
 * decide que implementaciones concretas se usan. Las pantallas reciben
 * los puertos ya resueltos y no saben quien esta detras.
 *
 * Guarda tambien la sesion y las preferencias, que son el estado que
 * necesita practicamente toda la aplicacion.
 */
export function ProveedorDeSesion({ children }: { children: ReactNode }) {
  // Se crean una sola vez para toda la vida de la app.
  const api = useMemo<ApiDeChronova>(() => new ClienteChronova(), []);
  const almacen = useMemo<AlmacenDeSesion>(() => new SesionEnAsyncStorage(), []);
  const alarmas = useMemo<ProgramadorDeAlarmas>(() => new AlarmasExpo(), []);

  const [cargando, setCargando] = useState(true);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [preferencias, setPreferencias] = useState<Preferencias>(PREFERENCIAS_POR_DEFECTO);

  /** Aplica una sesion recien obtenida y carga el perfil del servidor. */
  const activar = useCallback(
    async (nueva: Sesion) => {
      api.usarToken(nueva.token);
      await almacen.guardar(nueva);
      setSesion(nueva);

      try {
        const perfilCargado = await api.obtenerPerfil();
        setPerfil(perfilCargado);
        if (perfilCargado.preferencias) setPreferencias(perfilCargado.preferencias);
      } catch {
        // El perfil es informacion adicional: si falla, la sesion sigue
        // siendo valida y la app se usa con los valores por defecto.
      }
    },
    [api, almacen],
  );

  // Al abrir la app: recuperar la sesion guardada, si la hay.
  useEffect(() => {
    let vigente = true;

    (async () => {
      const guardada = await almacen.leer();
      if (guardada && vigente) {
        api.usarToken(guardada.token);
        setSesion(guardada);
        try {
          const perfilCargado = await api.obtenerPerfil();
          if (!vigente) return;
          setPerfil(perfilCargado);
          if (perfilCargado.preferencias) setPreferencias(perfilCargado.preferencias);
        } catch {
          // Token vencido o servidor caido: se descarta la sesion para
          // que el usuario pueda entrar de nuevo sin quedar atrapado.
          await almacen.borrar();
          api.usarToken(null);
          if (vigente) setSesion(null);
        }
      }
      if (vigente) setCargando(false);
    })();

    return () => {
      vigente = false;
    };
  }, [api, almacen]);

  const iniciarSesion = useCallback(
    async (email: string, contrasena: string, tipo?: TipoDeUsuario) => {
      await activar(await api.iniciarSesion({ email, contrasena, tipo }));
    },
    [api, activar],
  );

  const registrarPaciente = useCallback<ValorDeSesion['registrarPaciente']>(
    async (datos) => {
      await activar(await api.registrarPaciente(datos));
    },
    [api, activar],
  );

  const registrarCuidador = useCallback<ValorDeSesion['registrarCuidador']>(
    async (datos) => {
      await activar(await api.registrarCuidador(datos));
    },
    [api, activar],
  );

  const cambiarPreferencias = useCallback(
    async (cambios: Partial<Preferencias>) => {
      // Se aplica de inmediato en pantalla y luego se confirma con el
      // servidor. Si el servidor falla, se revierte: nada peor que una
      // interfaz que dice que cambio algo que no cambio.
      const anteriores = preferencias;
      setPreferencias({ ...anteriores, ...cambios });
      try {
        const confirmadas = await api.actualizarPreferencias(cambios);
        setPreferencias(confirmadas);
      } catch (error) {
        setPreferencias(anteriores);
        throw error;
      }
    },
    [api, preferencias],
  );

  const cerrarSesion = useCallback(async () => {
    await alarmas.cancelarTodas();
    await almacen.borrar();
    api.usarToken(null);
    setSesion(null);
    setPerfil(null);
    setPreferencias(PREFERENCIAS_POR_DEFECTO);
  }, [api, almacen, alarmas]);

  const valor = useMemo<ValorDeSesion>(
    () => ({
      cargando,
      sesion,
      perfil,
      preferencias,
      api,
      alarmas,
      iniciarSesion,
      registrarPaciente,
      registrarCuidador,
      cambiarPreferencias,
      cerrarSesion,
    }),
    [
      cargando,
      sesion,
      perfil,
      preferencias,
      api,
      alarmas,
      iniciarSesion,
      registrarPaciente,
      registrarCuidador,
      cambiarPreferencias,
      cerrarSesion,
    ],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): ValorDeSesion {
  const valor = useContext(Contexto);
  if (!valor) {
    throw new Error('useSesion debe usarse dentro de <ProveedorDeSesion>.');
  }
  return valor;
}
