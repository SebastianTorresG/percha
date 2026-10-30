import type { PropsPantallaDe } from './tipos';
import { ApiladaVacia } from './vacias';

/** 11g Detalle taller — vacía hasta su historia. */
export default function DetalleTaller({ oculta }: PropsPantallaDe<'detalleTaller'>) {
  return <ApiladaVacia etiqueta="11g Detalle taller" titulo="Detalle del taller" oculta={oculta} />;
}
