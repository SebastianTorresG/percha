import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { BotonPrincipal } from '../componentes/BotonPrincipal';
import { BotonSecundario, BotonTexto } from '../componentes/BotonSecundario';
import { HojaConfirmar } from '../componentes/HojaConfirmar';
import { BarraSuperior, Pantalla, TituloApilada } from '../componentes/Pantalla';
import { estaPersistido, estimar } from '../datos/almacenamiento';
import { db } from '../datos/db';
import { useAjustes } from '../datos/repos/ajustes';
import { bytesTotales } from '../datos/repos/imagenes';
import { obtenerUltimo, useRespaldoAuto } from '../datos/repos/respaldos-auto';
import { registrarError } from '../diagnostico/registro';
import { useNavegacion } from '../navegacion/useNavegacion';
import { useVersionNueva } from '../pwa/registro';
import { ErrorRespaldo } from '../respaldo/errores';
import { archivoRespaldoAuto, entregar } from '../respaldo/exportar';
import {
  hayDatos,
  importar,
  leerRespaldo,
  mensajeConfirmacion,
  mensajeRestaurar,
  restaurarRespaldoAuto,
  type RespaldoLeido,
} from '../respaldo/importar';
import { useExportar } from '../respaldo/useExportar';
import { formatearDiaMesAnio } from '../util/fechas';
import type { PropsPantallaDe } from './tipos';
import './Ajustes.css';

/** Toques seguidos sobre la versión que abren el panel de diagnóstico (research R-14). */
const TOQUES_DIAGNOSTICO = 5;
const VENTANA_TOQUES_MS = 2000;

const MENSAJE_IMPORTAR_GENERICO = 'No se pudo importar el respaldo. Tus datos no cambiaron.';

type EstadoImportar =
  | { fase: 'inactivo' }
  | { fase: 'revisando' }
  | { fase: 'confirmar'; leido: RespaldoLeido }
  | { fase: 'confirmarRestaurar'; creado: number }
  | { fase: 'importando' }
  | { fase: 'hecho'; mensaje: string }
  | { fase: 'error'; mensaje: string };

function megas(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return `${mb.toLocaleString('es', { maximumFractionDigits: mb < 10 ? 1 : 0 })} MB`;
}

const contar = (n: number, singular: string, plural: string) => `${n} ${n === 1 ? singular : plural}`;

function mensajeDe(error: unknown, contexto: string): string {
  if (error instanceof ErrorRespaldo) return error.message;
  registrarError(error, contexto);
  return MENSAJE_IMPORTAR_GENERICO;
}

