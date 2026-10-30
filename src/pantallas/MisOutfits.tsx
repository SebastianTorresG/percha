import type { PropsPantallaDe } from './tipos';
import { PestanaVacia } from './vacias';

/** 06 Mis outfits — vacía hasta su historia. */
export default function MisOutfits({ oculta }: PropsPantallaDe<'outfits'>) {
  return <PestanaVacia etiqueta="06 Mis outfits" titulo="Outfits" oculta={oculta} />;
}
