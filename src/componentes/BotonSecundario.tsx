import type { PropsBoton } from './BotonPrincipal';
import './Boton.css';

/** 52 px, radio `--radius-button`, 15 px, fondo `--chip` (diseño, Componentes). */
export function BotonSecundario({ className, type = 'button', ...props }: PropsBoton) {
  return <button type={type} className={['boton', 'boton-secundario', className].filter(Boolean).join(' ')} {...props} />;
}

/** Acción de texto, como "Eliminar prenda": 44 px, 14 px, subrayada en `--muted` (Percha Sistema). */
export function BotonTexto({ className, type = 'button', ...props }: PropsBoton) {
  return <button type={type} className={['boton', 'boton-texto', className].filter(Boolean).join(' ')} {...props} />;
}
