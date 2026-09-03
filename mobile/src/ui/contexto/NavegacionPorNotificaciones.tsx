import { useEffect, useRef } from 'react';
import { router } from 'expo-router';

import type { DatosDeNotificacion } from '../../dominio/puertos';
import { useSesion } from './SesionContexto';

/**
 * Lleva a la persona al sitio correcto cuando toca una notificacion.
 *
 * Sin esto, una notificacion es un callejon sin salida: le dice al
 * cuidador que su paciente se salto cuatro tomas, el la toca, la app se
 * abre en el panel general y tiene que buscar a mano de quien se
 * trataba. El aviso deja de ser util justo en el momento en que la
 * persona decidio atenderlo.
 *
 * No pinta nada. Vive dentro del proveedor de sesion porque necesita
 * saber quien inicio sesion: el mismo aviso lleva a un sitio distinto
 * segun sea el paciente o su cuidador quien lo toca.
 */
export function NavegacionPorNotificaciones() {
  const { sesion, push, cargando } = useSesion();

  // Evita repetir el salto de arranque en frio si el componente se
  // vuelve a montar: la notificacion que abrio la app sigue siendo la
  // ultima para el sistema operativo durante un buen rato.
  const arranqueAtendido = useRef(false);

  useEffect(() => {
    if (cargando || !sesion) return;

    let vigente = true;

    const navegar = (datos: DatosDeNotificacion) => {
      if (!vigente) return;

      if (sesion.usuario.tipo === 'CUIDADOR') {
        // Los avisos del cuidador siempre hablan de un paciente concreto.
        if (datos.pacienteId) router.push(`/paciente/${datos.pacienteId}/hoy`);
        return;
      }

      // El paciente solo tiene un destino posible: su dia. Sirve tanto
      // para las alarmas locales de cada toma como para el aviso de que
      // un medicamento se esta agotando.
      router.push('/(paciente)/hoy');
    };

    if (!arranqueAtendido.current) {
      arranqueAtendido.current = true;
      void push.notificacionQueAbrioLaApp().then((datos) => {
        if (datos) navegar(datos);
      });
    }

    const cancelar = push.alTocarNotificacion(navegar);

    return () => {
      vigente = false;
      cancelar();
    };
  }, [sesion, push, cargando]);

  return null;
}
