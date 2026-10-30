import { BotonPrincipal } from './BotonPrincipal';
import { BotonSecundario } from './BotonSecundario';
import { HojaInferior, useHoja } from './HojaInferior';
import './HojaConfirmar.css';

export interface PropsHojaConfirmar {
  titulo: string;
  texto: string;
  /** Acción principal, con fondo ink como "Eliminar prenda" de 03b. */
  confirmar: string;
  cancelar: string;
  alConfirmar: () => void;
  /** Se llama al cerrar la hoja, también después de confirmar. */
  alCerrar: () => void;
}

function Botones({ confirmar, cancelar, alConfirmar }: Pick<PropsHojaConfirmar, 'confirmar' | 'cancelar' | 'alConfirmar'>) {
  const { cerrar } = useHoja();
  return (
    <div className="hoja-confirmar-botones">
      <BotonPrincipal className="boton-tinta" onClick={() => cerrar(alConfirmar)}>
        {confirmar}
      </BotonPrincipal>
      <BotonSecundario onClick={() => cerrar()}>{cancelar}</BotonSecundario>
    </div>
  );
}

/** Hoja de confirmación con el formato de 03b: título de 28 px, explicación y dos botones. */
export function HojaConfirmar({ titulo, texto, confirmar, cancelar, alConfirmar, alCerrar }: PropsHojaConfirmar) {
  return (
    <HojaInferior etiqueta={titulo} alCerrar={alCerrar}>
      <div className="hoja-confirmar">
        <h2 className="t-hoja">{titulo}</h2>
        <p className="hoja-confirmar-texto">{texto}</p>
        <Botones confirmar={confirmar} cancelar={cancelar} alConfirmar={alConfirmar} />
      </div>
    </HojaInferior>
  );
}
