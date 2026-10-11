import React, { useState } from 'react';
import { ExternalLink, RefreshCw, AlertCircle, Sparkles, Check, Edit2, Layout, Compass } from 'lucide-react';
import { getMiroEmbedUrl, cleanMiroUrl, getMiroLinkType } from '../utils/vsmHelpers';

interface VSMMiroViewerProps {
  miroLink: string;
  onUpdateLink?: (newLink: string) => void;
}

export const VSMMiroViewer: React.FC<VSMMiroViewerProps> = ({ miroLink, onUpdateLink }) => {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputUrl, setInputUrl] = useState(miroLink || '');

  const cleanUrl = cleanMiroUrl(miroLink);
  const embedUrl = getMiroEmbedUrl(miroLink);
  const linkType = getMiroLinkType(miroLink);

  const handleSaveInline = () => {
    const cleaned = cleanMiroUrl(inputUrl);
    if (onUpdateLink) {
      onUpdateLink(cleaned);
    }
    setIsEditing(false);
    setIframeLoaded(false);
  };

  // 1. Estado vacío: Sin enlace configurado
  if (!cleanUrl) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 bg-slate-900 rounded-2xl border border-slate-800 text-center h-full min-h-[480px]">
        <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-amber-500/20">
          <Sparkles size={32} />
        </div>
        <h4 className="font-black text-lg text-white mb-1">
          Sin Tablero de Miro Vinculado
        </h4>
        <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
          Pega el enlace de tu tablero interactivo de Miro para visualizar y editar el mapeo de flujo de valor directamente dentro de Nexus Lean.
        </p>

        {onUpdateLink ? (
          <div className="w-full max-w-md bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-3 text-left">
            <label className="text-[11px] font-bold text-slate-300 block uppercase tracking-wider">
              Pegar enlace de Miro:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://miro.com/app/board/..."
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="button"
                onClick={handleSaveInline}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-lg transition-colors shadow-sm"
              >
                Vincular
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              💡 Ejemplo: <code className="text-amber-300 font-mono">https://miro.com/app/board/uXjVH5DeYd4=/</code>
            </p>
          </div>
        ) : (
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-left text-xs text-slate-300 space-y-1.5 max-w-sm">
            <p className="font-bold text-white">💡 Ejemplo de enlace compatible:</p>
            <code className="text-[11px] text-amber-300 block bg-slate-900 p-2 rounded font-mono break-all border border-slate-800">
              https://miro.com/app/board/uXjVH5DeYd4=/
            </code>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-xl min-h-[550px]">
      {/* Barra de control superior */}
      <div className="bg-slate-800/90 border-b border-slate-700 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              embedUrl ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          ></span>
          <span className="font-black text-xs text-white uppercase tracking-wider">
            {embedUrl ? 'Lienzo Digital Miro' : 'Enlace Vinculado'}
          </span>
          {embedUrl && (
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              (Interactivo con Zoom y Pan)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onUpdateLink && (
            <button
              type="button"
              onClick={() => {
                setInputUrl(cleanUrl);
                setIsEditing(!isEditing);
              }}
              className="px-2.5 py-1 text-slate-300 hover:text-white bg-slate-700/60 hover:bg-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Cambiar enlace de Miro"
            >
              <Edit2 size={12} />
              <span>{isEditing ? 'Cancelar' : 'Cambiar enlace'}</span>
            </button>
          )}

          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-lg transition-colors shadow-sm"
            title="Abrir en pestaña nueva de Miro"
          >
            <ExternalLink size={13} />
            <span>Abrir en Miro ↗</span>
          </a>
        </div>
      </div>

      {/* Editor desplegable inline si está activo */}
      {isEditing && onUpdateLink && (
        <div className="bg-slate-800 border-b border-slate-700 p-3 flex flex-wrap items-center gap-2 animate-in fade-in duration-150">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Pega nuevo enlace: https://miro.com/app/board/..."
            className="flex-1 min-w-[260px] px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            type="button"
            onClick={handleSaveInline}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-sm"
          >
            <Check size={13} />
            <span>Guardar</span>
          </button>
        </div>
      )}

      {/* Área Principal */}
      <div className="flex-1 relative bg-slate-950 min-h-[480px]">
        {embedUrl ? (
          <>
            {!iframeLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-950/80 z-10">
                <RefreshCw size={28} className="animate-spin text-cyan-400 mb-3" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Cargando Tablero Miro...
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Preparando lienzo interactivo
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
        ) : linkType === 'template' ? (
          /* Caso Plantilla Oficial de Miro */
          <div className="flex flex-col items-center justify-center h-full min-h-[480px] p-6 sm:p-10 text-center text-white">
            <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/20">
              <Layout size={32} />
            </div>
            <h4 className="text-base font-bold text-white mb-2">
              Plantilla de Miro Vinculada
            </h4>
            <p className="text-xs text-slate-300 max-w-md mb-6 leading-relaxed">
              El enlace configurado apunta a una plantilla del catálogo público de Miro. Por políticas de seguridad del sitio web de Miro, las páginas de plantillas no permiten incrustación directa en marcos.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <a
                href={cleanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-2"
              >
                <ExternalLink size={15} />
                <span>Abrir Plantilla en Miro ↗</span>
              </a>
            </div>
            {onUpdateLink && (
              <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl max-w-md text-left">
                <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                  💡 ¿Creaste un tablero editable a partir de esta plantilla? Pega su enlace para visualizarlo aquí:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://miro.com/app/board/..."
                    className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleSaveInline}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors"
                  >
                    Vincular
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Caso Enlace Externo */
          <div className="flex flex-col items-center justify-center h-full min-h-[480px] p-6 sm:p-10 text-center text-white">
            <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mb-4 border border-amber-500/20">
              <Compass size={32} />
            </div>
            <h4 className="text-base font-bold text-white mb-2">
              Tablero Vinculado Externamente
            </h4>
            <p className="text-xs text-slate-300 max-w-md mb-6 leading-relaxed">
              El enlace configurado requiere autenticación directa en Miro o no admite incrustación automática en marco.
            </p>
            <a
              href={cleanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-2"
            >
              <ExternalLink size={15} />
              <span>Abrir Enlace en Pestaña Nueva ↗</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default VSMMiroViewer;
