import type { PropsPantallaDe } from '../tipos';
import { ApiladaVacia } from '../vacias';

/** 11c Tela — vacía hasta su historia. */
export default function CrearPlaneada({ oculta }: PropsPantallaDe<'crearPlaneada'>) {
  return <ApiladaVacia etiqueta="11c Tela" titulo="Nueva prenda planeada" oculta={oculta} />;
}
