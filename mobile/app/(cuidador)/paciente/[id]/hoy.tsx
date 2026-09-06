import { RefreshControl, ScrollView, View } from 'react-native';

import type { ElementoDeAgenda } from '../../../../src/dominio/modelos';
import {
  Aviso,
  Boton,
  IconoDeEstado,
  Rotulo,
  Tarjeta,
  Texto,
} from '../../../../src/ui/componentes/basicos';
import { Icono } from '../../../../src/ui/componentes/Icono';
import { formatearHora, horaEnPalabras } from '../../../../src/ui/hora';
import {
  DIAS_DE_RESUMEN,
  usePacienteObservado,
} from '../../../../src/ui/contexto/PacienteObservadoContexto';
import {
  colores,
  espacio,
  ESTILO_POR_ESTADO,
  ESTILO_POR_NIVEL,
  radio,
} from '../../../../src/ui/tema';

/**
 * PESTANA "Hoy": como va el paciente en este momento.
 *
 * Responde la pregunta con la que un cuidador abre la aplicacion —"¿le
 * falta alguna toma hoy?"— y le deja actuar sobre ella si el paciente le
 * dio permiso. Todo lo que no sea de hoy vive en las otras dos pestanas.
 */
export default function Hoy() {
  const {
    paciente,
    agenda,
    medicamentos,
    nombreCorto,
    error,
    refrescando,
    procesando,
    alTirarParaRefrescar,
    registrarToma,
  } = usePacienteObservado();

  // El layout ya resuelve todos los casos en que no hay ficha: carga,
  // fallo de red, vinculo sin aceptar y permiso no concedido. Si aun asi
  // llegamos aqui sin paciente es un fallo nuestro, no del usuario, y se
  // dice. Devolver `null` en su lugar es exactamente lo que producia la
  // pantalla en blanco que este arreglo vino a quitar.
  if (!paciente) {
    return (
      <ScrollView contentContainerStyle={{ padding: espacio.md }}>
        <Aviso
          mensaje="No pudimos mostrar la informacion de este paciente. Vuelve atras y entra de nuevo."
          tono="error"
        />
      </ScrollView>
    );
  }

  const nivel = ESTILO_POR_NIVEL[paciente.adherencia.nivel];
  const puedeRegistrar = paciente.permisos.puedeRegistrarTomas;

  // El reparto se hace por ESTADO, no por si el boton esta disponible.
  //
  // Es una distincion que costo un error: `puedeConfirmarse` dejo de
  // significar "sigue pendiente" y paso a significar "se puede tocar
  // ahora". Repartir por el campo viejo mandaba la toma de las 20:00 a
  // la seccion "Ya registradas" a las nueve de la manana, que es
  // exactamente lo contrario de lo que pasa.
  const estaResuelta = (e: ElementoDeAgenda) => e.estado === 'TOMADA' || e.estado === 'OMITIDA';
  const pendientes = agenda?.elementos.filter((e) => !estaResuelta(e)) ?? [];
  const resueltas = agenda?.elementos.filter(estaResuelta) ?? [];
  const porAgotarse = medicamentos.filter((m) => m.necesitaReabastecimiento);

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
          onRefresh={alTirarParaRefrescar}
          tintColor={colores.primario}
        />
      }
    >
      {error ? <Aviso mensaje={error} tono="error" /> : null}

      {/* ---- Como va ---- */}
      <Tarjeta>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: espacio.xs,
          }}
        >
          <Texto variante="cifra" peso="negrita">
            {paciente.adherencia.porcentaje}
          </Texto>
          <Texto variante="subtitulo" peso="semi" color={colores.textoTenue}>
            %
          </Texto>
        </View>
        <Texto variante="rotulo" peso="semi" color={nivel.color}>
          {nivel.etiqueta}
        </Texto>
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

      {/* ---- Lo urgente primero ---- */}
      {porAgotarse.length > 0 ? (
        <Aviso
          tono="advertencia"
          mensaje={
            porAgotarse.length === 1
              ? `Se esta agotando el ${porAgotarse[0]?.nombre}. Quedan ${porAgotarse[0]?.stock.unidadesDisponibles} unidades. Puedes reponerlo en la pestana Tratamiento.`
              : `Hay ${porAgotarse.length} medicamentos por agotarse. Los ves en la pestana Tratamiento.`
          }
        />
      ) : null}

      {/* ---- Las tomas de hoy ---- */}
      <Rotulo>Tomas de hoy</Rotulo>

      {agenda === null ? (
        <Texto color={colores.textoSuave}>No pudimos cargar la agenda de hoy.</Texto>
      ) : agenda.elementos.length === 0 ? (
        <Texto color={colores.textoSuave}>{nombreCorto} no tiene tomas programadas para hoy.</Texto>
      ) : (
        <>
          {pendientes.map((elemento) => (
            <TarjetaDeToma
              key={elemento.tomaId}
              elemento={elemento}
              puedeRegistrar={puedeRegistrar}
              procesando={procesando === elemento.tomaId}
              onAccion={(accion) => registrarToma(elemento, accion)}
            />
          ))}
          {resueltas.map((elemento) => (
            <TarjetaDeToma key={elemento.tomaId} elemento={elemento} puedeRegistrar={false} />
          ))}
        </>
      )}

      {!puedeRegistrar && pendientes.length > 0 ? (
        <Texto variante="pequeno" color={colores.textoSuave}>
          {nombreCorto} no te ha dado permiso para registrar tomas por el. Puedes ver como va, pero
          solo el puede confirmarlas.
        </Texto>
      ) : null}
    </ScrollView>
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
    <Tarjeta>
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
            {formatearHora(elemento.horaProgramada)}
          </Texto>
          <Texto variante="rotulo" peso="semi" color={estilo.color}>
            {estilo.etiqueta}
          </Texto>
        </View>
      </View>

      <Texto peso="media">{elemento.nombreDelMedicamento}</Texto>
      <Texto variante="pequeno" color={colores.textoSuave}>
        {elemento.dosis}
      </Texto>

      {elemento.vecesPospuesta > 0 ? (
        <Texto variante="pequeno" color={colores.advertencia}>
          Pospuesta {elemento.vecesPospuesta} de 3 veces.
        </Texto>
      ) : null}

      {!elemento.puedeConfirmarse && elemento.disponibleDesde ? (
        <View
          style={{
            marginTop: espacio.sm,
            padding: espacio.md,
            borderRadius: radio.md,
            backgroundColor: colores.superficieSuave,
            flexDirection: 'row',
            alignItems: 'center',
            gap: espacio.sm,
          }}
          accessible
          accessibilityLabel={`Todavia no es hora. Podras registrarla a partir de las ${horaEnPalabras(elemento.disponibleDesde)}.`}
        >
          <Icono nombre="reloj" tamano={22} color={colores.textoSuave} />
          <View style={{ flex: 1 }}>
            <Texto variante="pequeno" color={colores.textoSuave}>
              Todavia no es hora. Podras registrarla a partir de las{' '}
              {formatearHora(elemento.disponibleDesde)}.
            </Texto>
          </View>
        </View>
      ) : null}

      {puedeRegistrar && elemento.puedeConfirmarse && onAccion ? (
        <View
          style={{
            flexDirection: 'row',
            gap: espacio.sm,
            marginTop: espacio.sm,
          }}
        >
          <View style={{ flex: 1 }}>
            <Boton
              titulo="Ya la tomo"
              variante="exito"
              ocupado={procesando}
              onPress={() => onAccion('CONFIRMAR')}
              descripcionAccesible={`Registrar que ya tomo ${elemento.nombreDelMedicamento} de las ${horaEnPalabras(elemento.horaProgramada)}`}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Boton
              titulo="No la tomo"
              variante="peligro"
              deshabilitado={procesando}
              onPress={() => onAccion('OMITIR')}
              descripcionAccesible={`Registrar que no tomo ${elemento.nombreDelMedicamento} de las ${horaEnPalabras(elemento.horaProgramada)}`}
            />
          </View>
        </View>
      ) : null}
    </Tarjeta>
  );
}
