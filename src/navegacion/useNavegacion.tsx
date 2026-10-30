import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { EstadoNavegacion, Navegacion } from './pila';

const ContextoNavegacion = createContext<Navegacion | null>(null);

export function ProveedorNavegacion({ navegacion, children }: { navegacion: Navegacion; children: ReactNode }) {
  return <ContextoNavegacion.Provider value={navegacion}>{children}</ContextoNavegacion.Provider>;
}

export interface UsoNavegacion extends EstadoNavegacion {
  navegacion: Navegacion;
}

/** Estado de la pila y sus acciones (`navegacion.ir`, `volver`, `abrirHoja`…). */
export function useNavegacion(): UsoNavegacion {
  const navegacion = useContext(ContextoNavegacion);
  if (!navegacion) throw new Error('useNavegacion se usa dentro de ProveedorNavegacion');
  const estado = useSyncExternalStore(
    (oyente) => navegacion.suscribir(oyente),
    () => navegacion.estado(),
  );
  return { ...estado, navegacion };
}
