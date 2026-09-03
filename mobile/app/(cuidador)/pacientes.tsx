import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { ErrorDeApi } from '../../src/dominio/modelos';
import type { PacienteEnPanel } from '../../src/dominio/modelos';
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  EstadoVacio,
  Insignia,
  Tarjeta,
  Texto,
} from '../../src/ui/componentes/basicos';
import { useSesion } from '../../src/ui/contexto/SesionContexto';
import { colores, espacio, ESTILO_POR_NIVEL } from '../../src/ui/tema';

/**
 * Panel del cuidador.
 *
 * El orden lo decide el servidor: primero quien necesita atencion. Un
 * cuidador que abre la app a las siete de la manana con seis pacientes a
 * cargo no deberia tener que revisar seis tarjetas para descubrir cual
 * dejo de tomarse la medicina.
 */
export default function Pacientes() {
  const { api, perfil, cerrarSesion } = useSesion();

  const [pacientes, setPacientes] = useState<PacienteEnPanel[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [emailDelPaciente, setEmailDelPaciente] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setError(null);
      setPacientes(await api.listarPacientesDelCuidador(7));
    } catch (problema) {
      setError(
        problema instanceof ErrorDeApi ? problema.message : 'No pudimos cargar tus pacientes.',
      );
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const solicitar = async () => {
    setError(null);
    setExito(null);

    if (emailDelPaciente.trim() === '') {
      setError('Escribe el correo del paciente.');
      return;
    }

    setOcupado(true);
    try {
      await api.solicitarVinculo({ emailDeLaOtraParte: emailDelPaciente.trim() });
      setEmailDelPaciente('');
      setExito('Solicitud enviada. Podras ver su seguimiento cuando el paciente la acepte.');
      await cargar();
    } catch (problema) {
      setError(
        problema instanceof ErrorDeApi ? problema.message : 'No pudimos enviar la solicitud.',
      );
    } finally {
      setOcupado(false);
    }
  };

  if (cargando) return <Cargando mensaje="Cargando tus pacientes..." />;

  const requierenAtencion = pacientes.filter((p) => p.requiereAtencion);

  return (
    <ScrollView
      contentContainerStyle={{ padding: espacio.md, gap: espacio.md, paddingBottom: espacio.xxl }}
      refreshControl={
        <RefreshControl
          refreshing={refrescando}
          onRefresh={() => {
            setRefrescando(true);
            void cargar();
          }}
          tintColor={colores.primario}
        />
      }
    >
      <View style={{ gap: espacio.xs }}>
        <Texto variante="subtitulo" negrita>
          Hola, {perfil?.nombre?.split(' ')[0] ?? 'cuidador'}
        </Texto>
        <Texto color={colores.textoSuave}>
          {pacientes.length === 0
            ? 'Aun no acompanas a nadie.'
            : requierenAtencion.length === 0
              ? 'Todos tus pacientes van bien.'
              : `${requierenAtencion.length} paciente(s) necesitan tu atencion.`}
        </Texto>
      </View>

      {error ? <Aviso mensaje={error} tono="error" /> : null}
      {exito ? <Aviso mensaje={exito} tono="exito" /> : null}

      {pacientes.length === 0 ? (
        <EstadoVacio
          titulo="Todavia no acompanas a nadie"
          descripcion="Escribe abajo el correo del paciente. Cuando acepte tu solicitud, veras aqui como va su tratamiento."
        />
      ) : null}

      {pacientes.map((paciente) => (
        <TarjetaDePaciente key={paciente.vinculoId} paciente={paciente} />
      ))}

      <Tarjeta>
        <Texto negrita>Acompanar a otro paciente</Texto>
        <Texto variante="pequeno" color={colores.textoSuave}>
          El paciente debera aceptar tu solicitud antes de que puedas ver su informacion. Es su
          decision, no la tuya.
        </Texto>
        <Campo
          etiqueta="Correo del paciente"
          valor={emailDelPaciente}
          onCambio={setEmailDelPaciente}
          marcador="correo@ejemplo.com"
          tipoDeTeclado="email-address"
        />
        <Boton titulo="Enviar solicitud" onPress={solicitar} ocupado={ocupado} />
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

function TarjetaDePaciente({ paciente }: { paciente: PacienteEnPanel }) {
  const pendiente = paciente.estadoDelVinculo === 'PENDIENTE';
  const nivel = ESTILO_POR_NIVEL[paciente.adherencia.nivel];

  return (
    <Tarjeta
      colorDeBorde={pendiente ? colores.textoSuave : nivel.color}
      // Mientras la solicitud no se acepte no hay nada que abrir, y una
      // tarjeta que se hunde al tocarla y no lleva a ningun lado se lee
      // como que la app fallo.
      onPress={
        pendiente ? undefined : () => router.push(`/paciente/${paciente.pacienteId}`)
      }
      // Una tarjeta pulsable se lee como UN solo elemento: el lector de
      // pantalla anuncia esta frase y ya no entra en su contenido. Por
      // eso la etiqueta tiene que traer los datos, no solo la accion.
      // Antes decia unicamente "Ver el tratamiento de Rosa", y un
      // cuidador con baja vision no llegaba a enterarse del porcentaje ni
      // de que su paciente necesitaba atencion, que es justo lo que el
      // panel existe para contarle.
      descripcionAccesible={descripcionParaLector(paciente)}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Texto variante="subtitulo" negrita>
          {paciente.nombre}
        </Texto>
        {paciente.requiereAtencion ? (
          <Insignia
            texto="Revisar"
            icono="!"
            color={colores.peligro}
            fondo={colores.peligroSuave}
          />
        ) : null}
      </View>

      {pendiente ? (
        <Aviso
          mensaje="Esperando que el paciente acepte tu solicitud. Hasta entonces no puedes ver su informacion."
          tono="info"
        />
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.sm }}>
            <Texto variante="titulo" negrita color={nivel.color}>
              {paciente.adherencia.porcentaje}%
            </Texto>
            <Insignia texto={nivel.etiqueta} color={nivel.color} fondo={nivel.fondo} />
          </View>

          <Texto variante="pequeno" color={colores.textoSuave}>
            Ultimos 7 dias: {paciente.adherencia.tomadas} tomadas,{' '}
            {paciente.adherencia.omitidas} sin tomar, {paciente.adherencia.pendientes} pendientes.
          </Texto>

          <Texto variante="pequeno" color={colores.textoSuave}>
            {paciente.medicamentosActivos} medicamento(s) activo(s)
            {paciente.medicamentosConStockBajo > 0
              ? ` — ${paciente.medicamentosConStockBajo} por agotarse`
              : ''}
          </Texto>

          <Texto variante="pequeno" color={colores.textoSuave}>
            Ultima actividad: {tiempoRelativo(paciente.ultimaActividad)}
          </Texto>

          <Texto variante="pequeno" negrita color={colores.primario}>
            Toca para ver el detalle →
          </Texto>
        </>
      )}
    </Tarjeta>
  );
}

/** Todo lo que la tarjeta muestra, en una frase que se pueda escuchar. */
function descripcionParaLector(paciente: PacienteEnPanel): string {
  if (paciente.estadoDelVinculo === 'PENDIENTE') {
    return `${paciente.nombre}. Esperando que acepte tu solicitud.`;
  }

  const nivel = ESTILO_POR_NIVEL[paciente.adherencia.nivel];
  const partes = [
    paciente.nombre,
    paciente.requiereAtencion ? 'Necesita que lo revises.' : '',
    `${paciente.adherencia.porcentaje} por ciento de cumplimiento. ${nivel.etiqueta}.`,
    `${paciente.adherencia.tomadas} tomadas, ${paciente.adherencia.omitidas} sin tomar.`,
    paciente.medicamentosConStockBajo > 0
      ? `${paciente.medicamentosConStockBajo} medicamentos por agotarse.`
      : '',
    'Toca para ver el detalle.',
  ];

  return partes.filter((p) => p !== '').join(' ');
}

function tiempoRelativo(iso: string | null): string {
  if (!iso) return 'sin registros aun';

  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return 'hace un momento';
  if (minutos < 60) return `hace ${minutos} minutos`;

  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} hora${horas > 1 ? 's' : ''}`;

  const dias = Math.round(horas / 24);
  return `hace ${dias} dia${dias > 1 ? 's' : ''}`;
}
