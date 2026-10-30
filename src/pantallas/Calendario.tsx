import type { PropsPantallaDe } from './tipos';
import { ApiladaVacia } from './vacias';

/** 07 Calendario — vacía hasta su historia. */
export default function Calendario({ oculta }: PropsPantallaDe<'calendario'>) {
  return <ApiladaVacia etiqueta="07 Calendario" titulo="Calendario" oculta={oculta} />;
}
