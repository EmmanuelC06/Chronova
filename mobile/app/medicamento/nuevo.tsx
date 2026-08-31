import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';

import { ErrorDeApi } from '../../src/dominio/modelos';
import { Aviso, Boton, Campo, Texto } from '../../src/ui/componentes/basicos';
import { useSesion } from '../../src/ui/contexto/SesionContexto';
import { colores, espacio, radio } from '../../src/ui/tema';

const UNIDADES = ['tableta', 'capsula', 'ml', 'mg', 'gota', 'sobre', 'inyeccion', 'unidad'];
const DIAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const NOMBRES_DE_DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

/**
 * Formulario de alta de un medicamento.
 *
 * Es la pantalla mas compleja de la app, asi que se apoya en tres ideas:
 *  - Los horarios se agregan de a uno, con botones de atajo para las
 *    horas mas comunes; nada de escribir "08:00,20:00" separado por comas.
 *  - Los dias de la semana son botones que se prenden y se apagan.
 *  - El inventario es opcional y se explica para que sirve, porque un
 *    campo que no se entiende se llena mal o se deja vacio con miedo.
 */
export default function NuevoMedicamento() {
  const { api } = useSesion();

  const [nombre, setNombre] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [unidad, setUnidad] = useState('tableta');
  const [horarios, setHorarios] = useState<string[]>([]);
  const [horaNueva, setHoraNueva] = useState('');
  const [todosLosDias, setTodosLosDias] = useState(true);
  const [diasElegidos, setDiasElegidos] = useState<number[]>([]);
  const [instrucciones, setInstrucciones] = useState('');
  const [unidadesDisponibles, setUnidadesDisponibles] = useState('');
  const [umbral, setUmbral] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const agregarHora = (hora: string) => {
    const limpia = hora.trim();
    if (!/^\d{1,2}:\d{2}$/.test(limpia)) {
      setError('La hora debe escribirse como 08:30.');
      return;
    }
    const [h, m] = limpia.split(':').map(Number);
    if (h === undefined || m === undefined || h > 23 || m > 59) {
      setError('Esa hora no existe. Las horas van de 00 a 23 y los minutos de 00 a 59.');
      return;
    }
    const normalizada = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    if (horarios.includes(normalizada)) {
      setError('Esa hora ya esta en la lista.');
      return;
    }
    setError(null);
    setHorarios([...horarios, normalizada].sort());
    setHoraNueva('');
  };

  const alternarDia = (dia: number) => {
    setDiasElegidos((actuales) =>
      actuales.includes(dia) ? actuales.filter((d) => d !== dia) : [...actuales, dia],
    );
  };

  const guardar = async () => {
    setError(null);

    if (nombre.trim().length < 2) {
      setError('Escribe el nombre del medicamento.');
      return;
    }
    if (horarios.length === 0) {
      setError('Agrega al menos una hora de toma.');
      return;
    }
    if (!todosLosDias && diasElegidos.length === 0) {
      setError('Elige al menos un dia de la semana.');
      return;
    }

    const numeroDeCantidad = Number(cantidad.replace(',', '.'));
    if (!Number.isFinite(numeroDeCantidad) || numeroDeCantidad <= 0) {
      setError('La cantidad debe ser un numero mayor que cero.');
      return;
    }

    setOcupado(true);
    try {
      const disponibles = Number(unidadesDisponibles);
      const alerta = Number(umbral);
      const llevaInventario = Number.isInteger(disponibles) && disponibles > 0;

      await api.registrarMedicamento({
        nombre: nombre.trim(),
        dosis: { cantidad: numeroDeCantidad, unidad },
        frecuencia: todosLosDias
          ? { tipo: 'DIARIA' }
          : { tipo: 'DIAS_DE_LA_SEMANA', diasDeLaSemana: diasElegidos },
        horarios,
        instrucciones: instrucciones.trim() || null,
        ...(llevaInventario
          ? {
              stock: {
                unidadesDisponibles: disponibles,
                umbralDeAlerta: Number.isInteger(alerta) && alerta >= 0 ? alerta : 5,
              },
            }
          : {}),
      });

      router.back();
    } catch (problema) {
      setError(
        problema instanceof ErrorDeApi
          ? problema.message
          : 'No pudimos guardar el medicamento.',
      );
    } finally {
      setOcupado(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: espacio.md, gap: espacio.lg, paddingBottom: espacio.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        {error ? <Aviso mensaje={error} tono="error" /> : null}

        <Campo
          etiqueta="Nombre del medicamento"
          valor={nombre}
          onCambio={setNombre}
          marcador="Losartan"
          ayuda="Escribelo como aparece en la caja."
        />

        {/* -------- Dosis -------- */}
        <View style={{ gap: espacio.sm }}>
          <Texto negrita>¿Cuanto toma cada vez?</Texto>

          <View style={{ flexDirection: 'row', gap: espacio.sm, alignItems: 'flex-end' }}>
            <View style={{ width: 110 }}>
              <Campo
                etiqueta="Cantidad"
                valor={cantidad}
                onCambio={setCantidad}
                tipoDeTeclado="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Texto variante="etiqueta" negrita color={colores.textoSuave}>
                Unidad
              </Texto>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: espacio.xs, paddingVertical: espacio.xs }}>
                  {UNIDADES.map((opcion) => (
                    <Ficha
                      key={opcion}
                      texto={opcion}
                      activa={unidad === opcion}
                      onPress={() => setUnidad(opcion)}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </View>

        {/* -------- Horarios -------- */}
        <View style={{ gap: espacio.sm }}>
          <Texto negrita>¿A que horas?</Texto>

          {horarios.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm }}>
              {horarios.map((hora) => (
                <Pressable
                  key={hora}
                  onPress={() => setHorarios(horarios.filter((h) => h !== hora))}
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar la hora ${hora}`}
                  style={{
                    minHeight: 48,
                    paddingHorizontal: espacio.md,
                    justifyContent: 'center',
                    borderRadius: radio.redondo,
                    backgroundColor: colores.primarioSuave,
                  }}
                >
                  <Texto negrita color={colores.primarioOscuro}>
                    {hora}  ✕
                  </Texto>
                </Pressable>
              ))}
            </View>
          ) : (
            <Texto variante="pequeno" color={colores.textoSuave}>
              Toca una hora sugerida o escribe la tuya.
            </Texto>
          )}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espacio.xs }}>
            {['07:00', '08:00', '12:00', '13:00', '18:00', '20:00', '22:00'].map((hora) => (
              <Ficha
                key={hora}
                texto={hora}
                activa={false}
                onPress={() => agregarHora(hora)}
              />
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: espacio.sm, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Campo
                etiqueta="Otra hora"
                valor={horaNueva}
                onCambio={setHoraNueva}
                marcador="09:30"
                tipoDeTeclado="numbers-and-punctuation"
              />
            </View>
            <View style={{ paddingBottom: 2 }}>
              <Boton
                titulo="Agregar"
                variante="secundario"
                ancho="ajustado"
                onPress={() => agregarHora(horaNueva)}
              />
            </View>
          </View>
        </View>

        {/* -------- Frecuencia -------- */}
        <View style={{ gap: espacio.sm }}>
          <Texto negrita>¿Que dias?</Texto>

          <View style={{ flexDirection: 'row', gap: espacio.sm }}>
            <View style={{ flex: 1 }}>
              <Boton
                titulo="Todos los dias"
                variante={todosLosDias ? 'primario' : 'secundario'}
                onPress={() => setTodosLosDias(true)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Boton
                titulo="Solo algunos"
                variante={todosLosDias ? 'secundario' : 'primario'}
                onPress={() => setTodosLosDias(false)}
              />
            </View>
          </View>

          {!todosLosDias ? (
            <View style={{ flexDirection: 'row', gap: espacio.xs, justifyContent: 'space-between' }}>
              {DIAS.map((letra, indice) => (
                <Pressable
                  key={indice}
                  onPress={() => alternarDia(indice)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: diasElegidos.includes(indice) }}
                  accessibilityLabel={NOMBRES_DE_DIAS[indice]}
                  style={{
                    width: 44,
                    height: 56,
                    borderRadius: radio.md,
                    borderWidth: 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderColor: diasElegidos.includes(indice) ? colores.primario : colores.borde,
                    backgroundColor: diasElegidos.includes(indice)
                      ? colores.primario
                      : colores.superficie,
                  }}
                >
                  <Texto
                    negrita
                    color={diasElegidos.includes(indice) ? colores.textoInverso : colores.texto}
                  >
                    {letra}
                  </Texto>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        {/* -------- Extras -------- */}
        <Campo
          etiqueta="Indicaciones (opcional)"
          valor={instrucciones}
          onCambio={setInstrucciones}
          marcador="Tomar despues de comer"
        />

        <View style={{ gap: espacio.sm }}>
          <Texto negrita>Inventario (opcional)</Texto>
          <Texto variante="pequeno" color={colores.textoSuave}>
            Si nos dices cuantas unidades tienes, Chronova las va descontando y te avisa antes de
            que se acaben.
          </Texto>

          <View style={{ flexDirection: 'row', gap: espacio.sm }}>
            <View style={{ flex: 1 }}>
              <Campo
                etiqueta="Unidades que tienes"
                valor={unidadesDisponibles}
                onCambio={setUnidadesDisponibles}
                marcador="30"
                tipoDeTeclado="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Campo
                etiqueta="Avisarme al llegar a"
                valor={umbral}
                onCambio={setUmbral}
                marcador="5"
                tipoDeTeclado="numeric"
              />
            </View>
          </View>
        </View>

        <Boton titulo="Guardar medicamento" onPress={guardar} ocupado={ocupado} />
        <Boton titulo="Cancelar" variante="texto" onPress={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Ficha({
  texto,
  activa,
  onPress,
}: {
  texto: string;
  activa: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={texto}
      accessibilityState={{ selected: activa }}
      style={{
        minHeight: 48,
        justifyContent: 'center',
        paddingHorizontal: espacio.md,
        borderRadius: radio.redondo,
        borderWidth: 2,
        borderColor: activa ? colores.primario : colores.borde,
        backgroundColor: activa ? colores.primario : colores.superficie,
      }}
    >
      <Texto negrita color={activa ? colores.textoInverso : colores.texto}>
        {texto}
      </Texto>
    </Pressable>
  );
}
