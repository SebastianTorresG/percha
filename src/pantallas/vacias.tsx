// Pantallas vacías de la fase Foundational (T034): cada historia reemplaza la suya. Llevan el
// `data-pantalla` y el encabezado del diseño para poder navegar y probar la PWA en el iPhone.

import type { ReactNode } from 'react';
import { BarraSuperior, EncabezadoPestana, Pantalla, TituloApilada } from '../componentes/Pantalla';
import { useNavegacion } from '../navegacion/useNavegacion';

export function PestanaVacia(props: { etiqueta: string; titulo: string; meta?: string; accion?: ReactNode; oculta: boolean }) {
  return (
    <Pantalla etiqueta={props.etiqueta} conBarra oculta={props.oculta}>
      <EncabezadoPestana meta={props.meta} titulo={props.titulo} accion={props.accion} />
    </Pantalla>
  );
}

export function ApiladaVacia(props: { etiqueta: string; titulo: string; oculta: boolean; children?: ReactNode }) {
  const { navegacion } = useNavegacion();
  return (
    <Pantalla etiqueta={props.etiqueta} oculta={props.oculta}>
      <BarraSuperior alVolver={() => navegacion.volver()} />
      <TituloApilada titulo={props.titulo} />
      {props.children}
    </Pantalla>
  );
}
