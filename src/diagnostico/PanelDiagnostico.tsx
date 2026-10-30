// Panel de diagnóstico oculto (research R-14): se abre tocando 5 veces la versión en Ajustes.
// Sustituye al Web Inspector en el iPhone: almacenamiento, red, service worker, componentes,
// integridad y los últimos 50 eventos.

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { BotonSecundario } from '../componentes/BotonSecundario';
import { BarraSuperior, Pantalla, TituloApilada } from '../componentes/Pantalla';
import { estaPersistido, estimar, type Estimacion } from '../datos/almacenamiento';
import { verificar } from '../datos/integridad';
import { bytesTotales, urlsVivas } from '../datos/repos/imagenes';
import { useNavegacion } from '../navegacion/useNavegacion';
import type { PropsPantallaDe } from '../pantallas/tipos';
import { estadoServiceWorker } from '../pwa/registro';
import { obtenerEstado, suscribir } from './registro';
import './PanelDiagnostico.css';

function megas(bytes: number): string {
  return `${(bytes / 1024 / 1024).toLocaleString('es', { maximumFractionDigits: 1 })} MB`;
}

function hora(fecha: number): string {
  return new Date(fecha).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function siNo(valor: boolean | null | undefined): string {
  if (valor === null) return 'no se sabe';
  if (valor === undefined) return '…';
  return valor ? 'sí' : 'no';
}

interface Medicion {
  estimacion: Estimacion | null;
  persistido: boolean | null;
  imagenes: number;
  serviceWorker: string;
  aislado: boolean;
  gpu: boolean;
}

export default function PanelDiagnostico({ oculta }: PropsPantallaDe<'diagnostico'>) {
  const { navegacion } = useNavegacion();
  const estado = useSyncExternalStore(suscribir, obtenerEstado);
  const [medicion, setMedicion] = useState<Medicion>();

  const medir = useCallback(async () => {
    const [estimacion, persistido, imagenes, serviceWorker] = await Promise.all([
      estimar(),
      estaPersistido(),
      bytesTotales(),
      estadoServiceWorker(),
    ]);
    setMedicion({
      estimacion,
      persistido,
      imagenes,
      serviceWorker,
      aislado: globalThis.crossOriginIsolated === true,
      gpu: 'gpu' in navigator,
    });
  }, []);

  useEffect(() => {
    if (!oculta) void medir();
  }, [oculta, medir]);

  const integridad = estado.integridad;

  return (
    <Pantalla etiqueta="Diagnóstico" oculta={oculta}>
      <BarraSuperior alVolver={() => navegacion.volver()} />
      <TituloApilada titulo="Diagnóstico" subtitulo={`Percha ${__PERCHA_VERSION__}`} />
      <div className="diagnostico">
        <section className="diagnostico-seccion">
          <h2>Almacenamiento</h2>
          <dl>
            <dt>Usado / cuota</dt>
            <dd>
              {medicion === undefined
                ? '…'
                : medicion.estimacion
                  ? `${megas(medicion.estimacion.usado)} de ${megas(medicion.estimacion.cuota)}`
                  : 'no se sabe'}
            </dd>
            <dt>Imágenes</dt>
            <dd>{medicion ? megas(medicion.imagenes) : '…'}</dd>
            <dt>Protegido</dt>
            <dd>{siNo(medicion?.persistido)}</dd>
            <dt>URLs vivas</dt>
            <dd>{urlsVivas()}</dd>
          </dl>
        </section>

        <section className="diagnostico-seccion">
          <h2>Red y aislamiento</h2>
          <dl>
            <dt>Desde la red</dt>
            <dd>
              página {estado.red.pagina} · workers {estado.red.workers}
            </dd>
            <dt>Otros orígenes</dt>
            <dd>{estado.red.otrosOrigenes}</dd>
            <dt>Últimas</dt>
            <dd>{estado.red.ultimas.length > 0 ? estado.red.ultimas.join(', ') : 'ninguna'}</dd>
            <dt>crossOriginIsolated</dt>
            <dd>{siNo(medicion?.aislado)}</dd>
            <dt>WebGPU</dt>
            <dd>{siNo(medicion?.gpu)}</dd>
            <dt>Service worker</dt>
            <dd>{medicion?.serviceWorker ?? '…'}</dd>
          </dl>
        </section>

        <section className="diagnostico-seccion">
          <h2>Componentes</h2>
          <dl>
            <dt>Recortador</dt>
            <dd>{estado.componentes.recortador ?? 'sin cargar'}</dd>
            <dt>Renderer</dt>
            <dd>{estado.componentes.renderer ?? 'sin cargar'}</dd>
          </dl>
        </section>

        <section className="diagnostico-seccion">
          <h2>Integridad</h2>
          <dl>
            <dt>Imágenes</dt>
            <dd>{integridad?.imagenes ?? '…'}</dd>
            <dt>Sin referencia</dt>
            <dd>{integridad?.huerfanas.length ?? '…'}</dd>
            <dt>Referencias rotas</dt>
            <dd>
              {integridad === undefined
                ? '…'
                : integridad.rotas.length === 0
                  ? 0
                  : integridad.rotas.map((r) => `${r.tabla}.${r.campo} → ${r.ref}`).join(', ')}
            </dd>
            <dt>Revisado</dt>
            <dd>{integridad ? hora(integridad.fecha) : '…'}</dd>
          </dl>
          <BotonSecundario onClick={() => void verificar().then(medir)}>Verificar otra vez</BotonSecundario>
        </section>

        <section className="diagnostico-seccion">
          <h2>Eventos ({estado.eventos.length})</h2>
          <ol className="diagnostico-eventos" reversed>
            {[...estado.eventos].reverse().map((e, i) => (
              <li key={`${e.fecha}-${i}`} data-tipo={e.tipo}>
                {hora(e.fecha)} · {e.tipo} · {e.mensaje}
                {e.ms !== undefined && ` · ${e.ms} ms`}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Pantalla>
  );
}
