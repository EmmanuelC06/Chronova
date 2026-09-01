import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { ErrorDeApi } from '../../../src/dominio/modelos';
import type {
  AgendaDelDia,
  ElementoDeAgenda,
  Historial,
  Medicamento,
  PacienteEnPanel,
  RegistroDeHistorial,
} from '../../../src/dominio/modelos';
import {
  Aviso,
  Boton,
  Cargando,
  EstadoVacio,
  Insignia,
  Tarjeta,
  Texto,
} from '../../../src/ui/componentes/basicos';
import { useSesion } from '../../../src/ui/contexto/SesionContexto';
import {
  colores,
  espacio,
  ESTILO_POR_ESTADO,
  ESTILO_POR_NIVEL,
  radio,
} from '../../../src/ui/tema';

/**
 * PANTALLA: el paciente visto por su cuidador.
 *
 * El panel de pacientes responde "¿alguien necesita atencion?". Esta
 * pantalla responde la siguiente pregunta, que es la que de verdad
 * importa: "¿que le paso exactamente y que hago al respecto?".
 *
 * Sin ella, el aviso de "Rosa no confirmo cuatro tomas" es una alarma sin
 * salida: informa de un problema y no ofrece ninguna forma de mirarlo.
 *
 * NO HAY NADA NUEVO EN EL SERVIDOR. Todos los datos salen de endpoints
 * que ya existian y que ya aceptaban un pacienteId: la agenda, la lista
 * de medicamentos y el historial. La autorizacion tampoco es nueva: cada
 * caso de uso pasa por PoliticaDeAcceso, que exige un vinculo aceptado
 * con el permiso correspondiente. Esta pantalla no puede saltarselo
 * aunque quisiera, porque la comprobacion vive en el servidor.
 */

const DIAS_DE_RESUMEN = 7;

