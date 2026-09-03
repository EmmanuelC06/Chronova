import { RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';

import { Aviso, Boton, EstadoVacio, Tarjeta, Texto } from '../../../../src/ui/componentes/basicos';
import { usePacienteObservado } from '../../../../src/ui/contexto/PacienteObservadoContexto';
import { colores, espacio } from '../../../../src/ui/tema';

/**
 * PESTANA "Tratamiento": que esta tomando el paciente, y como cambiarlo.
 *
 * Es la pestana que existe gracias al permiso `puedeGestionarMedicamentos`.
 * El servidor lo respetaba desde el principio y el paciente podia
 * concederlo desde su perfil, pero no habia ninguna pantalla que lo
 * usara: se concedia un permiso que no servia para nada.
 *
 * Sin ese permiso la pestana sigue teniendo sentido —el cuidador ve que
 * toma la persona que acompana— y no muestra ningun boton. La
 * comprobacion de verdad no esta aqui: aunque esta pantalla se
 * equivocara y los mostrara, el servidor responderia 403.
 */
export default function Tratamiento() {
  const {
    paciente,
    medicamentos,
    nombre,
    nombreCorto,
    error,
    refrescando,
    procesando,
    alTirarParaRefrescar,
    reabastecer,
    suspender,
  } = usePacienteObservado();

  if (!paciente) return null;

  const puedeGestionar = paciente.permisos.puedeGestionarMedicamentos;

  return (
    <ScrollView
      contentContainerStyle={{ padding: espacio.md, gap: espacio.md, paddingBottom: espacio.xxl }}
      refreshControl={
        <RefreshControl
          refreshing={refrescando}
          onRefresh={alTirarParaRefrescar}
          tintColor={colores.primario}
        />
      }
    >
      {error ? <Aviso mensaje={error} tono="error" /> : null}

      {puedeGestionar ? (
        <Boton
          titulo="+ Agregar medicamento"
          onPress={() => router.push(`/medicamento/nuevo?pacienteId=${paciente.pacienteId}`)}
          descripcionAccesible={`Agregar un medicamento al tratamiento de ${nombre}`}
        />
      ) : null}

      {medicamentos.length === 0 ? (
        <EstadoVacio
          titulo={`${nombreCorto} no tiene medicamentos registrados`}
          descripcion={
            puedeGestionar
              ? 'Agrega el primero y empezara a recibir recordatorios a la hora exacta de cada toma.'
              : `Cuando ${nombreCorto} registre su tratamiento, lo veras aqui.`
          }
        />
      ) : null}

      {medicamentos.map((medicamento) => (
        <Tarjeta
          key={medicamento.id}
          colorDeBorde={medicamento.necesitaReabastecimiento ? colores.advertencia : undefined}
        >
          <Texto variante="subtitulo" negrita>
            {medicamento.nombre}
          </Texto>

          <Texto color={colores.textoSuave}>
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

          {medicamento.instrucciones ? (
            <Texto variante="pequeno" color={colores.textoSuave}>
              {medicamento.instrucciones}
            </Texto>
          ) : null}

          <Texto
            variante="pequeno"
            negrita={medicamento.necesitaReabastecimiento}
            color={medicamento.necesitaReabastecimiento ? colores.advertencia : colores.textoSuave}
          >
            Quedan {medicamento.stock.unidadesDisponibles} unidades
            {medicamento.necesitaReabastecimiento ? ' — conviene reabastecer' : ''}
          </Texto>

          {puedeGestionar ? (
            <View style={{ gap: espacio.sm, marginTop: espacio.sm }}>
              <Boton
                titulo="Editar"
                variante="secundario"
                deshabilitado={procesando === medicamento.id}
                onPress={() =>
                  router.push(`/medicamento/${medicamento.id}?pacienteId=${paciente.pacienteId}`)
                }
                descripcionAccesible={`Editar ${medicamento.nombre}`}
              />
              <View style={{ flexDirection: 'row', gap: espacio.sm }}>
                <View style={{ flex: 1 }}>
                  <Boton
                    titulo="Reabastecer"
                    variante="secundario"
                    ocupado={procesando === medicamento.id}
                    onPress={() => reabastecer(medicamento)}
                    descripcionAccesible={`Reabastecer ${medicamento.nombre}`}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Boton
                    titulo="Suspender"
                    variante="peligro"
                    deshabilitado={procesando === medicamento.id}
                    onPress={() => suspender(medicamento)}
                    descripcionAccesible={`Suspender ${medicamento.nombre}`}
                  />
                </View>
              </View>
            </View>
          ) : null}
        </Tarjeta>
      ))}

      {!puedeGestionar && medicamentos.length > 0 ? (
        <Texto variante="pequeno" color={colores.textoSuave}>
          Para poder cambiar este tratamiento necesitas que {nombreCorto} te conceda el permiso
          «cambiar la medicacion» desde su perfil.
        </Texto>
      ) : null}
    </ScrollView>
  );
}
