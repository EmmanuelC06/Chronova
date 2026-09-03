import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { ErrorDeApi } from '../../src/dominio/modelos';
import type { AgendaDelDia, ElementoDeAgenda } from '../../src/dominio/modelos';
import {
  Aviso,
  Boton,
  Cargando,
  EstadoVacio,
  IconoDeEstado,
  Rotulo,
  Tarjeta,
  Texto,
} from '../../src/ui/componentes/basicos';
import { useSesion } from '../../src/ui/contexto/SesionContexto';
import { colores, espacio, ESTILO_POR_ESTADO, radio } from '../../src/ui/tema';

/**
 * PANTALLA PRINCIPAL: el dia del paciente.
 *
 * Es donde la persona pasara el 90% de su tiempo en la app, asi que
 * responde a una sola pregunta: ¿que me toca ahora?
 *
 * Cada tarjeta tiene tres botones grandes y explicitos (Ya la tome / En
 * un rato / No la tome) en vez de gestos, menus o deslizamientos. Los
 * gestos ocultos son elegantes en una app para jovenes y son una barrera
 * infranqueable para alguien que aprendio a usar el telefono hace dos
 * anos.
 */
export default function Hoy() {
  const { api, alarmas, sincronizarAlarmas, perfil } = useSesion();

  const [agenda, setAgenda] = useState<AgendaDelDia | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [procesando, setProcesando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setError(null);
      const resultado = await api.obtenerAgenda();
      setAgenda(resultado);
    } catch (problema) {
      setError(
        problema instanceof ErrorDeApi ? problema.message : 'No pudimos cargar tu agenda de hoy.',
      );
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [api]);

  useEffect(() => {
    void alarmas.pedirPermiso();
  }, [alarmas]);

  // Se recarga cada vez que el usuario vuelve a esta pestana, para que
  // no vea datos viejos despues de agregar un medicamento.
  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const registrar = async (
    elemento: ElementoDeAgenda,
    accion: 'CONFIRMAR' | 'OMITIR' | 'POSPONER',
  ) => {
    setProcesando(elemento.tomaId);
    setAviso(null);
    try {
      const resultado = await api.registrarToma(
        elemento.tomaId,
        accion,
        accion === 'POSPONER' ? { minutos: 30 } : {},
      );
      if (resultado.avisoDeStock) setAviso(resultado.avisoDeStock);
      await cargar();
      // La agenda cambio: hay que rehacer las alarmas de los proximos
      // dias, no solo las de hoy.
      void sincronizarAlarmas();
    } catch (problema) {
      setError(problema instanceof ErrorDeApi ? problema.message : 'No pudimos registrar la toma.');
    } finally {
      setProcesando(null);
    }
  };

  if (cargando) return <Cargando mensaje="Preparando tu dia..." />;

  const pendientes = agenda?.elementos.filter((e) => e.puedeConfirmarse) ?? [];
  const resueltas = agenda?.elementos.filter((e) => !e.puedeConfirmarse) ?? [];

  return (
    <ScrollView
      contentContainerStyle={{
        padding: espacio.md,
        gap: espacio.md,
        paddingBottom: espacio.xxl,
      }}
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
      <View style={{ gap: 2 }}>
        <Texto variante="titulo" peso="negrita">
          Hola, {perfil?.nombre?.split(' ')[0] ?? 'que bueno verte'}
        </Texto>
        <Texto variante="etiqueta" color={colores.textoSuave}>
          {fechaEnPalabras(agenda?.fecha)}
        </Texto>
      </View>

      {error ? <Aviso mensaje={error} tono="error" /> : null}
      {aviso ? <Aviso mensaje={aviso} tono="advertencia" /> : null}

      {agenda && agenda.elementos.length > 0 ? <ResumenDelDia agenda={agenda} /> : null}

      {agenda?.elementos.length === 0 ? (
        <EstadoVacio
          titulo="Hoy no tienes tomas programadas"
          descripcion="Cuando agregues un medicamento, apareceran aqui sus horarios."
          accion={{
            titulo: 'Agregar un medicamento',
            onPress: () => router.push('/medicamento/nuevo'),
          }}
        />
      ) : null}

      {pendientes.length > 0 ? (
        <View style={{ gap: espacio.md }}>
          <Rotulo>Por tomar</Rotulo>
          {pendientes.map((elemento) => (
            <TarjetaDeToma
              key={elemento.tomaId}
              elemento={elemento}
              procesando={procesando === elemento.tomaId}
              onAccion={(accion) => void registrar(elemento, accion)}
            />
          ))}
        </View>
      ) : null}

      {resueltas.length > 0 ? (
        <View style={{ gap: espacio.md, marginTop: espacio.md }}>
          <Rotulo>Ya registradas</Rotulo>
          {resueltas.map((elemento) => (
            <TarjetaDeToma key={elemento.tomaId} elemento={elemento} onAccion={() => {}} />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

// -----------------------------------------------------------------

function ResumenDelDia({ agenda }: { agenda: AgendaDelDia }) {
  const { resumen } = agenda;
  const total = resumen.totalProgramadas;
  const hechas = resumen.tomadas;

  return (
    <Tarjeta>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: espacio.sm,
        }}
      >
        <Texto variante="cifra" peso="negrita">
          {hechas}
        </Texto>
        <Texto color={colores.textoSuave}>de {total} tomas de hoy</Texto>
      </View>

      {/* Una barra por toma, no una barra continua. Contar tres bloques
          es mas facil que estimar un porcentaje de una franja llena, y a
          esta escala la diferencia entre "una de tres" y "dos de tres"
          se ve sin fijarse. */}
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={`Has completado ${hechas} de ${total} tomas de hoy.`}
        style={{ flexDirection: 'row', gap: espacio.xs, height: 8 }}
      >
        {Array.from({ length: Math.max(total, 1) }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              borderRadius: radio.redondo,
              backgroundColor: i < hechas ? colores.exito : colores.borde,
            }}
          />
        ))}
      </View>

      {resumen.pendientes > 0 ? (
        <Texto variante="pequeno" color={colores.textoSuave}>
          Te quedan {resumen.pendientes} por confirmar.
        </Texto>
      ) : (
        <Texto variante="pequeno" color={colores.exito}>
          Ya registraste todas las tomas del dia. Muy bien.
        </Texto>
      )}
    </Tarjeta>
  );
}

function TarjetaDeToma({
  elemento,
  procesando = false,
  onAccion,
}: {
  elemento: ElementoDeAgenda;
  procesando?: boolean;
  onAccion: (accion: 'CONFIRMAR' | 'OMITIR' | 'POSPONER') => void;
}) {
  const estilo = ESTILO_POR_ESTADO[elemento.estado];

  return (
    <Tarjeta>
      {/* El estado ya no es una barra de color pegada al borde: es un
          icono tenido con la palabra debajo. Ocupa lo mismo, se ve de
          igual lejos y sigue sin depender solo del color. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: espacio.sm + espacio.xs,
        }}
      >
        <IconoDeEstado nombre={estilo.icono} color={estilo.color} fondo={estilo.fondo} />
        <View style={{ flex: 1, gap: 1 }}>
          <Texto variante="subtitulo" peso="semi">
            {elemento.horaProgramada}
          </Texto>
          <Texto variante="rotulo" peso="semi" color={estilo.color}>
            {estilo.etiqueta}
          </Texto>
        </View>
      </View>

      <Texto variante="subtitulo" peso="media">
        {elemento.nombreDelMedicamento}
      </Texto>
      <Texto color={colores.textoSuave}>{elemento.dosis}</Texto>

      {elemento.instrucciones ? (
        <Texto variante="pequeno" color={colores.textoSuave}>
          {elemento.instrucciones}
        </Texto>
      ) : null}

      {elemento.necesitaReabastecimiento ? (
        <Aviso mensaje="Te esta quedando poco de este medicamento." tono="advertencia" />
      ) : null}

      {elemento.vecesPospuesta > 0 && elemento.puedeConfirmarse ? (
        <Texto variante="pequeno" color={colores.advertencia}>
          Pospuesta {elemento.vecesPospuesta} de 3 veces.
        </Texto>
      ) : null}

      {elemento.puedeConfirmarse ? (
        <View style={{ gap: espacio.sm, marginTop: espacio.sm }}>
          <Boton
            titulo="Ya la tome"
            variante="exito"
            icono="check"
            ocupado={procesando}
            onPress={() => onAccion('CONFIRMAR')}
            descripcionAccesible={`Confirmar que tomaste ${elemento.nombreDelMedicamento} de las ${elemento.horaProgramada}`}
          />
          <View style={{ flexDirection: 'row', gap: espacio.sm }}>
            <View style={{ flex: 1 }}>
              <Boton
                titulo="En un rato"
                variante="secundario"
                deshabilitado={procesando || elemento.vecesPospuesta >= 3}
                onPress={() => onAccion('POSPONER')}
                descripcionAccesible="Posponer esta toma 30 minutos"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Boton
                titulo="No la tome"
                variante="peligro"
                deshabilitado={procesando}
                onPress={() => onAccion('OMITIR')}
                descripcionAccesible={`Registrar que no tomaste ${elemento.nombreDelMedicamento}`}
              />
            </View>
          </View>
        </View>
      ) : null}
    </Tarjeta>
  );
}

function fechaEnPalabras(iso?: string): string {
  if (!iso) return '';
  const fecha = new Date(`${iso}T12:00:00`);
  return fecha.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