/** Respaldo (09): último respaldo, Exportar e Importar, y la copia automática si existe. */
function TarjetaRespaldo({ ultimoRespaldo }: { ultimoRespaldo: number | undefined }) {
  const exportacion = useExportar();
  const auto = useRespaldoAuto();
  const [estado, setEstado] = useState<EstadoImportar>({ fase: 'inactivo' });
  const [mensajeAuto, setMensajeAuto] = useState<string>();
  const [exportandoAuto, setExportandoAuto] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  const ocupado =
    exportacion.estado.fase === 'preparando' || estado.fase === 'revisando' || estado.fase === 'importando';

  const ejecutar = async (accion: () => Promise<void>, hecho: string) => {
    setEstado({ fase: 'importando' });
    try {
      await accion();
      setEstado({ fase: 'hecho', mensaje: hecho });
    } catch (error) {
      setEstado({ fase: 'error', mensaje: mensajeDe(error, 'Importar respaldo') });
    }
  };

  const alElegir = async (evento: ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    // Para poder elegir el mismo archivo otra vez.
    evento.target.value = '';
    if (!archivo) return;
    setEstado({ fase: 'revisando' });
    try {
      const leido = await leerRespaldo(archivo);
      const hecho = `Listo: se restauró el respaldo del ${formatearDiaMesAnio(leido.creado)}.`;
      if (await hayDatos()) setEstado({ fase: 'confirmar', leido });
      else await ejecutar(() => importar(leido), hecho);
    } catch (error) {
      setEstado({ fase: 'error', mensaje: mensajeDe(error, 'Revisar respaldo') });
    }
  };

  // Un segundo toque mientras la hoja de compartir está abierta haría fallar `share` (InvalidStateError).
  const exportarAuto = async () => {
    setMensajeAuto(undefined);
    setExportandoAuto(true);
    try {
      const ultimo = await obtenerUltimo();
      if (!ultimo) return;
      const resultado = await entregar(archivoRespaldoAuto(ultimo), { marcar: false });
      if (resultado === 'necesita_toque') setMensajeAuto('Vuelve a tocar "Exportarlo" para guardar la copia.');
    } catch (error) {
      registrarError(error, 'Exportar respaldo automático');
      setMensajeAuto('No se pudo exportar la copia automática. Vuelve a intentarlo.');
    } finally {
      setExportandoAuto(false);
    }
  };

  // Lo que está pasando primero: mientras se revisa o se importa, un archivo listo de antes espera.
  let mensaje: string | undefined;
  if (estado.fase === 'revisando') mensaje = 'Revisando el respaldo…';
  else if (estado.fase === 'importando') mensaje = 'Importando… No cierres Percha.';
  else if (exportacion.estado.fase === 'listo') mensaje = 'Tu respaldo está listo. Tócalo para guardarlo en Archivos o iCloud.';
  else if (exportacion.estado.fase === 'error') mensaje = exportacion.estado.mensaje;
  else if (estado.fase === 'hecho' || estado.fase === 'error') mensaje = estado.mensaje;

  return (
    <section className="ajustes-tarjeta" aria-labelledby="ajustes-respaldo">
      <h2 id="ajustes-respaldo" className="ajustes-etiqueta">
        Respaldo
      </h2>
      <p className="ajustes-texto">
        {ultimoRespaldo === undefined ? 'Todavía no hay respaldo.' : `Último respaldo: ${formatearDiaMesAnio(ultimoRespaldo)}.`} Guárdalo
        en Archivos o iCloud para no perder tu clóset.
      </p>
      <div className="ajustes-botones">
        {exportacion.estado.fase === 'listo' ? (
          <BotonPrincipal className="ajustes-exportar" onClick={() => void exportacion.guardar()} disabled={ocupado}>
            Guardar respaldo
          </BotonPrincipal>
        ) : (
          <BotonPrincipal className="ajustes-exportar" onClick={() => void exportacion.exportar()} disabled={ocupado}>
            {exportacion.estado.fase === 'preparando' ? 'Preparando…' : 'Exportar'}
          </BotonPrincipal>
        )}
        <BotonSecundario className="ajustes-importar" onClick={() => entrada.current?.click()} disabled={ocupado}>
          Importar
        </BotonSecundario>
      </div>
      <input ref={entrada} type="file" accept=".zip,application/zip" hidden onChange={(e) => void alElegir(e)} />
      {mensaje && (
        <p className="ajustes-mensaje" role="status">
          {mensaje}
        </p>
      )}

      {auto && (
        <div className="ajustes-auto">
          <p className="t-meta">
            Antes de importar se guardó una copia automática de lo que había ({megas(auto.bytes)}).
          </p>
          <BotonTexto onClick={() => setEstado({ fase: 'confirmarRestaurar', creado: auto.creado })} disabled={ocupado}>
            Restaurar el respaldo automático del {formatearDiaMesAnio(auto.creado)}
          </BotonTexto>
          <BotonTexto onClick={() => void exportarAuto()} disabled={ocupado || exportandoAuto}>
            Exportarlo
          </BotonTexto>
          {mensajeAuto && (
            <p className="t-meta" role="status">
              {mensajeAuto}
            </p>
          )}
        </div>
      )}

      {estado.fase === 'confirmar' && (
        <HojaConfirmar
          titulo="¿Reemplazar todo con este respaldo?"
          texto={mensajeConfirmacion(estado.leido)}
          confirmar="Reemplazar todo"
          cancelar="Cancelar"
          alConfirmar={() => {
            const { leido } = estado;
            void ejecutar(() => importar(leido), `Listo: se restauró el respaldo del ${formatearDiaMesAnio(leido.creado)}.`);
          }}
          alCerrar={() => setEstado((actual) => (actual.fase === 'confirmar' ? { fase: 'inactivo' } : actual))}
        />
      )}
      {estado.fase === 'confirmarRestaurar' && (
        <HojaConfirmar
          titulo="¿Restaurar la copia automática?"
          texto={mensajeRestaurar(estado.creado)}
          confirmar="Restaurar"
          cancelar="Cancelar"
          alConfirmar={() => {
            const fecha = formatearDiaMesAnio(estado.creado);
            void ejecutar(restaurarRespaldoAuto, `Listo: se restauró la copia automática del ${fecha}.`);
          }}
          alCerrar={() => setEstado((actual) => (actual.fase === 'confirmarRestaurar' ? { fase: 'inactivo' } : actual))}
        />
      )}
    </section>
  );
}

