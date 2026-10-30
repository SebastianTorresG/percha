import { Pantalla } from './componentes/Pantalla';

/**
 * Si la base no se pudo abrir (por ejemplo, una migración que falló y Dexie revirtió), no se muestra
 * la app: cualquier escritura podría empeorar las cosas. Estado no diseñado (desviaciones-diseno.md).
 */
export function ErrorBase({ error }: { error: unknown }) {
  const detalle = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return (
    <Pantalla etiqueta="Error al abrir">
      <div
        style={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 'var(--espacio-8)',
          padding: '0 var(--margen-texto)',
          textAlign: 'center',
        }}
      >
        <h1 className="t-detalle">No se pudo abrir tu clóset</h1>
        <p className="t-cuerpo" style={{ margin: 0, color: 'var(--muted)' }}>
          Cierra Percha y vuelve a abrirla. Si sigue pasando, no la borres: tus prendas pueden seguir guardadas en el
          teléfono.
        </p>
        <p className="t-meta" style={{ margin: 0, overflowWrap: 'anywhere' }}>
          {detalle}
        </p>
      </div>
    </Pantalla>
  );
}
