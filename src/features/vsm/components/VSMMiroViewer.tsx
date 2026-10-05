import React, { useState } from 'react';
import { ExternalLink, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { getMiroEmbedUrl } from '../utils/vsmHelpers';

interface VSMMiroViewerProps {
  miroLink: string;
  onUpdateLink?: (newLink: string) => void;
}

export const VSMMiroViewer: React.FC<VSMMiroViewerProps> = ({ miroLink }) => {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const embedUrl = getMiroEmbedUrl(miroLink);

  if (!miroLink || !miroLink.trim()) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 text-center h-full min-h-[450px]">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
          <Sparkles size={32} />
        </div>
        <h4 className="font-black text-lg text-slate-800 mb-1">
          Sin Tablero de Miro Vinculado
        </h4>
        <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
          Pega el enlace de tu tablero de Miro en el campo de configuración lateral para visualizar el mapeo interactivo directamente dentro de esta pestaña.
        </p>
        <div className="bg-white p-3 rounded-xl border border-slate-200 text-left text-xs text-slate-600 space-y-1.5 max-w-sm">
          <p className="font-bold text-slate-800">💡 Ejemplo de enlace compatible:</p>
          <code className="text-[11px] text-blue-600 block bg-slate-50 p-1.5 rounded font-mono break-all">
            https://miro.com/app/board/uXjVH5DeYd4=/
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-xl min-h-[550px]">
      {/* Top Controller Bar */}
      <div className="bg-slate-800/90 border-b border-slate-700 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-black text-xs text-white uppercase tracking-wider">
            Lienzo Digital Miro
          </span>
          <span className="text-[10px] text-slate-400 hidden sm:inline">
            (Interactivo con Zoom y Pan)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={miroLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-lg transition-colors shadow-sm"
          >
            <ExternalLink size={13} />
            <span>Abrir en Miro ↗</span>
          </a>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative bg-slate-950 min-h-[480px]">
        {embedUrl ? (
          <>
            {!iframeLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-950/80 z-10">
                <RefreshCw size={28} className="animate-spin text-cyan-400 mb-3" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Cargando Tablero Miro...
                </span>
              </div>
            )}
            <iframe
              src={embedUrl}
              title="Miro Board"
              className="w-full h-full min-h-[520px] border-none"
              allow="fullscreen; clipboard-read; clipboard-write"
              onLoad={() => setIframeLoaded(true)}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[480px] p-8 text-center text-white">
            <AlertCircle size={44} className="text-amber-400 mb-3" />
            <h4 className="text-base font-bold text-white mb-2">
              Tablero Vinculado Externamente
            </h4>
            <p className="text-xs text-slate-300 max-w-md mb-6 leading-relaxed">
              El enlace configurado requiere autenticación directa en Miro o no admite incrustación automática por políticas de seguridad de la cuenta.
            </p>
            <a
              href={miroLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
            >
              <ExternalLink size={15} />
              <span>Abrir Tablero en Miro</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
