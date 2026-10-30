// Configuración de imgly compartida por el hilo principal y el worker (sin DOM).
// publicPath debe ser absoluto: imgly hace `new URL('resources.json', publicPath)`.

export type Modelo = 'isnet_quint8' | 'isnet_fp16';
export type Dispositivo = 'cpu' | 'gpu';

export interface OpcionesMotor {
  modelo: Modelo;
  dispositivo: Dispositivo;
}

export type Progreso = (clave: string, actual: number, total: number) => void;

export const PUBLIC_PATH = new URL('/modelos/imgly/1.7.0/', self.location.origin).href;

export function configImgly(opciones: OpcionesMotor, progreso: Progreso) {
  return {
    publicPath: PUBLIC_PATH,
    model: opciones.modelo,
    device: opciones.dispositivo,
    output: { format: 'image/png' as const, quality: 0.8 },
    progress: progreso,
  };
}
