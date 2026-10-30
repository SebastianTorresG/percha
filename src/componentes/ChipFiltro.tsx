import type { ButtonHTMLAttributes } from 'react';
import './ChipFiltro.css';

export interface PropsChipFiltro extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> {
  /** Con `--accent`; inactivo con `--chip`. */
  activo?: boolean;
  /** 34 a 40 px (tokens `alturaChip`). */
  altura?: 34 | 36 | 40;
  /** `agregar`: "+ Etiqueta", con borde punteado. */
  variante?: 'filtro' | 'agregar';
}

/**
 * Chip de filtro: minúsculas a 13 px en claro, MAYÚSCULAS a 11 px con tracking 0.1em en oscuro,
 * todo desde los tokens del tema.
 */
export function ChipFiltro({ activo = false, altura = 34, variante = 'filtro', className, type = 'button', ...props }: PropsChipFiltro) {
  const clases = ['chip-filtro', variante === 'agregar' && 'chip-filtro-agregar', className].filter(Boolean).join(' ');
  return (
    <button
      type={type}
      className={clases}
      data-altura={altura}
      aria-pressed={variante === 'filtro' ? activo : undefined}
      {...props}
    />
  );
}
