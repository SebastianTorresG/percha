import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as EventoTeclado,
  type PointerEvent as EventoPuntero,
  type ReactNode,
} from 'react';
import './HojaInferior.css';

/** Duración de la salida (diseño, Movimiento): la hoja se desmonta al terminar. */
export const SALIDA_MS = 200;
/** Arrastre hacia abajo a partir del cual la hoja se cierra al soltar. */
const UMBRAL_CIERRE_PX = 90;
/** O si se suelta con esta velocidad hacia abajo (px/ms). */
const VELOCIDAD_CIERRE = 0.5;
/** Movimiento mínimo para que un toque cuente como arrastre y no como clic. */
const UMBRAL_ARRASTRE_PX = 6;

const ENFOCABLES =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

interface ContextoHoja {
  /** Cierra con la animación de salida y después, si se pasa, corre `despues`. */
  cerrar: (despues?: () => void) => void;
}

const Contexto = createContext<ContextoHoja | null>(null);

/** Para los botones dentro de una hoja ("Conservarla", filas del menú…). */
export function useHoja(): ContextoHoja {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useHoja se usa dentro de HojaInferior');
  return contexto;
}

export interface PropsHojaInferior {
  /** Nombre accesible del diálogo. */
  etiqueta: string;
  /** Se llama cuando terminó la animación de salida; quien la abrió la quita (por ejemplo `navegacion.cerrarHoja()`). */
  alCerrar: () => void;
  /** `data-screen-label` del diseño, si la hoja es una pantalla (01c Menú, 03b, 05d…). */
  pantalla?: string;
  children: ReactNode;
}

/**
 * Hoja inferior modal: se cierra arrastrando hacia abajo, tocando el scrim o con Escape; atrapa el
 * foco mientras está abierta y lo devuelve al cerrarse. El contenido con scroll propio va dentro de
 * un elemento con `data-hoja-desplazable`.
 */
export function HojaInferior({ etiqueta, alCerrar, pantalla, children }: PropsHojaInferior) {
  const hoja = useRef<HTMLDivElement>(null);
  const [saliendo, setSaliendo] = useState(false);
  const [desplazamiento, setDesplazamiento] = useState(0);
  const [soltando, setSoltando] = useState(false);
  const arrastre = useRef<{ id: number; y0: number; t0: number; ultimoY: number; ultimoT: number; activo: boolean } | null>(null);
  const evitarClic = useRef(false);
  const cerrando = useRef(false);
  const alCerrarActual = useRef(alCerrar);
  alCerrarActual.current = alCerrar;

  const cerrar = useCallback((despues?: () => void) => {
    if (cerrando.current) return;
    cerrando.current = true;
    setSaliendo(true);
    setTimeout(() => {
      alCerrarActual.current();
      despues?.();
    }, SALIDA_MS);
  }, []);

  // Foco: entra a la hoja al abrir y vuelve a donde estaba al cerrar.
  useEffect(() => {
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    hoja.current?.focus({ preventScroll: true });
    return () => anterior?.focus({ preventScroll: true });
  }, []);

  const alTeclear = (evento: EventoTeclado<HTMLDivElement>) => {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      cerrar();
      return;
    }
    if (evento.key !== 'Tab' || !hoja.current) return;
    const enfocables = [...hoja.current.querySelectorAll<HTMLElement>(ENFOCABLES)];
    const primero = enfocables[0];
    const ultimo = enfocables.at(-1);
    if (!primero || !ultimo) {
      evento.preventDefault();
      return;
    }
    if (evento.shiftKey && (document.activeElement === primero || document.activeElement === hoja.current)) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  };

  const alApoyar = (evento: EventoPuntero<HTMLDivElement>) => {
    if (saliendo || !evento.isPrimary) return;
    if ((evento.target as Element).closest('[data-hoja-desplazable], input, textarea, select')) return;
    const ahora = evento.timeStamp;
    arrastre.current = { id: evento.pointerId, y0: evento.clientY, t0: ahora, ultimoY: evento.clientY, ultimoT: ahora, activo: false };
    evitarClic.current = false;
  };

  const alMover = (evento: EventoPuntero<HTMLDivElement>) => {
    const a = arrastre.current;
    if (!a || a.id !== evento.pointerId) return;
    const dy = evento.clientY - a.y0;
    if (!a.activo) {
      if (Math.abs(dy) < UMBRAL_ARRASTRE_PX) return;
      a.activo = true;
      evitarClic.current = true;
      hoja.current?.setPointerCapture(evento.pointerId);
    }
    a.ultimoY = evento.clientY;
    a.ultimoT = evento.timeStamp;
    setSoltando(false);
    setDesplazamiento(Math.max(0, dy));
  };

  const alSoltar = (evento: EventoPuntero<HTMLDivElement>) => {
    const a = arrastre.current;
    arrastre.current = null;
    if (!a || a.id !== evento.pointerId || !a.activo) return;
    const dy = evento.clientY - a.y0;
    const tiempo = Math.max(1, evento.timeStamp - a.t0);
    if (dy > UMBRAL_CIERRE_PX || dy / tiempo > VELOCIDAD_CIERRE) {
      cerrar();
    } else {
      setSoltando(true);
      setDesplazamiento(0);
    }
  };

  return (
    <Contexto.Provider value={{ cerrar }}>
      <div className="hoja-scrim" data-fundido data-saliendo={saliendo || undefined} onClick={() => cerrar()} />
      <div
        ref={hoja}
        className="hoja"
        role="dialog"
        aria-modal="true"
        aria-label={etiqueta}
        tabIndex={-1}
        data-fundido
        data-pantalla={pantalla}
        data-saliendo={saliendo || undefined}
        data-soltando={soltando || undefined}
        // Al cerrar después de arrastrar, la salida parte de donde quedó la hoja.
        style={desplazamiento > 0 ? { transform: `translateY(${desplazamiento}px)` } : undefined}
        onKeyDown={alTeclear}
        onPointerDown={alApoyar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        onClickCapture={(evento) => {
          // Un arrastre que empezó sobre un botón no lo activa al soltar.
          if (evitarClic.current) {
            evitarClic.current = false;
            evento.stopPropagation();
            evento.preventDefault();
          }
        }}
        onTransitionEnd={() => setSoltando(false)}
      >
        <span className="hoja-tirador" aria-hidden="true" />
        {children}
      </div>
    </Contexto.Provider>
  );
}
