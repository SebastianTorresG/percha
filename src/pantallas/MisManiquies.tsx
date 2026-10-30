import type { PropsPantallaDe } from './tipos';
import { ApiladaVacia } from './vacias';

/** 08 Mis maniquíes — vacía hasta su historia. */
export default function MisManiquies({ oculta }: PropsPantallaDe<'misManiquies'>) {
  return <ApiladaVacia etiqueta="08 Mis maniquíes" titulo="Mis maniquíes" oculta={oculta} />;
}
