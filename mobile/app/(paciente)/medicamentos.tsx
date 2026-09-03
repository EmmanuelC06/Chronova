import { useCallback, useState } from 'react';
import { Alert, Platform, ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { ErrorDeApi } from '../../src/dominio/modelos';
import type { Medicamento } from '../../src/dominio/modelos';
import {
  Aviso,
  Boton,
  Cargando,
  EstadoVacio,
  Insignia,
  Tarjeta,
  Texto,
} from '../../src/ui/componentes/basicos';
import { useSesion } from '../../src/ui/contexto/SesionContexto';
import { colores, espacio } from '../../src/ui/tema';

/** Lista de medicamentos del paciente, con su inventario. */
export default function Medicamentos() {
  const { api } = useSesion();

  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setError(null);
      setMedicamentos(await api.listarMedicamentos());
    } catch (problema) {
      setError(
        problema instanceof ErrorDeApi
          ? problema.message
          : 'No pudimos cargar tus medicamentos.',
      );
    } finally {
      setCargando(false);
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const aplicarReabastecimiento = async (medicamento: Medicamento, unidades: number) => {
    if (!Number.isInteger(unidades) || unidades <= 0) return;
    try {
      await api.reabastecerStock(medicamento.id, unidades);
      await cargar();
    } catch (problema) {
      setError(
        problema instanceof ErrorDeApi
          ? problema.message
          : 'No pudimos actualizar el inventario.',
      );
    }
  };

  const reabastecer = (medicamento: Medicamento) => {
    // Alert.prompt EXISTE en las dos plataformas —es un metodo estatico
    // de la clase— pero su cuerpo entero esta dentro de un if de iOS, asi
    // que en Android no hace nada y no avisa. Comprobar si la funcion
    // existe daba siempre verdadero: el boton se quedaba mudo en Android,
    // que es la plataforma en la que se prueba esta aplicacion.
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Reabastecer',
        `¿Cuantas unidades de ${medicamento.nombre} agregaste?`,
        (texto) => void aplicarReabastecimiento(medicamento, Number(texto)),
        'plain-text',
        '30',
        'number-pad',
      );
      return;
    }

    Alert.alert('Reabastecer', `Se agregaran 30 unidades a ${medicamento.nombre}. ¿Continuar?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Agregar 30',
        onPress: () => void aplicarReabastecimiento(medicamento, 30),
      },
    ]);
  };

  const suspender = (medicamento: Medicamento) => {
    Alert.alert(
      'Suspender medicamento',
      `Dejaras de recibir recordatorios de ${medicamento.nombre}. Tu historial se conserva.\n\nHazlo solo si tu medico lo indico.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Suspender',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.suspenderMedicamento(medicamento.id);
              await cargar();
            } catch {
              setError('No pudimos suspender el medicamento.');
            }
          },
        },
      ],
    );
  };

  if (cargando) return <Cargando mensaje="Cargando tus medicamentos..." />;

  return (
    <ScrollView
      contentContainerStyle={{ padding: espacio.md, gap: espacio.md, paddingBottom: espacio.xxl }}
    >
      {error ? <Aviso mensaje={error} tono="error" /> : null}

      <Boton titulo="+ Agregar medicamento" onPress={() => router.push('/medicamento/nuevo')} />

      {medicamentos.length === 0 ? (
        <EstadoVacio
          titulo="Aun no tienes medicamentos"
          descripcion="Agrega el primero y Chronova te avisara a la hora exacta de cada toma."
        />
      ) : null}

      {medicamentos.map((medicamento) => (
        <Tarjeta
          key={medicamento.id}
          colorDeBorde={medicamento.necesitaReabastecimiento ? colores.advertencia : colores.primario}
        >
          <Texto variante="subtitulo" negrita>
            {medicamento.nombre}
          </Texto>

          <Texto color={colores.textoSuave}>
            {medicamento.descripcionDeDosis ??
              `${medicamento.dosis.cantidad} ${medicamento.dosis.unidad}`}
          </Texto>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espacio.xs }}>
            {medicamento.horarios.map((hora) => (
              <Insignia
                key={hora}
                texto={hora}
                color={colores.primarioOscuro}
                fondo={colores.primarioSuave}
              />
            ))}
          </View>

          <Texto variante="pequeno" color={colores.textoSuave}>
            {medicamento.descripcionDeFrecuencia ?? 'Todos los dias'}
          </Texto>

          {medicamento.instrucciones ? (
            <Texto variante="pequeno" color={colores.textoSuave}>
              {medicamento.instrucciones}
            </Texto>
          ) : null}

          {medicamento.stock.umbralDeAlerta > 0 ? (
            <Texto
              variante="pequeno"
              negrita
              color={
                medicamento.necesitaReabastecimiento ? colores.advertencia : colores.textoSuave
              }
            >
              Quedan {medicamento.stock.unidadesDisponibles} unidades
              {medicamento.necesitaReabastecimiento ? ' — conviene comprar mas' : ''}
            </Texto>
          ) : null}

          <View style={{ gap: espacio.sm, marginTop: espacio.sm }}>
            {/* Editar va arriba y solo: cambiar la dosis o la hora que
                ajusto el medico es lo que se hace a menudo, y hasta ahora
                obligaba a suspender el medicamento y crear otro, perdiendo
                su historial de tomas. */}
            <Boton
              titulo="Editar"
              variante="secundario"
              onPress={() => router.push(`/medicamento/${medicamento.id}`)}
              descripcionAccesible={`Editar ${medicamento.nombre}`}
            />
            <View style={{ flexDirection: 'row', gap: espacio.sm }}>
              <View style={{ flex: 1 }}>
                <Boton
                  titulo="Reabastecer"
                  variante="secundario"
                  onPress={() => reabastecer(medicamento)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Boton
                  titulo="Suspender"
                  variante="peligro"
                  onPress={() => suspender(medicamento)}
                />
              </View>
            </View>
          </View>
        </Tarjeta>
      ))}
    </ScrollView>
  );
}
