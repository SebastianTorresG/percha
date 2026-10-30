// Arranque de Percha: tema y fuentes, captura de errores para el diagnóstico, base de datos,
// persistencia, integridad y la pila de navegación.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './tema/tokens.css';
import './tema/base.css';
import './tema/fuentes';
import { App } from './App';
import { pedirPersistencia } from './datos/almacenamiento';
import { db } from './datos/db';
import { verificar } from './datos/integridad';
import { instalarCapturas, registrar, registrarError } from './diagnostico/registro';
import { ErrorBase } from './ErrorBase';
import { almacenDeSesion, historialDelNavegador, Navegacion } from './navegacion/pila';
import { ProveedorNavegacion } from './navegacion/useNavegacion';
import { escucharSistema, sincronizarApariencia } from './tema/apariencia';

instalarCapturas();
escucharSistema();

const raiz = createRoot(document.getElementById('raiz')!);

async function arrancar() {
  try {
    await db.open();
  } catch (error) {
    registrarError(error, 'Abrir la base');
    raiz.render(<ErrorBase error={error} />);
    return;
  }

  // US10 decide aquí si se empieza por el onboarding.
  const navegacion = new Navegacion(historialDelNavegador(), { pantalla: 'hoy' }, almacenDeSesion());
  raiz.render(
    <StrictMode>
      <ProveedorNavegacion navegacion={navegacion}>
        <App />
      </ProveedorNavegacion>
    </StrictMode>,
  );

  // Nada de esto bloquea la interfaz ni puede impedir que la app abra.
  await sincronizarApariencia().catch((error: unknown) => registrarError(error, 'Apariencia'));
  const persistido = await pedirPersistencia();
  registrar('info', `Almacenamiento protegido: ${persistido === null ? 'no se sabe' : persistido ? 'sí' : 'no'}`);
  await verificar().catch((error: unknown) => registrarError(error, 'Verificar integridad'));
}

void arrancar();
