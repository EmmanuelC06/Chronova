import { useCallback, useState } from 'react';
import { Alert, ScrollView, Switch, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { ErrorDeApi } from '../../src/dominio/modelos';
import type { CuidadorDelPaciente, TamanoDeLetra } from '../../src/dominio/modelos';
import {
  Aviso,
  Boton,
  Campo,
  Insignia,
  Tarjeta,
  Texto,
} from '../../src/ui/componentes/basicos';
import { useSesion } from '../../src/ui/contexto/SesionContexto';
import { colores, espacio } from '../../src/ui/tema';

const ETIQUETAS_DE_TAMANO: Record<TamanoDeLetra, string> = {
  NORMAL: 'Normal',
  GRANDE: 'Grande',
  MUY_GRANDE: 'Muy grande',
};

/**
 * Mi cuenta: preferencias de accesibilidad y gestion de cuidadores.
 *
 * Las preferencias estan arriba del todo, no escondidas en un submenu.
 * Si alguien no alcanza a leer la aplicacion, lo primero que necesita es
 * poder agrandarla; obligarlo a navegar tres niveles para lograrlo es
 * pedirle que resuelva el problema usando justo lo que no puede usar.
 */
export default function Perfil() {
  const { perfil, preferencias, cambiarPreferencias, cerrarSesion, api } = useSesion();

  const [cuidadores, setCuidadores] = useState<CuidadorDelPaciente[]>([]);
  const [emailDelCuidador, setEmailDelCuidador] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setCuidadores(await api.listarCuidadoresDelPaciente());
    } catch {
      // Es informacion secundaria: no vale la pena romper la pantalla.
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const invitar = async () => {
    setError(null);
    setExito(null);

    if (emailDelCuidador.trim() === '') {
      setError('Escribe el correo de la persona que quieres invitar.');
      return;
    }

    setOcupado(true);
    try {
      await api.solicitarVinculo({ emailDeLaOtraParte: emailDelCuidador.trim() });
      setEmailDelCuidador('');
      setExito('Listo. Esa persona ya puede acompanarte en tu tratamiento.');
      await cargar();
    } catch (problema) {
      setError(
        problema instanceof ErrorDeApi
          ? problema.message
          : 'No pudimos enviar la invitacion.',
      );
    } finally {
      setOcupado(false);
    }
  };

  const responder = async (
    vinculo: CuidadorDelPaciente,
    respuesta: 'ACEPTAR' | 'RECHAZAR' | 'REVOCAR',
  ) => {
    try {
      await api.responderVinculo(vinculo.vinculoId, respuesta);
      await cargar();
    } catch {
      setError('No pudimos actualizar el acceso de esa persona.');
    }
  };

  const confirmarRevocar = (vinculo: CuidadorDelPaciente) => {
    Alert.alert(
      'Quitar acceso',
      `${vinculo.nombre} dejara de ver tu tratamiento. Puedes volver a invitarlo cuando quieras.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar acceso',
          style: 'destructive',
          onPress: () => void responder(vinculo, 'REVOCAR'),
        },
      ],
    );
  };

  const cambiar = async (cambios: Parameters<typeof cambiarPreferencias>[0]) => {
    try {
      await cambiarPreferencias(cambios);
    } catch {
      setError('No pudimos guardar ese cambio. Revisa tu conexion.');
    }
  };

  const pendientes = cuidadores.filter((c) => c.estado === 'PENDIENTE');
  const activos = cuidadores.filter((c) => c.estado === 'ACEPTADO');

  return (
    <ScrollView
      contentContainerStyle={{ padding: espacio.md, gap: espacio.md, paddingBottom: espacio.xxl }}
    >
      {error ? <Aviso mensaje={error} tono="error" /> : null}
      {exito ? <Aviso mensaje={exito} tono="exito" /> : null}

      {/* ---- Datos ---- */}
      <Tarjeta>
        <Texto variante="subtitulo" negrita>
          {perfil?.nombre ?? 'Mi cuenta'}
        </Texto>
        <Texto color={colores.textoSuave}>{perfil?.email}</Texto>
        {perfil?.edad ? (
          <Texto variante="pequeno" color={colores.textoSuave}>
            {perfil.edad} anos
          </Texto>
        ) : null}
      </Tarjeta>

      {/* ---- Accesibilidad ---- */}
      <Tarjeta>
        <Texto variante="subtitulo" negrita>
          Como se ve la aplicacion
        </Texto>

        <Texto variante="etiqueta" negrita color={colores.textoSuave}>
          Tamano de la letra
        </Texto>
        <View style={{ gap: espacio.sm }}>
          {(Object.keys(ETIQUETAS_DE_TAMANO) as TamanoDeLetra[]).map((opcion) => (
            <Boton
              key={opcion}
              titulo={ETIQUETAS_DE_TAMANO[opcion]}
              variante={preferencias.tamanoDeLetra === opcion ? 'primario' : 'secundario'}
              onPress={() => void cambiar({ tamanoDeLetra: opcion })}
            />
          ))}
        </View>

        <Interruptor
          etiqueta="Sonido en las alarmas"
          valor={preferencias.alertasSonoras}
          onCambio={(valor) => void cambiar({ alertasSonoras: valor })}
        />
        <Interruptor
          etiqueta="Vibracion en las alarmas"
          valor={preferencias.alertasVibracion}
          onCambio={(valor) => void cambiar({ alertasVibracion: valor })}
        />

        <Texto variante="pequeno" color={colores.textoSuave}>
          Esperamos {formatearGracia(preferencias.minutosDeGracia)} despues de la hora antes de dar
          una toma por perdida.
        </Texto>
        <View style={{ flexDirection: 'row', gap: espacio.sm }}>
          {[60, 120, 240].map((minutos) => (
            <View key={minutos} style={{ flex: 1 }}>
              <Boton
                titulo={formatearGracia(minutos)}
                variante={preferencias.minutosDeGracia === minutos ? 'primario' : 'secundario'}
                onPress={() => void cambiar({ minutosDeGracia: minutos })}
              />
            </View>
          ))}
        </View>
      </Tarjeta>

      {/* ---- Cuidadores ---- */}
      <Tarjeta>
        <Texto variante="subtitulo" negrita>
          Quien me acompana
        </Texto>
        <Texto variante="pequeno" color={colores.textoSuave}>
          Las personas que invites podran ver como va tu tratamiento. Tu decides quien entra y
          puedes quitarles el acceso en cualquier momento.
        </Texto>

        {pendientes.map((cuidador) => (
          <View
            key={cuidador.vinculoId}
            style={{ gap: espacio.sm, marginTop: espacio.md }}
          >
            <Texto negrita>{cuidador.nombre} quiere acompanarte</Texto>
            <Texto variante="pequeno" color={colores.textoSuave}>
              {cuidador.email}
              {cuidador.rol ? ` — ${cuidador.rol}` : ''}
            </Texto>
            <View style={{ flexDirection: 'row', gap: espacio.sm }}>
              <View style={{ flex: 1 }}>
                <Boton
                  titulo="Aceptar"
                  variante="exito"
                  onPress={() => void responder(cuidador, 'ACEPTAR')}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Boton
                  titulo="Rechazar"
                  variante="peligro"
                  onPress={() => void responder(cuidador, 'RECHAZAR')}
                />
              </View>
            </View>
          </View>
        ))}

        {activos.map((cuidador) => (
          <View key={cuidador.vinculoId} style={{ gap: espacio.xs, marginTop: espacio.md }}>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Texto negrita>{cuidador.nombre}</Texto>
              <Insignia texto="Con acceso" color={colores.exito} fondo={colores.exitoSuave} />
            </View>
            <Texto variante="pequeno" color={colores.textoSuave}>
              {cuidador.rol ?? cuidador.email}
            </Texto>
            <Boton
              titulo="Quitar acceso"
              variante="peligro"
              onPress={() => confirmarRevocar(cuidador)}
            />
          </View>
        ))}

        <View style={{ gap: espacio.sm, marginTop: espacio.md }}>
          <Campo
            etiqueta="Invitar a alguien"
            valor={emailDelCuidador}
            onCambio={setEmailDelCuidador}
            marcador="correo de tu hija, hijo o enfermera"
            tipoDeTeclado="email-address"
            ayuda="Esa persona debe tener una cuenta de cuidador en Chronova."
          />
          <Boton titulo="Enviar invitacion" onPress={invitar} ocupado={ocupado} />
        </View>
      </Tarjeta>

      <Boton
        titulo="Cerrar sesion"
        variante="peligro"
        onPress={() => {
          void cerrarSesion().then(() => router.replace('/(auth)/ingresar'));
        }}
      />
    </ScrollView>
  );
}

function Interruptor({
  etiqueta,
  valor,
  onCambio,
}: {
  etiqueta: string;
  valor: boolean;
  onCambio: (valor: boolean) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 56,
        gap: espacio.md,
      }}
    >
      <View style={{ flex: 1 }}>
        <Texto>{etiqueta}</Texto>
      </View>
      <Switch
        value={valor}
        onValueChange={onCambio}
        accessibilityLabel={etiqueta}
        trackColor={{ true: colores.primario, false: colores.borde }}
        thumbColor={colores.superficie}
      />
    </View>
  );
}

function formatearGracia(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const horas = minutos / 60;
  return `${horas} hora${horas > 1 ? 's' : ''}`;
}
