import type { PropsPantallaDe } from './tipos';
import { ApiladaVacia } from './vacias';

/** 05 Armador — vacía hasta su historia. */
export default function Armador({ oculta }: PropsPantallaDe<'armador'>) {
  return <ApiladaVacia etiqueta="05 Armador" titulo="Armador" oculta={oculta} />;
}
