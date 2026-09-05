import { Linking, ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';

import {
  AVISO_DE_PRIVACIDAD,
  URL_DE_LA_POLITICA,
  URL_DE_LOS_TERMINOS,
  VERSION_DE_LA_POLITICA,
} from '../src/dominio/politicaDeDatos';
import { Aviso, Boton, Rotulo, Tarjeta, Texto } from '../src/ui/componentes/basicos';
import { useSesion } from '../src/ui/contexto/SesionContexto';
import { colores, espacio } from '../src/ui/tema';

/**
 * Mis datos y privacidad.
 *
 * Existe por una razón concreta, no por cumplir un trámite: el artículo
 * 8 de la Ley 1581 de 2012 le da al titular derecho a conocer sus datos,
 * a saber qué autorizó y a **pedir prueba de esa autorización**. Un
 * derecho que solo se pueda ejercer escribiendo un correo y esperando
 * diez días hábiles es un derecho a medias. Aquí está a un toque.
 *
 * Es alcanzable desde dos sitios: desde el registro —antes de aceptar
 * nada, que es cuando de verdad sirve leerlo— y desde Mi cuenta.
 *
 * La pantalla funciona sin sesión iniciada: la sección de constancia
 * sencillamente no aparece.
 */
export default function Privacidad() {
  const { perfil } = useSesion();
  const autorizacion = perfil?.autorizacionDeDatos;

  return (
    <>
      <Stack.Screen options={{ title: 'Mis datos y privacidad' }} />
      <ScrollView
        contentContainerStyle={{
          padding: espacio.md,
          gap: espacio.md,
          paddingBottom: espacio.xxl,
        }}
      >
        <View style={{ gap: espacio.xs }}>
          <Texto variante="titulo" peso="negrita">
            Tus datos de salud son tuyos
          </Texto>
          <Texto color={colores.textoSuave}>
            Esto es lo que guardamos, para qué lo usamos y qué puedes hacer al respecto.
          </Texto>
        </View>

        {AVISO_DE_PRIVACIDAD.map((seccion) => (
          <Tarjeta key={seccion.titulo}>
            <Rotulo>{seccion.titulo}</Rotulo>
            {seccion.parrafos.map((parrafo) => (
              <Texto key={parrafo} color={colores.textoSuave}>
                {parrafo}
              </Texto>
            ))}
          </Tarjeta>
        ))}

        {/* ---- Constancia de lo que autorizó ---- */}
        {perfil ? (
          <Tarjeta>
            <Rotulo>Tu autorizacion</Rotulo>

            {autorizacion?.consta ? (
              <>
                <Texto color={colores.textoSuave}>
                  Aceptaste la version {autorizacion.versionDePolitica} de esta politica el{' '}
                  {fechaLegible(autorizacion.otorgadaEn)}.
                </Texto>
                <Texto variante="pequeno" color={colores.textoTenue}>
                  Guardamos la version y la fecha para que puedas comprobar exactamente que
                  autorizaste. Es un derecho que te da la ley, no un detalle tecnico.
                </Texto>
                {autorizacion.hayVersionMasReciente ? (
                  <Aviso
                    mensaje={`Hay una version mas reciente de la politica (la ${VERSION_DE_LA_POLITICA}). Te pediremos que la revises.`}
                    tono="info"
                  />
                ) : null}
              </>
            ) : (
              <Aviso
                mensaje="De esta cuenta no nos consta una autorizacion registrada, probablemente porque se creo antes de que empezaramos a guardarla. Te pediremos que la otorgues de nuevo."
                tono="advertencia"
              />
            )}
          </Tarjeta>
        ) : null}

        {/* ---- Derechos ---- */}
        <Tarjeta>
          <Rotulo>Que puedes hacer</Rotulo>
          <Texto color={colores.textoSuave}>
            Muchas de estas cosas las haces tu mismo, sin pedirle permiso a nadie ni esperar
            respuesta:
          </Texto>
          {[
            'Corregir tus datos, desde Mi cuenta.',
            'Ver quien te acompana y que puede hacer cada persona.',
            'Quitarle el acceso a un cuidador cuando quieras, sin dar explicaciones.',
            'Pedir que borremos tu cuenta y toda tu informacion.',
            'Retirar esta autorizacion.',
          ].map((derecho) => (
            <Texto key={derecho} color={colores.textoSuave}>
              • {derecho}
            </Texto>
          ))}
          <Texto variante="pequeno" color={colores.textoTenue}>
            Para lo que no puedes hacer desde la app, escribenos y te respondemos: las consultas en
            maximo 10 dias habiles y los reclamos en 15, que son los plazos que fija la ley.
          </Texto>
        </Tarjeta>

        <Boton
          titulo="Leer la politica completa"
          variante="secundario"
          onPress={() => void Linking.openURL(URL_DE_LA_POLITICA)}
        />
        <Boton
          titulo="Leer los terminos y condiciones"
          variante="secundario"
          onPress={() => void Linking.openURL(URL_DE_LOS_TERMINOS)}
        />

        <Texto variante="pequeno" color={colores.textoTenue}>
          Chronova no es un dispositivo medico. Los recordatorios son una ayuda, no una garantia, y
          ninguna decision sobre tu tratamiento deberia tomarse por lo que diga esta aplicacion. Esa
          conversacion es con tu medico.
        </Texto>
      </ScrollView>
    </>
  );
}

function fechaLegible(iso: string | null): string {
  if (!iso) return 'fecha desconocida';
  try {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}
