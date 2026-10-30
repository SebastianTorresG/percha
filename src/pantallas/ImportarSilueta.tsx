import type { PropsPantallaDe } from './tipos';
import { ApiladaVacia } from './vacias';

/** Importar silueta — vacía hasta su historia. */
export default function ImportarSilueta({ oculta }: PropsPantallaDe<'importarSilueta'>) {
  return <ApiladaVacia etiqueta="Importar silueta" titulo="Importar silueta" oculta={oculta} />;
}
