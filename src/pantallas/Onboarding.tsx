import type { PropsPantallaDe } from './tipos';
import { ApiladaVacia } from './vacias';

/** 10 Bienvenida — vacía hasta su historia. */
export default function Onboarding({ oculta }: PropsPantallaDe<'onboarding'>) {
  return <ApiladaVacia etiqueta="10 Bienvenida" titulo="Bienvenida" oculta={oculta} />;
}
