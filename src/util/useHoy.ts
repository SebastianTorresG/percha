// "Hoy" que cambia solo: a la medianoche y al volver a la app (iOS deja la PWA suspendida días
// enteros y al volver la fecha tiene que ser la de ese momento).

import { useEffect, useState } from 'react';
import { fechaLocal } from './fechas';

export function useHoy(): Date {
  const [hoy, setHoy] = useState(() => new Date());

  useEffect(() => {
    const actualizar = () =>
      setHoy((anterior) => {
        const ahora = new Date();
        return fechaLocal(ahora) === fechaLocal(anterior) ? anterior : ahora;
      });
    const manana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
    const temporizador = setTimeout(actualizar, manana.getTime() - Date.now() + 1000);
    document.addEventListener('visibilitychange', actualizar);
    return () => {
      clearTimeout(temporizador);
      document.removeEventListener('visibilitychange', actualizar);
    };
  }, [hoy]);

  return hoy;
}
