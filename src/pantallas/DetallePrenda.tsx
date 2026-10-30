import type { PropsPantallaDe } from './tipos';
import { ApiladaVacia } from './vacias';

/** 03 Detalle de prenda — vacía hasta su historia. */
export default function DetallePrenda({ oculta }: PropsPantallaDe<'detallePrenda'>) {
  return <ApiladaVacia etiqueta="03 Detalle de prenda" titulo="Prenda" oculta={oculta} />;
}
