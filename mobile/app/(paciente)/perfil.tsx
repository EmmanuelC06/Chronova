import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { ErrorDeApi } from '../../src/dominio/modelos';
import type {
  CuidadorDelPaciente,
  PermisosDelCuidador,
  TamanoDeLetra,
} from '../../src/dominio/modelos';
import { Aviso, Boton, Campo, Insignia, Tarjeta, Texto } from '../../src/ui/componentes/basicos';
import { useSesion } from '../../src/ui/contexto/SesionContexto';
import { ALTO_TACTIL_MINIMO, colores, espacio } from '../../src/ui/tema';
import { primerNombre } from '../../src/ui/texto';

/**
 * Los cuatro permisos, en el orden en que crece lo que conceden.
 *
 * Cada uno se explica con lo que la otra persona PODRA HACER, no con el
 * nombre tecnico del permiso. "puedeGestionarMedicamentos" no le dice
 * nada a una mujer de 74 anos; "cambiar tu tratamiento" si, y es
 * exactamente lo que esta autorizando.
 */
const PERMISOS: {
  clave: keyof PermisosDelCuidador;
  etiqueta: string;
  ayuda: string;
}[] = [
  {
    clave: 'puedeVerHistorial',
    etiqueta: 'Ver mi tratamiento',
    ayuda: 'Sus medicamentos, sus horarios y que tomas ha cumplido.',
  },
  {
    clave: 'recibeAlertas',
    etiqueta: 'Avisarle si me salto una toma',
    ayuda: 'Recibira una notificacion en su telefono.',
  },
  {
    clave: 'puedeRegistrarTomas',
    etiqueta: 'Confirmar tomas por mi',
    ayuda: 'Util si le avisas por telefono que ya te la tomaste.',
  },
  {
    clave: 'puedeGestionarMedicamentos',
    etiqueta: 'Cambiar mi tratamiento',
    ayuda: 'Podra agregar, modificar y suspender medicamentos. Es el permiso mas amplio.',
  },
];

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

  /**
   * `null` mientras no se haya conseguido la lista.
   *
   * Se trataba como informacion secundaria y se dejaba fallar en
   * silencio. No lo es: es la lista de QUIEN PUEDE VER LOS DATOS DE SALUD
   * de esta persona. Vacia por un fallo de red se lee como "no le has
   * dado acceso a nadie", y puede haber dos cuidadores viendolo todo.
   */
  const [cuidadores, setCuidadores] = useState<CuidadorDelPaciente[] | null>(null);
  const [errorDeCuidadores, setErrorDeCuidadores] = useState(false);
  const [emailDelCuidador, setEmailDelCuidador] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setCuidadores(await api.listarCuidadoresDelPaciente());
      setErrorDeCuidadores(false);
    } catch {
      // No rompe la pantalla —las preferencias de accesibilidad tienen
      // que seguir siendo alcanzables aunque no haya red—, pero tampoco
      // se calla: la seccion dice que no pudo comprobarse.
      setErrorDeCuidadores(true);
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
      await api.solicitarVinculo({
        emailDeLaOtraParte: emailDelCuidador.trim(),
      });
      setEmailDelCuidador('');
      setExito('Listo. Esa persona ya puede acompanarte en tu tratamiento.');
      await cargar();
    } catch (problema) {
      setError(
        problema instanceof ErrorDeApi ? problema.message : 'No pudimos enviar la invitacion.',
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

  /**
   * Cambia un permiso concreto de un cuidador.
   *
   * Se aplica en pantalla de inmediato y se confirma con el servidor; si
   * el servidor falla, se revierte. Un interruptor que se queda encendido
   * cuando el cambio no se guardo es peor que un error visible: la
   * persona cree haber concedido —o retirado— un acceso que en realidad
   * sigue como estaba.
   */
  const cambiarPermiso = async (
    vinculo: CuidadorDelPaciente,
    clave: keyof PermisosDelCuidador,
    valor: boolean,
  ) => {
    setError(null);

    const anteriores = cuidadores;
    setCuidadores(
      (lista) =>
        lista?.map((c) =>
          c.vinculoId === vinculo.vinculoId
            ? { ...c, permisos: { ...c.permisos, [clave]: valor } }
            : c,
        ) ?? null,
    );

    try {
      await api.cambiarPermisosDelVinculo(vinculo.vinculoId, {
        [clave]: valor,
      });
    } catch (problema) {
      setCuidadores(anteriores);
      setError(
        problema instanceof ErrorDeApi
          ? problema.message
          : 'No pudimos cambiar ese permiso. Revisa tu conexion.',
      );
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

  const pendientes = (cuidadores ?? []).filter((c) => c.estado === 'PENDIENTE');
  const activos = (cuidadores ?? []).filter((c) => c.estado === 'ACEPTADO');

  return (
    <ScrollView
      contentContainerStyle={{
        padding: espacio.md,
        gap: espacio.md,
        paddingBottom: espacio.xxl,
      }}
    >
      {error ? <Aviso mensaje={error} tono="error" /> : null}
      {exito ? <Aviso mensaje={exito} tono="exito" /> : null}

      {/* ---- Datos ---- */}
      <Tarjeta>
        <Texto variante="subtitulo" peso="semi">
          {perfil?.nombre ?? 'Mi cuenta'}
        </Texto>
        <Texto color={colores.textoSuave}>{perfil?.email}</Texto>
        {perfil?.edad ? (
          <Texto variante="pequeno" color={colores.textoSuave}>
            {perfil.edad} años
          </Texto>
        ) : null}
      </Tarjeta>

      {/* ---- Accesibilidad ---- */}
      <Tarjeta>
        <Texto variante="subtitulo" peso="semi">
          Como se ve la aplicacion
        </Texto>

        <Texto variante="etiqueta" peso="semi" color={colores.textoSuave}>
          Tamaño de la letra
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
        <Texto variante="subtitulo" peso="semi">
          Quien me acompana
        </Texto>
        <Texto variante="pequeno" color={colores.textoSuave}>
          Las personas que invites podran ver como va tu tratamiento. Tu decides quien entra y
          puedes quitarles el acceso en cualquier momento.
        </Texto>

        {errorDeCuidadores ? (
          <Aviso
            mensaje="No pudimos comprobar quien tiene acceso a tu informacion. Revisa tu conexion y vuelve a entrar a esta pantalla."
            tono="error"
          />
        ) : cuidadores !== null && cuidadores.length === 0 ? (
          <Texto variante="pequeno" color={colores.textoSuave}>
            Ahora mismo nadie tiene acceso a tu tratamiento.
          </Texto>
        ) : null}

        {pendientes.map((cuidador) => (
          <View key={cuidador.vinculoId} style={{ gap: espacio.sm, marginTop: espacio.md }}>
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
          <View key={cuidador.vinculoId} style={{ gap: espacio.xs, marginTop: espacio.lg }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Texto negrita>{cuidador.nombre}</Texto>
              <Insignia texto="Con acceso" color={colores.exito} fondo={colores.exitoSuave} />
            </View>
            <Texto variante="pequeno" color={colores.textoSuave}>
              {cuidador.rol ?? cuidador.email}
            </Texto>

            <Texto variante="etiqueta" peso="semi" color={colores.textoSuave}>
              Que puede hacer {primerNombre(cuidador.nombre)}
            </Texto>

            {PERMISOS.map((permiso) => (
              <Interruptor
                key={permiso.clave}
                etiqueta={permiso.etiqueta}
                ayuda={permiso.ayuda}
                valor={cuidador.permisos[permiso.clave]}
                onCambio={(valor) => void cambiarPermiso(cuidador, permiso.clave, valor)}
              />
            ))}

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
  ayuda,
  valor,
  onCambio,
}: {
  etiqueta: string;
  ayuda?: string;
  valor: boolean;
  onCambio: (valor: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => onCambio(!valor)}
      accessibilityRole="switch"
      accessibilityLabel={ayuda ? `${etiqueta}. ${ayuda}` : etiqueta}
      accessibilityState={{ checked: valor }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        // La fila entera es tocable, no solo el interruptor: el control
        // nativo mide unos 31 px de alto, muy por debajo de los 64 que
        // exige el tema, y acertarle con temblor es dificil.
        minHeight: ALTO_TACTIL_MINIMO,
        paddingVertical: espacio.xs,
        gap: espacio.md,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Texto>{etiqueta}</Texto>
        {ayuda ? (
          <Texto variante="pequeno" color={colores.textoSuave}>
            {ayuda}
          </Texto>
        ) : null}
      </View>
      <Switch
        value={valor}
        onValueChange={onCambio}
        // El contenedor ya expone el control al lector de pantalla.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        trackColor={{ true: colores.primario, false: colores.borde }}
        thumbColor={colores.superficie}
      />
    </Pressable>
  );
}

function formatearGracia(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const horas = minutos / 60;
  return `${horas} hora${horas > 1 ? 's' : ''}`;
}