/** Espacio (FR-006): lo que usa Percha, con las fotos y la copia automática en la barra. */
function TarjetaEspacio({ oculta }: { oculta: boolean }) {
  const datos = useLiveQuery(
    async () => ({
      prendas: await db.prendas.count(),
      outfits: await db.outfits.count(),
      maniquies: await db.maniquies.count(),
      fotos: await bytesTotales(),
    }),
    [],
  );
  const auto = useRespaldoAuto();
  const [almacen, setAlmacen] = useState<{ usado: number | null; protegido: boolean | null }>();

  // Se vuelve a medir al abrir Ajustes y cuando cambian los datos o la copia automática.
  useEffect(() => {
    if (oculta) return;
    let vigente = true;
    void Promise.all([estimar(), estaPersistido()]).then(([estimacion, protegido]) => {
      if (vigente) setAlmacen({ usado: estimacion?.usado ?? null, protegido });
    });
    return () => {
      vigente = false;
    };
  }, [oculta, datos, auto]);

  const fotos = datos?.fotos ?? 0;
  const copia = auto?.bytes ?? 0;
  const usado = almacen?.usado ?? fotos + copia;
  const total = Math.max(usado, fotos + copia, 1);
  const porcentaje = (bytes: number) => `${((bytes / total) * 100).toFixed(1)}%`;

  return (
    <section className="ajustes-tarjeta ajustes-espacio" aria-labelledby="ajustes-espacio">
      <div className="ajustes-espacio-fila">
        <h2 id="ajustes-espacio" className="ajustes-etiqueta">
          Espacio
        </h2>
        <span>{datos && almacen ? megas(usado) : '…'}</span>
      </div>
      <div
        className="ajustes-barra"
        role="img"
        aria-label={`Fotos: ${megas(fotos)}${copia > 0 ? `; copia automática: ${megas(copia)}` : ''}`}
      >
        <span className="ajustes-barra-fotos" style={{ width: porcentaje(fotos) }} />
        <span className="ajustes-barra-copia" style={{ width: porcentaje(copia) }} />
      </div>
      <p className="t-meta">
        {datos
          ? `${contar(datos.prendas, 'prenda', 'prendas')} · ${contar(datos.outfits, 'outfit', 'outfits')} · ${contar(datos.maniquies, 'maniquí', 'maniquíes')}`
          : ' '}
      </p>
      {almacen && almacen.protegido !== null && (
        <p className="t-meta">Almacenamiento protegido: {almacen.protegido ? 'sí' : 'no'}</p>
      )}
    </section>
  );
}

/** 09 Ajustes. Apariencia y la dedicatoria llegan con US10 (T154 y T156). */
export default function Ajustes({ oculta }: PropsPantallaDe<'ajustes'>) {
  const { navegacion } = useNavegacion();
  const ajustes = useAjustes();
  const { hayVersionNueva, actualizar } = useVersionNueva();
  const toques = useRef<number[]>([]);

  const alTocarVersion = () => {
    const ahora = Date.now();
    toques.current = [...toques.current.filter((t) => ahora - t < VENTANA_TOQUES_MS), ahora];
    if (toques.current.length >= TOQUES_DIAGNOSTICO) {
      toques.current = [];
      navegacion.ir({ pantalla: 'diagnostico' });
    }
  };

  return (
    <Pantalla etiqueta="09 Ajustes" oculta={oculta}>
      <BarraSuperior alVolver={() => navegacion.volver()} />
      <TituloApilada titulo="Ajustes" />
      {ajustes && <TarjetaRespaldo ultimoRespaldo={ajustes.ultimoRespaldo} />}
      <TarjetaEspacio oculta={oculta} />
      <nav className="ajustes-tarjeta ajustes-lista" aria-label="Más ajustes">
        <button type="button" className="ajustes-fila" onClick={() => navegacion.ir({ pantalla: 'misManiquies' })}>
          <span>Mis maniquíes</span>
          <span className="ajustes-fila-flecha" aria-hidden="true">
            ›
          </span>
        </button>
        <button type="button" className="ajustes-fila" onClick={() => navegacion.ir({ pantalla: 'misMedidas' })}>
          <span>Mis medidas</span>
          <span className="ajustes-fila-flecha" aria-hidden="true">
            ›
          </span>
        </button>
      </nav>
      {hayVersionNueva && (
        <section className="ajustes-tarjeta" aria-label="Versión nueva">
          <p className="ajustes-texto">Hay una versión nueva de Percha.</p>
          <BotonSecundario onClick={() => void actualizar()}>Actualizar</BotonSecundario>
        </section>
      )}
      <button type="button" className="ajustes-version t-meta" onClick={alTocarVersion}>
        Percha {__PERCHA_VERSION__}
      </button>
    </Pantalla>
  );
}
