import type { PropsPantallaDe } from './tipos';
import { PestanaVacia } from './vacias';

/** 02 Clóset — vacía hasta su historia. */
export default function Closet({ oculta }: PropsPantallaDe<'closet'>) {
  return <PestanaVacia etiqueta="02 Clóset" titulo="Clóset" oculta={oculta} />;
}
