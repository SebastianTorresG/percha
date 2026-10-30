import type { PropsPantallaDe } from './tipos';
import { ApiladaVacia } from './vacias';

/** 04 Agregar 1 Foto — vacía hasta su historia. */
export default function AgregarPrenda({ oculta }: PropsPantallaDe<'agregarPrenda'>) {
  return <ApiladaVacia etiqueta="04 Agregar 1 Foto" titulo="Agregar prenda" oculta={oculta} />;
}
