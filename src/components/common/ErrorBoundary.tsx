import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Nexus Lean ErrorBoundary]:', error, errorInfo);

    // Si el error se debe a desincronización de chunks por nueva versión desplegada
    const isChunkError =
      error.message?.includes('dynamically imported module') ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('Strict MIME type') ||
      error.name === 'ChunkLoadError';

    if (isChunkError) {
      const reloadKey = 'nexus_chunk_error_reload';
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();
      // Si no se ha recargado en los últimos 10 segundos, recarga automática
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem(reloadKey, now.toString());
        window.location.reload();
      }
    }
  }

  private handleReload = () => {
    // Limpiar caches de Service Worker si están disponibles y recargar
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050B14] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-center backdrop-blur-xl shadow-2xl">
            <div className="w-14 h-14 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-cyan-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2 font-outfit">
              Actualización del Sistema
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Se detectó una nueva versión de Nexus Lean o módulos desactualizados en caché.
            </p>
            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-cyan-500/20 active:scale-[0.98]"
            >
              <RefreshCw className="w-4 h-4" />
              Recargar Estación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
