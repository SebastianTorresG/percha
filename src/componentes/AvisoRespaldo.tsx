import { textoRecordatorio } from '../respaldo/recordatorio';
import { useExportar } from '../respaldo/useExportar';
import './AvisoRespaldo.css';

/**
 * Aviso suave de respaldo de 01b: texto secundario y la acción "Respaldar", que exporta ahí mismo.
 * "Preparando…", el segundo toque y el error no están diseñados (desviaciones-diseno.md).
 */
export function AvisoRespaldo({ ultimoRespaldo, hoy }: { ultimoRespaldo: number | undefined; hoy: Date }) {
  const { estado, exportar, guardar } = useExportar();

  let texto = textoRecordatorio(ultimoRespaldo, hoy);
  let accion = 'Respaldar';
  let alTocar = exportar;
  if (estado.fase === 'listo') {
    texto = 'Tu respaldo está listo.';
    accion = 'Guardarlo';
    alTocar = guardar;
  } else if (estado.fase === 'error') {
    texto = estado.mensaje;
  }

  return (
    <div className="aviso-respaldo" role="status">
      <span className="aviso-respaldo-texto">{texto}</span>
      <button type="button" className="aviso-respaldo-accion" onClick={() => void alTocar()} disabled={estado.fase === 'preparando'}>
        {estado.fase === 'preparando' ? 'Preparando…' : accion}
      </button>
    </div>
  );
}
