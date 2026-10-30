import type { ButtonHTMLAttributes } from 'react';
import './Boton.css';

export type PropsBoton = ButtonHTMLAttributes<HTMLButtonElement>;

/** 52 px, radio `--radius-button`, 15 px en peso 500, fondo `--accent` (diseño, Componentes). */
export function BotonPrincipal({ className, type = 'button', ...props }: PropsBoton) {
  return <button type={type} className={['boton', 'boton-principal', className].filter(Boolean).join(' ')} {...props} />;
}
