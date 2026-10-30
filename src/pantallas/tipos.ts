import type { NombrePantalla, ParamsPantallas } from '../navegacion/rutas';

/** Lo que App le pasa a cada pantalla de la pila. */
export interface PropsPantallaDe<K extends NombrePantalla> {
  params: ParamsPantallas[K];
  /** Hay otra pantalla encima: se mantiene montada y oculta, con su scroll. */
  oculta: boolean;
}
