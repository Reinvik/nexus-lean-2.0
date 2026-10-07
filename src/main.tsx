import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Manejador global para chunks desactualizados tras un nuevo deploy
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[Nexus Lean] Fallo de carga de módulo dinámico por nueva versión desplegada. Recargando...', event);
  const reloadKey = 'nexus_preload_error_reload';
  const lastReload = sessionStorage.getItem(reloadKey);
  const now = Date.now();

  if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
    sessionStorage.setItem(reloadKey, now.toString());
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
