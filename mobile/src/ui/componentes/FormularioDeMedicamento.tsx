import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import type { Medicamento } from '../../dominio/modelos';
import { Aviso, Boton, Campo, Rotulo, Texto } from './basicos';
import { ALTO_TACTIL_MINIMO, colores, espacio, radio } from '../tema';
import { aHoraDe24, formatearHora, horaEnPalabras } from '../hora';

/**
 * Formulario de medicamento, compartido por el alta y la edicion.
 *
 * Es la pantalla mas compleja de la aplicacion, y por eso vive en un solo
 * sitio: tener dos copias casi iguales para crear y para editar es la
 * receta para que dentro de un mes una valide algo que la otra no.
 *
 * Tres decisiones de interfaz que vienen del usuario al que sirve:
 *  - Los horarios se agregan de a uno, con atajos para las horas mas
 *    comunes. Nada de escribir "08:00,20:00" separado por comas.
 *  - Los dias de la semana son botones que se prenden y se apagan, con
 *    marca visible ademas del color.
 *  - El inventario se explica para que sirve, porque un campo que no se
 *    entiende se llena mal o se deja vacio por miedo.
 */

const UNIDADES = ['tableta', 'capsula', 'ml', 'mg', 'gota', 'sobre', 'inyeccion', 'unidad'];
const DIAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const NOMBRES_DE_DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
/**
 * Las horas que la gente usa de verdad, ancladas a las comidas y al
 * levantarse y acostarse. Se guardan en 24 horas y se ENSENAN en a. m. /
 * p. m., que es como se leen aqui.
 */
const HORAS_SUGERIDAS = ['07:00', '08:00', '12:00', '13:00', '18:00', '20:00', '22:00'];

/** Lo que el formulario entrega, listo para enviar a la API. */
export interface DatosDelFormulario {
  nombre: string;
  dosis: { cantidad: number; unidad: string };
  frecuencia: { tipo: 'DIARIA' } | { tipo: 'DIAS_DE_LA_SEMANA'; diasDeLaSemana: number[] };
  horarios: string[];
  instrucciones: string | null;
  /** Solo al crear: al editar, el inventario tiene su propia pantalla. */
  stock?: { unidadesDisponibles: number; umbralDeAlerta: number };
}

