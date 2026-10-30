// Corre imgly dentro de un Web Worker, como lo hará la app (research R-1).

import { preload, removeBackground } from '@imgly/background-removal';
import { configImgly, type OpcionesMotor } from './imgly-config';

interface Pedido {
  id: number;
  tipo: 'preparar' | 'recortar';
  opciones: OpcionesMotor;
  foto?: Blob;
}

self.onmessage = async (evento: MessageEvent<Pedido>) => {
  const { id, tipo, opciones, foto } = evento.data;
  const config = configImgly(opciones, (clave, actual, total) =>
    self.postMessage({ id, tipo: 'progreso', clave, actual, total }),
  );
  try {
    if (tipo === 'preparar') {
      await preload(config);
      self.postMessage({ id, tipo: 'listo' });
    } else {
      const resultado = await removeBackground(foto!, config);
      self.postMessage({ id, tipo: 'listo', resultado });
    }
  } catch (error) {
    self.postMessage({ id, tipo: 'error', mensaje: error instanceof Error ? error.message : String(error) });
  }
};
