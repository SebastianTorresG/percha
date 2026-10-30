// Pantallas y hojas inferiores de la app (plan.md, *Project Structure*; diseño, data-screen-label).
// Cada historia agrega aquí los params que necesite su pantalla u hoja.

import type { FechaLocal } from '../datos/tipos';

export interface ParamsPantallas {
  hoy: undefined;
  closet: undefined;
  taller: undefined;
  outfits: undefined;
  detallePrenda: { prendaId: string };
  agregarPrenda: undefined;
  armador: { outfitId?: string; fecha?: FechaLocal } | undefined;
  calendario: undefined;
  misManiquies: undefined;
  ajustes: undefined;
  onboarding: undefined;
  crearPlaneada: undefined;
  detalleTaller: { prendaId: string };
  misMedidas: undefined;
  importarSilueta: undefined;
  diagnostico: undefined;
}

export interface ParamsHojas {
  menu: undefined;
}

export type NombrePantalla = keyof ParamsPantallas;
export type NombreHoja = keyof ParamsHojas;

type Entrada<M, K extends keyof M, Clave extends string> = undefined extends M[K]
  ? { [P in Clave]: K } & { params?: M[K] }
  : { [P in Clave]: K } & { params: M[K] };

export type EntradaPantalla = { [K in NombrePantalla]: Entrada<ParamsPantallas, K, 'pantalla'> }[NombrePantalla];
export type EntradaHoja = { [K in NombreHoja]: Entrada<ParamsHojas, K, 'hoja'> }[NombreHoja];

/** Pestañas de la BarraInferior: Hoy · Clóset · (+) · Taller · Outfits. */
export const PESTANAS = ['hoy', 'closet', 'taller', 'outfits'] as const satisfies readonly NombrePantalla[];
export type Pestana = (typeof PESTANAS)[number];

export function esPestana(nombre: NombrePantalla): nombre is Pestana {
  return (PESTANAS as readonly string[]).includes(nombre);
}

/** Para validar un estado restaurado del historial o de sessionStorage. */
export const PANTALLAS: Readonly<Record<NombrePantalla, true>> = {
  hoy: true,
  closet: true,
  taller: true,
  outfits: true,
  detallePrenda: true,
  agregarPrenda: true,
  armador: true,
  calendario: true,
  misManiquies: true,
  ajustes: true,
  onboarding: true,
  crearPlaneada: true,
  detalleTaller: true,
  misMedidas: true,
  importarSilueta: true,
  diagnostico: true,
};

export const HOJAS: Readonly<Record<NombreHoja, true>> = {
  menu: true,
};
