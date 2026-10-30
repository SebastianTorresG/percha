// Muestra la pila de navegación (research R-3): todas las pantallas de la pila quedan montadas y solo
// la de arriba se ve, así al volver se conserva su estado y su scroll. La BarraInferior aparece en
// las pestañas, y las hojas inferiores van encima.

import type { ComponentType } from 'react';
import { BarraInferior } from './componentes/BarraInferior';
import PanelDiagnostico from './diagnostico/PanelDiagnostico';
import { esPestana, type EntradaHoja, type NombreHoja, type NombrePantalla } from './navegacion/rutas';
import { useNavegacion } from './navegacion/useNavegacion';
import AgregarPrenda from './pantallas/AgregarPrenda';
import Ajustes from './pantallas/Ajustes';
import Armador from './pantallas/Armador';
import Calendario from './pantallas/Calendario';
import Closet from './pantallas/Closet';
import CrearPlaneada from './pantallas/CrearPlaneada';
import DetallePrenda from './pantallas/DetallePrenda';
import DetalleTaller from './pantallas/DetalleTaller';
import Hoy from './pantallas/Hoy';
import ImportarSilueta from './pantallas/ImportarSilueta';
import Menu from './pantallas/Menu';
import MisManiquies from './pantallas/MisManiquies';
import MisMedidas from './pantallas/MisMedidas';
import MisOutfits from './pantallas/MisOutfits';
import Onboarding from './pantallas/Onboarding';
import Taller from './pantallas/Taller';
import type { PropsPantallaDe } from './pantallas/tipos';
import { useRegistrarServiceWorker } from './pwa/registro';

const PANTALLAS: { [K in NombrePantalla]: ComponentType<PropsPantallaDe<K>> } = {
  hoy: Hoy,
  closet: Closet,
  taller: Taller,
  outfits: MisOutfits,
  detallePrenda: DetallePrenda,
  agregarPrenda: AgregarPrenda,
  armador: Armador,
  calendario: Calendario,
  misManiquies: MisManiquies,
  ajustes: Ajustes,
  onboarding: Onboarding,
  crearPlaneada: CrearPlaneada,
  detalleTaller: DetalleTaller,
  misMedidas: MisMedidas,
  importarSilueta: ImportarSilueta,
  diagnostico: PanelDiagnostico,
};

const HOJAS: { [K in NombreHoja]: ComponentType<{ params: Extract<EntradaHoja, { hoja: K }>['params'] }> } = {
  menu: Menu,
};

export function App() {
  useRegistrarServiceWorker();
  const { pila, hojas, navegacion } = useNavegacion();
  const cima = pila.at(-1)!;

  return (
    <>
      {pila.map((entrada, i) => {
        const Componente = PANTALLAS[entrada.pantalla] as ComponentType<PropsPantallaDe<NombrePantalla>>;
        return <Componente key={`${i}-${entrada.pantalla}`} params={entrada.params} oculta={i < pila.length - 1} />;
      })}
      {esPestana(cima.pantalla) && (
        <BarraInferior
          activa={cima.pantalla}
          alElegir={(pestana) => navegacion.cambiarPestana(pestana)}
          alAgregar={() => navegacion.ir({ pantalla: 'agregarPrenda' })}
        />
      )}
      {hojas.map((hoja, i) => {
        const Hoja = HOJAS[hoja.hoja] as ComponentType<{ params: unknown }>;
        return <Hoja key={`${i}-${hoja.hoja}`} params={hoja.params} />;
      })}
    </>
  );
}
