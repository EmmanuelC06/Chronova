import { useCallback, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import type { AlarmasEnElTelefono } from '../../dominio/puertos';
import { useSesion } from '../contexto/SesionContexto';
import { colores, espacio } from '../tema';
import { formatearHora } from '../hora';
import { Aviso, Boton, Tarjeta, Texto } from './basicos';

/**
 * Cuantas alarmas tiene puestas el telefono, y cuando suena la proxima.
 *
 * Por que esto merece estar en la pantalla y no solo en un registro de
 * desarrollo: cuando una alarma de medicacion no suena, la persona no
 * tiene forma de saber si el fallo esta en la aplicacion o en su
 * telefono. Y son cosas muy distintas. Si la alarma no existe, hay algo
 * que arreglar aqui dentro. Si existe y no sono, el telefono la esta
 * reteniendo, y eso se arregla en los ajustes del sistema.
 *
 * Sin esta distincion, lo unico que queda es esperar a la siguiente toma
 * a ver si suena. Con un medicamento de verdad, esa espera es la dosis.
 */
export function EstadoDeLasAlarmas() {
  const { alarmas } = useSesion();
  const [estado, setEstado] = useState<AlarmasEnElTelefono | null>(null);

  const consultar = useCallback(async () => {
    setEstado(await alarmas.alarmasProgramadas());
  }, [alarmas]);

  useFocusEffect(
    useCallback(() => {
      void consultar();
    }, [consultar]),
  );

  if (!estado) return null;

  return (
    <Tarjeta>
      <Texto variante="subtitulo" peso="semi">
        Mis alarmas
      </Texto>

      {estado.total === 0 ? (
        <Aviso
          mensaje="Tu telefono no tiene ninguna alarma puesta. Si tienes medicamentos activos, baja para recargar tu dia; si sigue en cero, revisa que Chronova tenga permiso para enviarte notificaciones."
          tono="advertencia"
        />
      ) : (
        <>
          <Texto color={colores.textoSuave}>
            Tu telefono tiene {estado.total} {estado.total === 1 ? 'alarma puesta' : 'alarmas puestas'}
            {estado.proxima ? '.' : ''}
          </Texto>
          {estado.proxima ? (
            <Texto variante="subtitulo" peso="semi" color={colores.primario}>
              La proxima: {descripcionDe(estado)}
            </Texto>
          ) : null}
        </>
      )}

      <Texto variante="pequeno" color={colores.textoSuave}>
        Las alarmas las guarda tu telefono, asi que suenan aunque no tengas internet.
      </Texto>

      {/*
        Android puede retrasar una alarma que SI esta puesta. Desde la
        version 14 el permiso de "alarmas y recordatorios" viene denegado
        de fabrica, y sin el el sistema tiene libertad para dar el aviso
        tarde —quince minutos o mas—. El ahorro de bateria hace lo mismo.
        Ninguna de las dos cosas se puede cambiar desde aqui: solo se
        puede llevar a la persona al sitio donde se cambian.
      */}
      {Platform.OS === 'android' ? (
        <View style={{ gap: espacio.xs, marginTop: espacio.sm }}>
          <Texto variante="pequeno" color={colores.textoSuave}>
            Si una alarma llega tarde, no es la aplicacion: es tu telefono retrasandola para
            ahorrar bateria. En los ajustes de Chronova, activa «Alarmas y recordatorios» y pon la
            bateria «Sin restricciones».
          </Texto>
          <Boton
            titulo="Abrir los ajustes de Chronova"
            variante="secundario"
            onPress={() => void Linking.openSettings()}
          />
        </View>
      ) : null}
    </Tarjeta>
  );
}

function descripcionDe(estado: AlarmasEnElTelefono): string {
  if (!estado.proxima) return '';

  const fecha = new Date(estado.proxima);
  const hora = formatearHora(
    `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`,
  );

  const hoy = new Date();
  const esHoy = fecha.toDateString() === hoy.toDateString();
  const cuando = esHoy
    ? `hoy a las ${hora}`
    : `${fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })} a las ${hora}`;

  return estado.medicamento ? `${estado.medicamento}, ${cuando}` : cuando;
}
