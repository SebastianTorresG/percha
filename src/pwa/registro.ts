// Registro del service worker en modo "prompt" (research R-7): nunca recarga sola. Ajustes muestra
// "Hay una versión nueva" con `useVersionNueva()` y la usuaria decide cuándo actualizar.

import { useEffect, useSyncExternalStore } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { registrar, registrarError } from '../diagnostico/registro';

export interface EstadoVersion {
  hayVersionNueva: boolean;
  /** Activa la versión nueva y recarga. Solo se llama cuando la usuaria lo pide. */
  actualizar: () => Promise<void>;
}

let estado: EstadoVersion = { hayVersionNueva: false, actualizar: async () => {} };
const oyentes = new Set<() => void>();

function fijar(nuevo: EstadoVersion) {
  estado = nuevo;
  for (const oyente of oyentes) oyente();
}

/** Se usa una sola vez, en App. */
export function useRegistrarServiceWorker(): void {
  const {
    needRefresh: [hayVersionNueva],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(url) {
      registrar('info', `Service worker registrado: ${url}`);
    },
    onRegisterError(error) {
      registrarError(error, 'Registro del service worker');
    },
    onOfflineReady() {
      registrar('info', 'Lista para usar sin conexión');
    },
  });

  useEffect(() => {
    fijar({ hayVersionNueva, actualizar: () => updateServiceWorker(true) });
  }, [hayVersionNueva, updateServiceWorker]);
}

export function useVersionNueva(): EstadoVersion {
  return useSyncExternalStore(
    (oyente) => {
      oyentes.add(oyente);
      return () => oyentes.delete(oyente);
    },
    () => estado,
  );
}

/** Estado del service worker para el panel de diagnóstico. */
export async function estadoServiceWorker(): Promise<string> {
  if (!('serviceWorker' in navigator)) return 'no disponible';
  const registro = await navigator.serviceWorker.getRegistration();
  if (!registro) return 'sin registrar';
  const partes = [
    registro.active && `activo (${registro.active.state})`,
    registro.waiting && 'versión nueva esperando',
    registro.installing && 'instalando',
    navigator.serviceWorker.controller ? 'controla la página' : 'no controla la página',
  ].filter(Boolean);
  return partes.join(' · ');
}
