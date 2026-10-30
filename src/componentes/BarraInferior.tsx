import type { Pestana } from '../navegacion/rutas';
import './BarraInferior.css';

const ETIQUETAS: Record<Pestana, string> = {
  hoy: 'Hoy',
  closet: 'Clóset',
  taller: 'Taller',
  outfits: 'Outfits',
};

export interface PropsBarraInferior {
  activa: Pestana;
  alElegir: (pestana: Pestana) => void;
  /** El "+" abre Agregar prenda. */
  alAgregar: () => void;
}

function Pestanas({ pestanas, activa, alElegir }: { pestanas: Pestana[] } & Omit<PropsBarraInferior, 'alAgregar'>) {
  return pestanas.map((p) => (
    <button
      key={p}
      type="button"
      className="barra-inferior-pestana"
      aria-current={p === activa ? 'page' : undefined}
      onClick={() => alElegir(p)}
    >
      {ETIQUETAS[p]}
    </button>
  ));
}

/** Hoy · Clóset · (+) · Taller · Outfits (diseño, Navegación). */
export function BarraInferior({ activa, alElegir, alAgregar }: PropsBarraInferior) {
  return (
    <nav className="barra-inferior" aria-label="Secciones">
      <Pestanas pestanas={['hoy', 'closet']} activa={activa} alElegir={alElegir} />
      <span className="barra-inferior-celda-mas">
        <button type="button" className="barra-inferior-mas" aria-label="Agregar prenda" onClick={alAgregar}>
          +
        </button>
      </span>
      <Pestanas pestanas={['taller', 'outfits']} activa={activa} alElegir={alElegir} />
    </nav>
  );
}
