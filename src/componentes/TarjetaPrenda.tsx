import { useUrlImagen } from '../datos/repos/useUrlImagen';
import './TarjetaPrenda.css';

export type VarianteTarjeta = 'normal' | 'hecha' | 'planeada';

export interface PropsTarjetaPrenda {
  /** Miniatura PNG de la prenda (≤ 360 px). */
  miniaturaId: string;
  nombre?: string;
  usos: number;
  variante?: VarianteTarjeta;
  /** Reemplaza "Usada N×" (por ejemplo, en el Taller). */
  detalle?: string;
  alTocar?: () => void;
}

const MARCA: Record<Exclude<VarianteTarjeta, 'normal'>, string> = {
  hecha: 'hecho por mí',
  planeada: 'planeada',
};

/** Tarjeta de la grilla: surface + tile cuadrado con `--tile-bg`, el PNG con `--cutout-filter`. */
export function TarjetaPrenda({ miniaturaId, nombre, usos, variante = 'normal', detalle, alTocar }: PropsTarjetaPrenda) {
  const url = useUrlImagen(miniaturaId);
  return (
    <button type="button" className="tarjeta-prenda" onClick={alTocar}>
      <span className="tarjeta-prenda-tile">
        {url && <img src={url} alt="" loading="lazy" decoding="async" />}
        {variante !== 'normal' && (
          <span className={`tarjeta-prenda-marca tarjeta-prenda-marca-${variante}`}>{MARCA[variante]}</span>
        )}
      </span>
      <span className="tarjeta-prenda-texto">
        {nombre && <span className="tarjeta-prenda-nombre">{nombre}</span>}
        <span className="tarjeta-prenda-detalle">{detalle ?? `Usada ${usos}×`}</span>
      </span>
    </button>
  );
}
