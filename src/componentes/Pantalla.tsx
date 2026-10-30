import type { ReactNode } from 'react';
import './Pantalla.css';

export interface PropsPantalla {
  /** `data-screen-label` del diseño (convención de tasks.md). */
  etiqueta: string;
  /** Deja lugar al final para la BarraInferior (pantallas con pestañas). */
  conBarra?: boolean;
  /** Oculta, con su scroll intacto, cuando hay otra pantalla encima en la pila. */
  oculta?: boolean;
  children: ReactNode;
}

export function Pantalla({ etiqueta, conBarra, oculta, children }: PropsPantalla) {
  return (
    <main className="pantalla" data-pantalla={etiqueta} data-con-barra={conBarra || undefined} hidden={oculta} inert={oculta}>
      {children}
    </main>
  );
}

/** Encabezado de las pestañas: línea de contexto, título de 42 px y una acción a la derecha. */
export function EncabezadoPestana({ meta, titulo, accion }: { meta?: string; titulo: string; accion?: ReactNode }) {
  return (
    <header className="encabezado-pestana">
      <div className="encabezado-pestana-textos">
        {meta && <span className="encabezado-meta">{meta}</span>}
        <h1 className="t-titulo">{titulo}</h1>
      </div>
      {accion}
    </header>
  );
}

/** Barra de las pantallas apiladas: "‹" para volver y una acción opcional (por ejemplo "Editar"). */
export function BarraSuperior({ alVolver, accion }: { alVolver: () => void; accion?: ReactNode }) {
  return (
    <div className="barra-superior">
      <button type="button" className="boton-redondo boton-redondo-volver" aria-label="Volver" onClick={alVolver}>
        ‹
      </button>
      {accion}
    </div>
  );
}

/** Título de 42 px de una pantalla apilada, con un subtítulo opcional. */
export function TituloApilada({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  return (
    <div className="titulo-apilada">
      <h1 className="t-titulo">{titulo}</h1>
      {subtitulo && <span className="t-meta">{subtitulo}</span>}
    </div>
  );
}