export default function DetalleDelPaciente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useSesion();

  const [paciente, setPaciente] = useState<PacienteEnPanel | null>(null);
  const [agenda, setAgenda] = useState<AgendaDelDia | null>(null);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [historial, setHistorial] = useState<Historial | null>(null);

  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setError(null);

      // Primero el vinculo. Determina el nombre a mostrar y, sobre todo,
      // que permisos concedio el paciente: si no autorizo ver su
      // historial, no tiene sentido pedir datos que el servidor va a
      // rechazar, y el usuario merece una explicacion en vez de un error.
      const lista = await api.listarPacientesDelCuidador(DIAS_DE_RESUMEN);
      const fila = lista.find((p) => p.pacienteId === id) ?? null;
      setPaciente(fila);

      if (!fila || fila.estadoDelVinculo !== 'ACEPTADO' || !fila.permisos.puedeVerHistorial) {
        return;
      }

      // En paralelo, y tolerando fallos por separado: que el historial
      // falle no debe dejar en blanco la agenda de hoy.
      const [resAgenda, resMedicamentos, resHistorial] = await Promise.allSettled([
        api.obtenerAgenda({ pacienteId: fila.pacienteId }),
        api.listarMedicamentos(fila.pacienteId),
        api.consultarHistorial({ pacienteId: fila.pacienteId }),
      ]);

      if (resAgenda.status === 'fulfilled') setAgenda(resAgenda.value);
      if (resMedicamentos.status === 'fulfilled') setMedicamentos(resMedicamentos.value);
      if (resHistorial.status === 'fulfilled') setHistorial(resHistorial.value);

      if (resAgenda.status === 'rejected') {
        setError(
          resAgenda.reason instanceof ErrorDeApi
            ? resAgenda.reason.message
            : 'No pudimos cargar la agenda de hoy.',
        );
      }
    } catch (problema) {
      setError(
        problema instanceof ErrorDeApi
          ? problema.message
          : 'No pudimos cargar la informacion de este paciente.',
      );
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [api, id]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  /**
   * El cuidador registra una toma en nombre del paciente.
   *
   * Es el caso de "mi mama me dijo por telefono que ya se la tomo".
   * Queda guardado con origen CUIDADOR, de modo que el historial
   * distingue lo que confirmo el paciente de lo que confirmo alguien por
   * el. Esa distincion importa: una adherencia sostenida por el cuidador
   * no es lo mismo que una adherencia autonoma, y el dato seria
   * enganoso si se mezclaran.
   */
  const registrar = async (
    elemento: ElementoDeAgenda,
    accion: 'CONFIRMAR' | 'OMITIR',
  ) => {
    setProcesando(elemento.tomaId);
    try {
      await api.registrarToma(elemento.tomaId, accion);
      await cargar();
    } catch (problema) {
      setError(
        problema instanceof ErrorDeApi ? problema.message : 'No pudimos registrar la toma.',
      );
    } finally {
      setProcesando(null);
    }
  };

  const nombre = paciente?.nombre ?? 'Paciente';

  if (cargando) {
    return (
      <>
        <Stack.Screen options={{ title: 'Paciente' }} />
        <Cargando mensaje="Cargando la informacion..." />
      </>
    );
  }

  // ---- Casos en los que no hay nada que mostrar ----

  if (!paciente) {
    return (
      <>
        <Stack.Screen options={{ title: 'Paciente' }} />
        <ScrollView contentContainerStyle={{ padding: espacio.md }}>
          <EstadoVacio
            titulo="No encontramos a este paciente"
            descripcion="Puede que el vinculo se haya revocado. Vuelve al panel para ver a quienes acompanas."
          />
        </ScrollView>
      </>
    );
  }

  if (paciente.estadoDelVinculo !== 'ACEPTADO') {
    return (
      <>
        <Stack.Screen options={{ title: nombre }} />
        <ScrollView contentContainerStyle={{ padding: espacio.md, gap: espacio.md }}>
          <Aviso
            mensaje={`${nombre} todavia no ha aceptado tu solicitud. Hasta que lo haga no puedes ver su tratamiento.`}
            tono="info"
          />
        </ScrollView>
      </>
    );
  }

  if (!paciente.permisos.puedeVerHistorial) {
    return (
      <>
        <Stack.Screen options={{ title: nombre }} />
        <ScrollView contentContainerStyle={{ padding: espacio.md, gap: espacio.md }}>
          <Aviso
            mensaje={`${nombre} no te ha concedido permiso para ver su tratamiento. Solo el paciente puede cambiarlo, desde su perfil.`}
            tono="advertencia"
          />
        </ScrollView>
      </>
    );
  }

  // ---- Pantalla completa ----

  const nivel = ESTILO_POR_NIVEL[paciente.adherencia.nivel];
  const puedeRegistrar = paciente.permisos.puedeRegistrarTomas;

  const pendientesDeHoy = agenda?.elementos.filter((e) => e.puedeConfirmarse) ?? [];
  const resueltasDeHoy = agenda?.elementos.filter((e) => !e.puedeConfirmarse) ?? [];

  const sinTomar = (historial?.registros ?? [])
    .filter((r) => r.estado === 'OMITIDA')
    .slice(0, 10);

  const porAgotarse = medicamentos.filter((m) => m.necesitaReabastecimiento);
  const ultimosDias = (historial?.porDia ?? []).slice(-DIAS_DE_RESUMEN);

  return (
    <>
      <Stack.Screen options={{ title: nombre }} />
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
        {error ? <Aviso mensaje={error} tono="error" /> : null}

        {/* ---- Encabezado: como va ---- */}
        <Tarjeta colorDeBorde={nivel.color}>
          <Texto variante="titulo" negrita color={nivel.color}>
            {paciente.adherencia.porcentaje}%
          </Texto>
          <Insignia texto={nivel.etiqueta} color={nivel.color} fondo={nivel.fondo} />
          <Texto variante="pequeno" color={colores.textoSuave}>
            Ultimos {DIAS_DE_RESUMEN} dias: {paciente.adherencia.tomadas} tomadas,{' '}
            {paciente.adherencia.omitidas} sin tomar, {paciente.adherencia.pendientes} pendientes.
          </Texto>
          {paciente.parentesco ? (
            <Texto variante="pequeno" color={colores.textoSuave}>
              Tu relacion: {paciente.parentesco}
            </Texto>
          ) : null}
        </Tarjeta>

        {/* ---- Lo urgente primero: medicamentos por agotarse ---- */}
        {porAgotarse.length > 0 ? (
          <Aviso
            tono="advertencia"
            mensaje={
              porAgotarse.length === 1
                ? `Se esta agotando el ${porAgotarse[0]?.nombre}. Quedan ${porAgotarse[0]?.stock.unidadesDisponibles} unidades.`
                : `Hay ${porAgotarse.length} medicamentos por agotarse.`
            }
          />
        ) : null}

        {/* ---- Hoy ---- */}
        <Texto variante="subtitulo" negrita>
          Hoy
        </Texto>

        {agenda === null ? (
          <Texto color={colores.textoSuave}>No pudimos cargar la agenda de hoy.</Texto>
        ) : agenda.elementos.length === 0 ? (
          <Texto color={colores.textoSuave}>
            {nombre.split(' ')[0]} no tiene tomas programadas para hoy.
          </Texto>
        ) : (
          <>
            {pendientesDeHoy.map((elemento) => (
              <TarjetaDeToma
                key={elemento.tomaId}
                elemento={elemento}
                puedeRegistrar={puedeRegistrar}
                procesando={procesando === elemento.tomaId}
                onAccion={(accion) => void registrar(elemento, accion)}
              />
            ))}
            {resueltasDeHoy.map((elemento) => (
              <TarjetaDeToma key={elemento.tomaId} elemento={elemento} puedeRegistrar={false} />
            ))}
          </>
        )}

        {!puedeRegistrar && pendientesDeHoy.length > 0 ? (
          <Texto variante="pequeno" color={colores.textoSuave}>
            {nombre.split(' ')[0]} no te ha dado permiso para registrar tomas por el. Puedes ver
            como va, pero solo el puede confirmarlas.
          </Texto>
        ) : null}

        {/* ---- Lo que fallo ---- */}
        {sinTomar.length > 0 ? (
          <>
            <Texto variante="subtitulo" negrita>
              Tomas sin tomar
            </Texto>
            <Texto variante="pequeno" color={colores.textoSuave}>
              Las mas recientes. Es lo que conviene revisar con {nombre.split(' ')[0]}.
            </Texto>
            {sinTomar.map((registro) => (
              <TarjetaDeOmision key={registro.tomaId} registro={registro} />
            ))}
          </>
        ) : historial ? (
          <Aviso
            tono="exito"
            mensaje={`${nombre.split(' ')[0]} no ha dejado de tomar ninguna dosis en el periodo consultado.`}
          />
        ) : null}

        {/* ---- Evolucion ---- */}
        {ultimosDias.length > 1 ? (
          <Tarjeta>
            <Texto negrita>Ultimos dias</Texto>
            <View
              accessibilityLabel={`Grafica de cumplimiento de ${nombre} en los ultimos ${ultimosDias.length} dias.`}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                gap: espacio.xs,
                height: 110,
                marginTop: espacio.sm,
              }}
            >
              {ultimosDias.map((dia) => (
                <View key={dia.fecha} style={{ flex: 1, alignItems: 'center', gap: espacio.xs }}>
                  <View
                    style={{
                      width: '100%',
                      height: Math.max(4, (dia.porcentaje / 100) * 84),
                      borderRadius: radio.sm,
                      backgroundColor:
                        dia.porcentaje >= 80
                          ? colores.exito
                          : dia.porcentaje >= 50
                            ? colores.advertencia
                            : colores.peligro,
                    }}
                  />
                  <Texto variante="pequeno" color={colores.textoSuave}>
                    {dia.fecha.slice(8)}
                  </Texto>
                </View>
              ))}
            </View>
          </Tarjeta>
        ) : null}

        {/* ---- Tratamiento ---- */}
        {medicamentos.length > 0 ? (
          <>
            <Texto variante="subtitulo" negrita>
              Tratamiento
            </Texto>
            {medicamentos.map((medicamento) => (
              <Tarjeta
                key={medicamento.id}
                colorDeBorde={
                  medicamento.necesitaReabastecimiento ? colores.advertencia : undefined
                }
              >
                <Texto negrita>{medicamento.nombre}</Texto>
                <Texto variante="pequeno" color={colores.textoSuave}>
                  {medicamento.descripcionDeDosis ??
                    `${medicamento.dosis.cantidad} ${medicamento.dosis.unidad}`}
                  {' · '}
                  {medicamento.horarios.join(', ')}
                </Texto>
                {medicamento.descripcionDeFrecuencia ? (
                  <Texto variante="pequeno" color={colores.textoSuave}>
                    {medicamento.descripcionDeFrecuencia}
                  </Texto>
                ) : null}
                <Texto
                  variante="pequeno"
                  color={
                    medicamento.necesitaReabastecimiento ? colores.advertencia : colores.textoSuave
                  }
                >
                  Quedan {medicamento.stock.unidadesDisponibles} unidades
                  {medicamento.necesitaReabastecimiento ? ' — conviene reabastecer' : ''}
                </Texto>
              </Tarjeta>
            ))}
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

// -----------------------------------------------------------------

function TarjetaDeToma({
  elemento,
  puedeRegistrar,
  procesando = false,
  onAccion,
}: {
  elemento: ElementoDeAgenda;
  puedeRegistrar: boolean;
  procesando?: boolean;
  onAccion?: (accion: 'CONFIRMAR' | 'OMITIR') => void;
}) {
  const estilo = ESTILO_POR_ESTADO[elemento.estado];

  return (
    <Tarjeta colorDeBorde={estilo.color}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Texto variante="subtitulo" negrita>
          {elemento.horaProgramada}
        </Texto>
        <Insignia
          texto={estilo.etiqueta}
          icono={estilo.icono}
          color={estilo.color}
          fondo={estilo.fondo}
        />
      </View>

      <Texto>{elemento.nombreDelMedicamento}</Texto>
      <Texto variante="pequeno" color={colores.textoSuave}>
        {elemento.dosis}
      </Texto>

      {elemento.vecesPospuesta > 0 ? (
        <Texto variante="pequeno" color={colores.advertencia}>
          Pospuesta {elemento.vecesPospuesta} de 3 veces.
        </Texto>
      ) : null}

      {puedeRegistrar && elemento.puedeConfirmarse && onAccion ? (
        <View style={{ flexDirection: 'row', gap: espacio.sm, marginTop: espacio.sm }}>
          <View style={{ flex: 1 }}>
            <Boton
              titulo="Ya la tomo"
              variante="exito"
              ocupado={procesando}
              onPress={() => onAccion('CONFIRMAR')}
              descripcionAccesible={`Registrar que ya tomo ${elemento.nombreDelMedicamento} de las ${elemento.horaProgramada}`}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Boton
              titulo="No la tomo"
              variante="peligro"
              deshabilitado={procesando}
              onPress={() => onAccion('OMITIR')}
              descripcionAccesible={`Registrar que no tomo ${elemento.nombreDelMedicamento} de las ${elemento.horaProgramada}`}
            />
          </View>
        </View>
      ) : null}
    </Tarjeta>
  );
}

function TarjetaDeOmision({ registro }: { registro: RegistroDeHistorial }) {
  const estilo = ESTILO_POR_ESTADO.OMITIDA;

  return (
    <Tarjeta colorDeBorde={estilo.color}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Texto negrita>{registro.nombreDelMedicamento}</Texto>
        <Insignia
          texto={estilo.etiqueta}
          icono={estilo.icono}
          color={estilo.color}
          fondo={estilo.fondo}
        />
      </View>
      <Texto variante="pequeno" color={colores.textoSuave}>
        {momentoEnPalabras(registro.programadaPara)}
      </Texto>
      {registro.registradaPor === 'SISTEMA' ? (
        <Texto variante="pequeno" color={colores.textoSuave}>
          Se cerro sola: nadie respondio al recordatorio.
        </Texto>
      ) : registro.registradaPor === 'CUIDADOR' ? (
        <Texto variante="pequeno" color={colores.textoSuave}>
          La registro un cuidador.
        </Texto>
      ) : null}
      {registro.observaciones ? (
        <Texto variante="pequeno" color={colores.textoSuave}>
          “{registro.observaciones}”
        </Texto>
      ) : null}
    </Tarjeta>
  );
}

function momentoEnPalabras(iso: string): string {
  const fecha = new Date(iso);
  return fecha.toLocaleString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}
