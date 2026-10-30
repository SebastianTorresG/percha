import { useLiveQuery } from 'dexie-react-hooks';
import { HojaInferior, useHoja } from '../componentes/HojaInferior';
import { db } from '../datos/db';
import { useAjustes } from '../datos/repos/ajustes';
import { ID_MEDIDAS } from '../datos/tipos';
import type { EntradaPantalla } from '../navegacion/rutas';
import { useNavegacion } from '../navegacion/useNavegacion';
import { formatearDiaMes, formatearDiaMesAnio } from '../util/fechas';
import './Menu.css';

function Fila({ titulo, subtitulo, destino }: { titulo: string; subtitulo?: string; destino: EntradaPantalla }) {
  const { cerrar } = useHoja();
  const { navegacion } = useNavegacion();
  return (
    <button type="button" className="menu-fila" onClick={() => cerrar(() => navegacion.ir(destino))}>
      <span className="menu-fila-textos">
        <span className="menu-fila-titulo">{titulo}</span>
        {/* Espacio reservado mientras carga, para que la hoja no salte. */}
        <span className="menu-fila-subtitulo">{subtitulo ?? ' '}</span>
      </span>
      <span className="menu-fila-flecha" aria-hidden="true">
        ›
      </span>
    </button>
  );
}

/** "2 fotos · principal: con tenis". Sin maniquíes no está diseñado (desviaciones-diseno.md). */
function subtituloManiquies(datos: { cantidad: number; principal?: string } | undefined): string | undefined {
  if (!datos) return undefined;
  if (datos.cantidad === 0) return 'Todavía no hay fotos';
  const fotos = datos.cantidad === 1 ? '1 foto' : `${datos.cantidad} fotos`;
  return datos.principal ? `${fotos} · principal: ${datos.principal}` : fotos;
}

/** 01c Menú: hoja secundaria del "⋯" de Hoy. */
export default function Menu() {
  const { navegacion } = useNavegacion();
  const ajustes = useAjustes();
  const maniquies = useLiveQuery(async () => {
    const cantidad = await db.maniquies.count();
    const principal = await db.maniquies.where('principal').equals(1).first();
    return { cantidad, principal: principal?.nombre };
  }, []);
  const medidas = useLiveQuery(async () => (await db.medidas.get(ID_MEDIDAS)) ?? null, []);

  const subtituloMedidas =
    medidas === undefined
      ? undefined
      : medidas?.actualizado
        ? `Actualizadas el ${formatearDiaMes(medidas.actualizado)}`
        : 'Todavía sin medidas';
  const subtituloRespaldo =
    ajustes === undefined
      ? undefined
      : ajustes.ultimoRespaldo
        ? `Último respaldo: ${formatearDiaMesAnio(ajustes.ultimoRespaldo)}`
        : 'Todavía no hay respaldo';

  return (
    <HojaInferior etiqueta="Menú" pantalla="01c Menú" alCerrar={() => navegacion.cerrarHoja()}>
      <div className="menu-filas">
        <Fila titulo="Mis maniquíes" subtitulo={subtituloManiquies(maniquies)} destino={{ pantalla: 'misManiquies' }} />
        <Fila titulo="Mis medidas" subtitulo={subtituloMedidas} destino={{ pantalla: 'misMedidas' }} />
        <Fila titulo="Ajustes y respaldo" subtitulo={subtituloRespaldo} destino={{ pantalla: 'ajustes' }} />
      </div>
    </HojaInferior>
  );
}
