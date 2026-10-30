import type { PropsPantallaDe } from './tipos';
import { ApiladaVacia } from './vacias';

/** 12 Mis medidas — vacía hasta su historia. */
export default function MisMedidas({ oculta }: PropsPantallaDe<'misMedidas'>) {
  return <ApiladaVacia etiqueta="12 Mis medidas" titulo="Mis medidas" oculta={oculta} />;
}
