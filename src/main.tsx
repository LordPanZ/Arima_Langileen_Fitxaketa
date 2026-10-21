import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import { initI18n } from './i18n';
import { App } from './app/App';
import { createAppServices } from './app/services';

initI18n();

const root = createRoot(document.getElementById('root') as HTMLElement);

try {
  const services = await createAppServices();
  root.render(
    <StrictMode>
      <App services={services} />
    </StrictMode>,
  );
  if (services.config.mode !== 'emulators') registerSW({ immediate: true });
} catch (err) {
  // Error de configuración: se muestra en claro en vez de una pantalla en blanco.
  root.render(
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>ARIMA FICHA</h1>
      <p>Error de configuración / Konfigurazio errorea:</p>
      <pre>{err instanceof Error ? err.message : String(err)}</pre>
    </main>,
  );
}
