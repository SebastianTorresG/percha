// Dos formas de correr imgly para compararlas en el iPhone: en un Web Worker (lo que usará
// la app) o en el hilo principal (por si el worker no funciona en Safari de iOS).

import { configImgly, type OpcionesMotor, type Progreso } from './imgly-config';

export type Hilo = 'worker' | 'principal';

export interface Motor {
  preparar(opciones: OpcionesMotor, progreso: Progreso): Promise<void>;
  recortar(foto: Blob, opciones: OpcionesMotor, progreso: Progreso): Promise<Blob>;
  /** Descarta la sesión cargada para medir un arranque en frío. En el hilo principal no se puede. */
  reiniciar(): boolean;
}

interface Pendiente {
  progreso: Progreso;
  resolver: (resultado?: Blob) => void;
  rechazar: (error: Error) => void;
}

// imgly guarda en memoria el módulo de ONNX Runtime que cargó primero (CPU o WebGPU) y no lo
// cambia después. Para pasar de CPU a GPU hay que empezar con un módulo nuevo.
class MotorWorker implements Motor {
  private worker: Worker | null = null;
  private dispositivo: OpcionesMotor['dispositivo'] | null = null;
  private siguienteId = 1;
  private pendientes = new Map<number, Pendiente>();

  private obtenerWorker(dispositivo: OpcionesMotor['dispositivo']): Worker {
    if (this.worker && this.dispositivo !== dispositivo) this.reiniciar();
    this.dispositivo = dispositivo;
    if (this.worker) return this.worker;
    const worker = new Worker(new URL('./recorte.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (evento) => {
      const { id, tipo } = evento.data;
      const pendiente = this.pendientes.get(id);
      if (!pendiente) return;
      if (tipo === 'progreso') {
        pendiente.progreso(evento.data.clave, evento.data.actual, evento.data.total);
        return;
      }
      this.pendientes.delete(id);
      if (tipo === 'listo') pendiente.resolver(evento.data.resultado);
      else pendiente.rechazar(new Error(evento.data.mensaje));
    };
    worker.onerror = (evento) => {
      const error = new Error(`El worker falló: ${evento.message || 'sin mensaje (¿cierre por memoria?)'}`);
      for (const pendiente of this.pendientes.values()) pendiente.rechazar(error);
      this.pendientes.clear();
      worker.terminate();
      this.worker = null;
    };
    this.worker = worker;
    return worker;
  }

  private pedir(tipo: 'preparar' | 'recortar', opciones: OpcionesMotor, progreso: Progreso, foto?: Blob) {
    const id = this.siguienteId++;
    // Primero el worker: si hay que reiniciarlo, no debe anular este pedido.
    const worker = this.obtenerWorker(opciones.dispositivo);
    return new Promise<Blob | undefined>((resolver, rechazar) => {
      this.pendientes.set(id, { progreso, resolver, rechazar });
      worker.postMessage({ id, tipo, opciones, foto });
    });
  }

  async preparar(opciones: OpcionesMotor, progreso: Progreso) {
    await this.pedir('preparar', opciones, progreso);
  }

  async recortar(foto: Blob, opciones: OpcionesMotor, progreso: Progreso) {
    return (await this.pedir('recortar', opciones, progreso, foto))!;
  }

  reiniciar() {
    this.worker?.terminate();
    this.worker = null;
    for (const pendiente of this.pendientes.values()) pendiente.rechazar(new Error('Worker reiniciado'));
    this.pendientes.clear();
    return true;
  }
}

class MotorPrincipal implements Motor {
  private dispositivo: OpcionesMotor['dispositivo'] | null = null;

  private async imgly(dispositivo: OpcionesMotor['dispositivo']) {
    if (this.dispositivo && this.dispositivo !== dispositivo) {
      throw new Error(
        'En el hilo principal no se puede cambiar entre CPU y GPU: cierra la app desde el selector de apps y ábrela otra vez.',
      );
    }
    this.dispositivo = dispositivo;
    return import('@imgly/background-removal');
  }

  async preparar(opciones: OpcionesMotor, progreso: Progreso) {
    const { preload } = await this.imgly(opciones.dispositivo);
    await preload(configImgly(opciones, progreso));
  }

  async recortar(foto: Blob, opciones: OpcionesMotor, progreso: Progreso) {
    const { removeBackground } = await this.imgly(opciones.dispositivo);
    return removeBackground(foto, configImgly(opciones, progreso));
  }

  reiniciar() {
    return false;
  }
}

const motores: Record<Hilo, Motor> = { worker: new MotorWorker(), principal: new MotorPrincipal() };

export const motorDe = (hilo: Hilo) => motores[hilo];