export function FormularioDeMedicamento({
  inicial,
  textoDelBoton,
  onGuardar,
  onCancelar,
}: {
  /** Si viene, el formulario arranca lleno y no pregunta por el inventario. */
  inicial?: Medicamento;
  textoDelBoton: string;
  onGuardar: (datos: DatosDelFormulario) => Promise<void>;
  onCancelar: () => void;
}) {
  const editando = inicial !== undefined;

  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [cantidad, setCantidad] = useState(String(inicial?.dosis.cantidad ?? 1));
  const [unidad, setUnidad] = useState(inicial?.dosis.unidad ?? 'tableta');
  const [horarios, setHorarios] = useState<string[]>(inicial?.horarios ?? []);
  const [horaNueva, setHoraNueva] = useState('');
  /**
   * a. m. o p. m. para la hora que se escribe a mano.
   *
   * Existe porque sin el la entrada seria ambigua: "8:30" pueden ser las
   * ocho y media de la mañana o las de la noche, y en una aplicacion de
   * medicacion esa diferencia son doce horas de tratamiento. Dos botones
   * grandes resuelven la ambiguedad sin pedirle a nadie que traduzca a
   * horario de 24 horas.
   */
  const [meridiano, setMeridiano] = useState<'AM' | 'PM'>('AM');
  const [todosLosDias, setTodosLosDias] = useState(
    inicial ? inicial.frecuencia.tipo === 'DIARIA' : true,
  );
  const [diasElegidos, setDiasElegidos] = useState<number[]>(
    inicial?.frecuencia.diasDeLaSemana ?? [],
  );
  const [instrucciones, setInstrucciones] = useState(inicial?.instrucciones ?? '');
  const [unidadesDisponibles, setUnidadesDisponibles] = useState('');
  const [umbral, setUmbral] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  /** Agrega una hora que ya viene en formato de 24 horas (los atajos). */
  const agregarHora = (hora24: string) => {
    if (horarios.includes(hora24)) {
      setError('Esa hora ya está en la lista.');
      return;
    }
    setError(null);
    setHorarios([...horarios, hora24].sort());
  };

  /**
   * Agrega la hora que se escribio a mano, en formato de 12 horas.
   *
   * Se guarda en 24 horas, que es lo que entiende el servidor, pero la
   * persona nunca ve ese formato: escribe "8:30", toca "p. m." y listo.
   */
  const agregarHoraEscrita = () => {
    const hora24 = aHoraDe24(horaNueva, meridiano);
    if (!hora24) {
      setError('Escribe la hora como 8:30, y elige si es de la mañana o de la tarde.');
      return;
    }
    if (horarios.includes(hora24)) {
      setError('Esa hora ya está en la lista.');
      return;
    }
    setError(null);
    setHorarios([...horarios, hora24].sort());
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
      setError('Elige al menos un día de la semana.');
      return;
    }

    const numeroDeCantidad = Number(cantidad.replace(',', '.'));
    if (!Number.isFinite(numeroDeCantidad) || numeroDeCantidad <= 0) {
      setError('La cantidad debe ser un número mayor que cero.');
      return;
    }

    const disponibles = Number(unidadesDisponibles);
    const alerta = Number(umbral);
    const llevaInventario = !editando && Number.isInteger(disponibles) && disponibles > 0;

    setOcupado(true);
    try {
      await onGuardar({
        nombre: nombre.trim(),
        dosis: { cantidad: numeroDeCantidad, unidad },
        frecuencia: todosLosDias
          ? { tipo: 'DIARIA' }
          : {
              tipo: 'DIAS_DE_LA_SEMANA',
              diasDeLaSemana: [...diasElegidos].sort(),
            },
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
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : 'No pudimos guardar el medicamento.');
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
        contentContainerStyle={{
          padding: espacio.md,
          gap: espacio.lg,
          paddingBottom: espacio.xxl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {error ? <Aviso mensaje={error} tono="error" /> : null}

        {editando ? (
          <Aviso
            tono="info"
            mensaje="Si cambias las horas o los días, las tomas de hoy que aún no habías registrado se rehacen con el horario nuevo. Las que ya registraste no se tocan."
          />
        ) : null}

        <Campo
          etiqueta="Nombre del medicamento"
          valor={nombre}
          onCambio={setNombre}
          marcador="Losartan"
          ayuda="Escríbelo como aparece en la caja."
        />

        {/* -------- Dosis -------- */}
        <View style={{ gap: espacio.sm }}>
          <Rotulo>¿Cuánto toma cada vez?</Rotulo>

          <View
            style={{
              flexDirection: 'row',
              gap: espacio.sm,
              alignItems: 'flex-end',
            }}
          >
            <View style={{ width: 110 }}>
              <Campo
                etiqueta="Cantidad"
                valor={cantidad}
                onCambio={setCantidad}
                tipoDeTeclado="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Rotulo>Unidad</Rotulo>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View
                  style={{
                    flexDirection: 'row',
                    gap: espacio.xs,
                    paddingVertical: espacio.xs,
                  }}
                >
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
          <Rotulo>¿A qué horas?</Rotulo>

          {horarios.length > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: espacio.sm,
              }}
            >
              {horarios.map((hora) => (
                <Pressable
                  key={hora}
                  onPress={() => setHorarios(horarios.filter((h) => h !== hora))}
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar la toma de las ${horaEnPalabras(hora)}`}
                  style={{
                    minHeight: ALTO_TACTIL_MINIMO,
                    paddingHorizontal: espacio.md,
                    justifyContent: 'center',
                    borderRadius: radio.redondo,
                    backgroundColor: colores.primarioSuave,
                  }}
                >
                  <Texto peso="semi" color={colores.primarioOscuro}>
                    {formatearHora(hora)}
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
            {HORAS_SUGERIDAS.map((hora) => (
              <Ficha
                key={hora}
                texto={formatearHora(hora)}
                activa={false}
                onPress={() => agregarHora(hora)}
              />
            ))}
          </View>

          <View
            style={{
              flexDirection: 'row',
              gap: espacio.sm,
              alignItems: 'flex-end',
            }}
          >
            <View style={{ flex: 1 }}>
              <Campo
                etiqueta="Otra hora"
                valor={horaNueva}
                onCambio={setHoraNueva}
                marcador="9:30"
                tipoDeTeclado="numbers-and-punctuation"
              />
            </View>
            <View style={{ paddingBottom: 2, flexDirection: 'row', gap: espacio.xs }}>
              <Ficha texto="a. m." activa={meridiano === 'AM'} onPress={() => setMeridiano('AM')} />
              <Ficha texto="p. m." activa={meridiano === 'PM'} onPress={() => setMeridiano('PM')} />
            </View>
          </View>

          <View style={{ flexDirection: 'row' }}>
            <View style={{ paddingBottom: 2 }}>
              <Boton
                titulo="Agregar esta hora"
                variante="secundario"
                ancho="ajustado"
                onPress={agregarHoraEscrita}
              />
            </View>
          </View>
        </View>

        {/* -------- Frecuencia -------- */}
        <View style={{ gap: espacio.sm }}>
          <Rotulo>¿Qué días?</Rotulo>

          <View style={{ flexDirection: 'row', gap: espacio.sm }}>
            <View style={{ flex: 1 }}>
              <Boton
                titulo="Todos los días"
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
            <View
              style={{
                flexDirection: 'row',
                gap: espacio.xs,
                justifyContent: 'space-between',
              }}
            >
              {DIAS.map((letra, indice) => {
                const elegido = diasElegidos.includes(indice);
                return (
                  <Pressable
                    key={indice}
                    onPress={() => alternarDia(indice)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: elegido }}
                    accessibilityLabel={NOMBRES_DE_DIAS[indice]}
                    style={{
                      flex: 1,
                      // Antes eran 44x56, por debajo de los 64 que exige el
                      // tema por el temblor y la artritis. Siete cuadros
                      // pequenos y pegados son justo el peor caso.
                      minHeight: ALTO_TACTIL_MINIMO,
                      borderRadius: radio.md,
                      borderWidth: 2,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderColor: elegido ? colores.primario : colores.borde,
                      backgroundColor: elegido ? colores.primario : colores.superficie,
                    }}
                  >
                    <Texto peso="semi" color={elegido ? colores.textoInverso : colores.texto}>
                      {letra}
                    </Texto>
                    {/* El estado nunca solo con color: tambien una marca. */}
                    <Texto
                      variante="pequeno"
                      color={elegido ? colores.textoInverso : colores.borde}
                    >
                      {elegido ? 'Si' : 'No'}
                    </Texto>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        {/* -------- Extras -------- */}
        <Campo
          etiqueta="Indicaciones (opcional)"
          valor={instrucciones}
          onCambio={setInstrucciones}
          marcador="Tomar después de comer"
        />

        {!editando ? (
          <View style={{ gap: espacio.sm }}>
            <Rotulo>Inventario (opcional)</Rotulo>
            <Texto variante="pequeno" color={colores.textoSuave}>
              Si nos dices cuántas unidades tienes, Chronova las va descontando y te avisa antes de
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
        ) : (
          <Texto variante="pequeno" color={colores.textoSuave}>
            El inventario se ajusta desde la lista de medicamentos, con el botón de reabastecer.
          </Texto>
        )}

        <Boton titulo={textoDelBoton} onPress={guardar} ocupado={ocupado} />
        <Boton titulo="Cancelar" variante="texto" onPress={onCancelar} />
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
        minHeight: ALTO_TACTIL_MINIMO,
        justifyContent: 'center',
        paddingHorizontal: espacio.md,
        borderRadius: radio.redondo,
        borderWidth: 2,
        borderColor: activa ? colores.primario : colores.borde,
        backgroundColor: activa ? colores.primario : colores.superficie,
      }}
    >
      <Texto peso="semi" color={activa ? colores.textoInverso : colores.texto}>
        {texto}
      </Texto>
    </Pressable>
  );
}
