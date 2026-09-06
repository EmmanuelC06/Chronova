import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';

import type { TamanoDeLetra } from '../../../src/dominio/modelos';
import { VERSION_DE_LA_POLITICA } from '../../../src/dominio/politicaDeDatos';
import { Aviso, Boton, Insignia, Tarjeta, Texto } from '../../../src/ui/componentes/basicos';
import { useSesion } from '../../../src/ui/contexto/SesionContexto';
import { colores, espacio } from '../../../src/ui/tema';
import { primerNombre } from '../../../src/ui/texto';

const ETIQUETAS_DE_TAMANO: Record<TamanoDeLetra, string> = {
  NORMAL: 'Normal',
  GRANDE: 'Grande',
  MUY_GRANDE: 'Muy grande',
};

/**
 * Mi cuenta, del cuidador.
 *
 * Es la hermana de la pantalla del paciente, y a proposito trae menos
 * cosas: aqui no hay minutos de gracia —ese margen es de las tomas, y
 * las tomas no son suyas— ni lista de quien ve sus datos, porque nadie
 * ve los datos del cuidador.
 *
 * Lo que si trae, y antes no existia en ninguna parte:
 *
 *  - El tamano de letra. El cuidador suele ser el hijo o la hija, pero
 *    "hijo" a los noventa anos quiere decir sesenta y cinco. Que solo
 *    el paciente pudiera agrandar la letra era una suposicion sobre
 *    quien tiene la vista cansada que no se sostiene.
 *  - La constancia de su autorizacion de tratamiento de datos. El
 *    articulo 8 de la Ley 1581 de 2012 da a todo titular derecho a
 *    pedir prueba de lo que autorizo, y el cuidador aceptó la politica
 *    igual que el paciente al registrarse.
 */
export default function CuentaDelCuidador() {
  const { perfil, preferencias, cambiarPreferencias, cerrarSesion } = useSesion();
  const [error, setError] = useState<string | null>(null);

  const cambiar = async (cambios: Parameters<typeof cambiarPreferencias>[0]) => {
    setError(null);
    try {
      await cambiarPreferencias(cambios);
    } catch (problema) {
      // Se muestra el motivo que da el servidor cuando lo hay. Decir
      // siempre "revisa tu conexion" ante cualquier fallo manda a la
      // persona a mirar el wifi cuando el problema esta en otro sitio,
      // y de paso esconde el error a quien podria arreglarlo.
      setError(
        problema instanceof Error && problema.message
          ? problema.message
          : 'No pudimos guardar ese cambio.',
      );
    }
  };

  const autorizacion = perfil?.autorizacionDeDatos;

  return (
    <ScrollView
      contentContainerStyle={{
        padding: espacio.md,
        gap: espacio.md,
        paddingBottom: espacio.xxl,
      }}
    >
      {error ? <Aviso mensaje={error} tono="error" /> : null}

      <View style={{ gap: espacio.xs }}>
        <Texto variante="titulo" peso="negrita">
          {perfil ? primerNombre(perfil.nombre) : 'Mi cuenta'}
        </Texto>
        <Texto color={colores.textoSuave}>
          {perfil?.email}
          {perfil?.rol ? ` — ${perfil.rol}` : ''}
        </Texto>
      </View>

      {/* ---- Accesibilidad ---- */}
      <Tarjeta>
        <Texto variante="subtitulo" peso="semi">
          Tamano de la letra
        </Texto>
        <Texto variante="pequeno" color={colores.textoSuave}>
          Cambia el tamano de todos los textos de la aplicacion. Se guarda en tu cuenta, asi que te
          acompana si entras desde otro telefono.
        </Texto>

        <View style={{ gap: espacio.sm, marginTop: espacio.sm }}>
          {(Object.keys(ETIQUETAS_DE_TAMANO) as TamanoDeLetra[]).map((opcion) => (
            <Boton
              key={opcion}
              titulo={ETIQUETAS_DE_TAMANO[opcion]}
              variante={preferencias.tamanoDeLetra === opcion ? 'primario' : 'secundario'}
              onPress={() => void cambiar({ tamanoDeLetra: opcion })}
            />
          ))}
        </View>
      </Tarjeta>

      {/* ---- Privacidad ---- */}
      <Tarjeta>
        <Texto variante="subtitulo" peso="semi">
          Mis datos y privacidad
        </Texto>
        <Texto variante="pequeno" color={colores.textoSuave}>
          Que guardamos sobre ti, para que lo usamos y que puedes pedirnos en cualquier momento.
        </Texto>

        {autorizacion?.consta ? (
          <View style={{ gap: espacio.xs, marginTop: espacio.sm }}>
            <Insignia
              texto={`Autorizaste la version ${autorizacion.versionDePolitica}`}
              icono="check"
              color={colores.exito}
              fondo={colores.exitoSuave}
            />
            <Texto variante="pequeno" color={colores.textoSuave}>
              {fechaLegible(autorizacion.otorgadaEn)}
            </Texto>
            {autorizacion.hayVersionMasReciente ? (
              <Aviso
                mensaje={`La politica cambio desde entonces. La version vigente es la ${VERSION_DE_LA_POLITICA}; puedes leerla aqui abajo.`}
                tono="info"
              />
            ) : null}
          </View>
        ) : (
          <Texto variante="pequeno" color={colores.textoSuave}>
            Tu cuenta se creo antes de que existiera este registro, asi que no consta la version que
            aceptaste.
          </Texto>
        )}

        <Boton
          titulo="Ver mis datos y privacidad"
          variante="secundario"
          icono="cuenta"
          onPress={() => router.push('/privacidad')}
        />
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

function fechaLegible(iso: string | null | undefined): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  return `El ${fecha.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;
}
