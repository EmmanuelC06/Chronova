import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
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
import {
  confirmarSuspension,
  pedirReabastecimiento,
} from '../../src/ui/componentes/accionesDeMedicamento';
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
        problema instanceof ErrorDeApi ? problema.message : 'No pudimos cargar tus medicamentos.',
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
        problema instanceof ErrorDeApi ? problema.message : 'No pudimos actualizar el inventario.',
      );
    }
  };

  // Los dialogos viven en un modulo compartido con la pantalla del
  // cuidador: son las mismas dos decisiones clinicas, las tome el
  // paciente o quien lo acompana. `null` significa "sobre mi mismo", y
  // es lo que hace que los mensajes vayan en segunda persona.
  const reabastecer = (medicamento: Medicamento) =>
    pedirReabastecimiento(
      medicamento,
      null,
      (unidades) => void aplicarReabastecimiento(medicamento, unidades),
    );

  const suspender = (medicamento: Medicamento) =>
    confirmarSuspension(medicamento, null, () => {
      void (async () => {
        try {
          await api.suspenderMedicamento(medicamento.id);
          await cargar();
        } catch {
          setError('No pudimos suspender el medicamento.');
        }
      })();
    });

  if (cargando) return <Cargando mensaje="Cargando tus medicamentos..." />;

  return (
    <ScrollView
      contentContainerStyle={{
        padding: espacio.md,
        gap: espacio.md,
        paddingBottom: espacio.xxl,
      }}
    >
      {error ? <Aviso mensaje={error} tono="error" /> : null}

      <Boton
        titulo="Agregar medicamento"
        icono="agregar"
        onPress={() => router.push('/medicamento/nuevo')}
      />

      {medicamentos.length === 0 ? (
        <EstadoVacio
          titulo="Aun no tienes medicamentos"
          descripcion="Agrega el primero y Chronova te avisara a la hora exacta de cada toma."
        />
      ) : null}

      {medicamentos.map((medicamento) => (
        <Tarjeta
          key={medicamento.id}
          // Solo se tine el borde de lo excepcional. Cuando TODAS las
          // tarjetas llevaban color, la de "por agotarse" no destacaba de
          // nada: solo cambiaba de un color fuerte a otro.
          colorDeBorde={medicamento.necesitaReabastecimiento ? colores.advertencia : undefined}
        >
          <Texto variante="subtitulo" peso="semi">
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
