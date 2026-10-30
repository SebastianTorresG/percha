import type { PropsPantallaDe } from './tipos';
import { PestanaVacia } from './vacias';

/** 11 Taller — vacía hasta su historia. */
export default function Taller({ oculta }: PropsPantallaDe<'taller'>) {
  return <PestanaVacia etiqueta="11 Taller" titulo="Taller" oculta={oculta} />;
}
