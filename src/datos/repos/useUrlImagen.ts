import { useEffect, useState } from 'react';
import { soltarUrl, urlDe } from './imagenes';

/** Object URL de una imagen de la base mientras el componente está montado (research R-9). */
export function useUrlImagen(id: string | undefined): string | undefined {
  const [url, setUrl] = useState<{ id: string; url: string | undefined }>();

  useEffect(() => {
    if (!id) return;
    let vigente = true;
    void urlDe(id).then((nueva) => {
      if (vigente) setUrl({ id, url: nueva });
    });
    return () => {
      vigente = false;
      soltarUrl(id);
    };
  }, [id]);

  // Nunca se devuelve el URL de un id anterior: ya puede estar liberado.
  return url && url.id === id ? url.url : undefined;
}
