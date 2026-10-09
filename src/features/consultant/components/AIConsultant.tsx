import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Brain,
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Info,
  MessageSquare,
  Send,
  ArrowRightCircle,
  ListTodo,
  Maximize2,
  Minimize2,
  Calendar,
  History,
} from 'lucide-react';
import {
  prepareCompanyData,
  generateAIInsight,
  sendChatMessage,
} from '../../../services/geminiService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface AIConsultantProps {
  data: {
    fiveS?: any[];
    quickWins?: any[];
    vsms?: any[];
    a3?: any[];
    auditLogs?: any[];
    [key: string]: any;
  };
  companyName: string;
  apiKey?: string;
  fullScreen?: boolean;
  isSyncing?: boolean;
  fetchError?: string | null;
}

export const AIConsultant: React.FC<AIConsultantProps> = ({
  data,
  companyName,
  apiKey,
  fullScreen = false,
  isSyncing = false,
  fetchError = null,
}) => {
  const [insight, setInsight] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [showCoaching, setShowCoaching] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Chat State
  const [activeTab, setActiveTab] = useState<'analysis' | 'progress' | 'chat'>('analysis');
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // API Key Management
  const [customApiKey, setCustomApiKey] = useState(
    localStorage.getItem('gemini_api_key') || ''
  );
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempKey, setTempKey] = useState('');

  const effectiveApiKey = customApiKey || apiKey || '';

  const saveApiKey = (key: string) => {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem('gemini_api_key', trimmed);
      setCustomApiKey(trimmed);
      setShowKeyInput(false);
      setTempKey('');
      setError(null);
    }
  };

  // Historical data calculation for the last 12 weeks
  const processedHistory = useMemo(() => {
    if (!data) return [];

    const allDates = [
      ...(data.fiveS || []).map((d: any) => d.createdAt || d.date || d.created_at),
      ...(data.quickWins || []).map((d: any) => d.date || d.created_at),
      ...(data.a3 || []).map((d: any) => d.created_at),
    ]
      .filter((d) => Boolean(d))
      .map((d) => new Date(d).getTime())
      .filter((t) => !isNaN(t));

    if (allDates.length === 0) return [];

    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date();
    const weeks: any[] = [];

    const currentDate = new Date(minDate);
    currentDate.setDate(currentDate.getDate() - currentDate.getDay() + 1);

    while (currentDate <= maxDate) {
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const weekLabel = `${currentDate.getDate()}/${currentDate.getMonth() + 1}`;

      const fiveSClosed = (data.fiveS || []).filter((item: any) => {
        const dCreated = new Date(item.createdAt || item.date || item.created_at);
        const dClosed = item.solutionDate
          ? new Date(item.solutionDate)
          : item.status === 'Cerrado'
          ? dCreated
          : null;
        return dClosed && dClosed <= weekEnd;
      }).length;

      const quickWinsDone = (data.quickWins || []).filter((w: any) => {
        const d = new Date(w.date || w.created_at);
        return (
          d <= weekEnd &&
          (w.status === 'done' || w.status === 'completed')
        );
      }).length;

      weeks.push({
        name: weekLabel,
        'Tarjetas 5S Cerradas': fiveSClosed,
        'Quick Wins': quickWinsDone,
        date: currentDate.getTime(),
      });

      currentDate.setDate(currentDate.getDate() + 7);
    }

    return weeks.slice(-12);
  }, [data]);

  // Load cached insight on mount
  useEffect(() => {
    const cached = localStorage.getItem(`ai_insight_${companyName || 'default'}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed?.resumenEjecutivo?.trim()) {
          setInsight(parsed);
        }
      } catch (e) {
        console.error('Error parsing cached insight:', e);
      }
    }
  }, [companyName]);

  // Auto-scroll chat
  useEffect(() => {
    if (activeTab === 'chat' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, activeTab]);

  const generateInsight = async () => {
    if (!effectiveApiKey) {
      setShowKeyInput(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const preparedData = prepareCompanyData(data, companyName);
      const newInsight = await generateAIInsight(
        preparedData,
        companyName,
        effectiveApiKey
      );

      setInsight(newInsight);

      try {
        localStorage.setItem(
          `ai_insight_${companyName || 'default'}`,
          JSON.stringify(newInsight)
        );
      } catch (e) {
        console.warn('Could not save insight to localStorage:', e);
      }

      if (chatHistory.length === 0) {
        setChatHistory([
          {
            role: 'model',
            content: `Hola, he analizado los datos de ${
              companyName || 'la empresa'
            }. Veo ${preparedData?.a3?.total || 0} proyectos A3 y ${
              (preparedData?.fiveS?.pending || 0) +
              (preparedData?.fiveS?.inProcess || 0)
            } tarjetas 5S pendientes. ¿En qué aspecto deseas que profundicemos?`,
          },
        ]);
      }
    } catch (err: any) {
      console.error('Error generating insight:', err);
      setError(err?.message || 'Error al generar análisis');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || chatLoading) return;

    const newUserMsg = { role: 'user', content: inputMessage };
    const newHistory = [...chatHistory, newUserMsg];

    setChatHistory(newHistory);
    setInputMessage('');
    setChatLoading(true);

    try {
      const preparedData = prepareCompanyData(data, companyName);
      const response = await sendChatMessage(
        newHistory,
        newUserMsg.content,
        preparedData,
        companyName,
        effectiveApiKey
      );

      setChatHistory((prev) => [...prev, { role: 'model', content: response }]);
    } catch (err) {
      console.error(err);
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'model',
          content: 'Lo siento, hubo un problema al procesar tu consulta con la IA.',
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const getStatusColor = (estado?: string) => {
    switch (estado?.toLowerCase()) {
      case 'bueno':
        return 'bg-emerald-500';
      case 'regular':
        return 'bg-amber-500';
      case 'critico':
        return 'bg-red-500';
      default:
        return 'bg-slate-400';
    }
  };

  const getAlertIcon = (tipo?: string) => {
    switch (tipo?.toLowerCase()) {
      case 'critica':
        return <AlertCircle size={16} className="text-red-500" />;
      case 'advertencia':
        return <AlertTriangle size={16} className="text-amber-500" />;
      default:
        return <Info size={16} className="text-blue-500" />;
    }
  };

  const getAlertBg = (tipo?: string) => {
    switch (tipo?.toLowerCase()) {
      case 'critica':
        return 'bg-red-50 border-red-100';
      case 'advertencia':
        return 'bg-amber-50 border-amber-100';
      default:
        return 'bg-blue-50 border-blue-100';
    }
  };

  const getTrendIcon = (tendencia?: string) => {
    switch (tendencia) {
      case 'up':
        return <TrendingUp size={16} className="text-emerald-500" />;
      case 'down':
        return <TrendingDown size={16} className="text-red-500" />;
      default:
        return <Minus size={16} className="text-slate-400" />;
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // No API Key Configuration State
  if (!effectiveApiKey || showKeyInput) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 text-white h-full flex flex-col items-center justify-center text-center font-sans">
        <div className="p-4 bg-cyan-500/20 rounded-2xl mb-6">
          <Brain size={48} className="text-cyan-400" />
        </div>
        <h3 className="text-2xl font-black mb-2 tracking-tight">
          Activar Consultor IA
        </h3>
        <p className="text-slate-400 text-sm max-w-sm mb-8 leading-relaxed">
          Ingresa tu API Key de Gemini para comenzar el análisis inteligente de
          tus datos de mejora continua.
        </p>

        <div className="w-full max-w-md space-y-4">
          <div className="relative group">
            <input
              type="password"
              placeholder="Pega tu API Key de Gemini aquí..."
              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500 outline-none transition-all pr-12 group-hover:bg-slate-700/70"
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
            />
            <button
              onClick={() => saveApiKey(tempKey)}
              disabled={!tempKey.trim()}
              className="absolute right-2 top-1.5 p-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors disabled:opacity-50"
            >
              <ArrowRightCircle size={18} />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold transition-all"
            >
              <Sparkles size={14} className="text-cyan-400" />
              Obtener API Key Gratis
            </a>
            {effectiveApiKey && (
              <button
                onClick={() => setShowKeyInput(false)}
                className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold transition-all"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>

        <div className="mt-12 flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
          <Info size={12} />
          Tu API Key se almacena de forma segura en tu navegador
        </div>
      </div>
    );
  }

  const containerClasses = isMaximized
    ? 'fixed inset-0 z-[9999] bg-white h-screen w-full rounded-none flex flex-col'
    : `bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden flex flex-col ${
        fullScreen ? 'h-full' : 'max-h-[800px]'
      }`;

  const isExpanded = isMaximized ? true : expanded;

  return (
    <div className={containerClasses} style={isMaximized ? { margin: 0 } : {}}>
      {/* Top Header */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-800 to-cyan-900 p-0 flex flex-col shrink-0 font-sans">
        <div
          className={`${fullScreen ? 'px-4 py-2.5' : 'p-3 lg:p-4'} flex items-center justify-between ${
            !fullScreen && !isMaximized ? 'cursor-pointer' : ''
          }`}
          onClick={() => !fullScreen && !isMaximized && setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl shadow-md shadow-cyan-500/20">
              <Brain size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm md:text-base flex items-center gap-2">
                Consultor IA
                <Sparkles size={14} className="text-cyan-400" />
              </h3>
              <p className="text-slate-400 text-xs">Análisis de Mejora Continua</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {insight?.generatedAt && (
              <span className="text-[10px] text-slate-400 hidden sm:block text-right">
                {formatDate(insight.generatedAt)} <br />
                <span className="text-cyan-400 font-bold">
                  {(data?.fiveS?.length || 0) + (data?.a3?.length || 0)} registros analizados
                </span>
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                generateInsight();
              }}
              disabled={loading || isSyncing || Boolean(fetchError)}
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={isSyncing ? 'Sincronizando historial...' : 'Regenerar análisis'}
            >
              <RefreshCw
                size={15}
                className={`text-white ${loading || isSyncing ? 'animate-spin' : ''}`}
              />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMaximized(!isMaximized);
              }}
              className="p-1.5 text-slate-400 hover:text-white transition-colors hover:bg-white/10 rounded-lg"
              title={isMaximized ? 'Minimizar' : 'Pantalla Completa'}
            >
              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            {!isMaximized && !fullScreen && (
              <button className="p-1 text-slate-400">
                {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            )}
          </div>
        </div>

        {/* Tabs Bar */}
        {isExpanded && (
          <div className="flex bg-slate-900/50 backdrop-blur-sm px-3 pt-1.5 gap-1 border-t border-white/5 font-sans">
            <button
              onClick={() => setActiveTab('analysis')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors ${
                activeTab === 'analysis'
                  ? 'bg-white text-slate-800'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <Target size={13} /> Análisis
            </button>
            <button
              onClick={() => setActiveTab('progress')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors ${
                activeTab === 'progress'
                  ? 'bg-white text-slate-800'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <TrendingUp size={13} /> Progreso
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors ${
                activeTab === 'chat'
                  ? 'bg-white text-slate-800'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <MessageSquare size={13} /> Chat Asistente
            </button>
          </div>
        )}
      </div>

      {/* Body Area */}
      {isExpanded && (
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 relative min-h-[400px]">
          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 z-20 bg-white/70 backdrop-blur-[2px] flex flex-col items-center justify-center transition-all duration-300">
              <div className="relative">
                <Brain size={48} className="text-cyan-500 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-700 font-bold animate-pulse font-sans">
                {insight ? 'Actualizando análisis...' : 'Generando análisis de IA...'}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && !loading && (
            <div className="p-6">
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    Error al generar análisis
                  </p>
                  <p className="text-xs text-red-600 mt-1">{error}</p>
                  <div className="flex gap-4 mt-3">
                    <button
                      onClick={generateInsight}
                      className="text-xs font-bold text-red-600 hover:text-red-800 flex items-center gap-1"
                    >
                      <RefreshCw size={12} /> Reintentar
                    </button>
                    <button
                      onClick={() => setShowKeyInput(true)}
                      className="text-xs font-bold text-slate-600 hover:text-slate-800 flex items-center gap-1"
                    >
                      <Sparkles size={12} className="text-cyan-500" /> Cambiar API
                      Key
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No Insight Placeholder */}
          {!insight && !loading && !error && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center font-sans">
              <Brain
                size={48}
                className={`text-slate-300 mb-4 ${
                  isSyncing ? 'animate-pulse' : ''
                }`}
              />
              <p className="text-slate-600 font-medium mb-4">
                {isSyncing
                  ? 'Sincronizando historial completo...'
                  : 'Aún no se ha generado el diagnóstico Lean para esta empresa.'}
              </p>
              <button
                onClick={generateInsight}
                disabled={isSyncing}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold shadow-md shadow-cyan-500/20 transition-all flex items-center gap-2"
              >
                <Sparkles size={16} />
                Generar Análisis con IA
              </button>
            </div>
          )}

          {/* Tab 1: Analysis */}
          {insight && !error && activeTab === 'analysis' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-5 animate-in fade-in duration-300 font-sans">
              {/* Executive Summary */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <p className="text-slate-700 text-sm leading-relaxed italic">
                  "{insight.resumenEjecutivo}"
                </p>
              </div>

              {/* Metric Highlight */}
              {insight.metricaDestacada && (
                <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {insight.metricaDestacada.nombre}
                    </p>
                    <p className="text-2xl font-black text-slate-800 mt-1">
                      {insight.metricaDestacada.valor}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    {getTrendIcon(insight.metricaDestacada.tendencia)}
                  </div>
                </div>
              )}

              {/* Progress Observations */}
              {insight.evaluacionProgreso?.observaciones?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Target size={14} /> Evaluación de Progreso
                  </h4>
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${getStatusColor(
                          insight.evaluacionProgreso.estado
                        )}`}
                      ></div>
                      <span className="text-xs font-bold uppercase text-slate-600">
                        Estado: {insight.evaluacionProgreso.estado}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {insight.evaluacionProgreso.observaciones.map(
                        (obs: string, i: number) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-slate-600"
                          >
                            <CheckCircle
                              size={14}
                              className="text-slate-400 shrink-0 mt-0.5"
                            />
                            {obs}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {/* Alerts */}
              {insight.alertas?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <AlertTriangle size={14} /> Alertas
                  </h4>
                  <div className="space-y-2">
                    {insight.alertas.map((alerta: any, i: number) => (
                      <div
                        key={i}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${getAlertBg(
                          alerta.tipo
                        )}`}
                      >
                        {getAlertIcon(alerta.tipo)}
                        <div className="flex-1">
                          <p className="text-sm text-slate-700">{alerta.mensaje}</p>
                          {alerta.proyecto && (
                            <p className="text-xs text-slate-500 mt-1">
                              Proyecto: {alerta.proyecto}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Steps Section */}
              {insight.proximosPasos?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ListTodo size={14} /> Próximos Pasos Sugeridos
                  </h4>
                  <div className="space-y-3">
                    {insight.proximosPasos.map((paso: any, i: number) => (
                      <div
                        key={i}
                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-cyan-300 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-1 p-1.5 rounded-lg shrink-0 ${
                                paso.prioridad === 'alta'
                                  ? 'bg-red-100 text-red-600'
                                  : paso.prioridad === 'media'
                                  ? 'bg-amber-100 text-amber-600'
                                  : 'bg-blue-100 text-blue-600'
                              }`}
                            >
                              <ArrowRightCircle size={16} />
                            </div>
                            <div>
                              <h5 className="font-bold text-slate-800 text-sm group-hover:text-cyan-700 transition-colors">
                                {paso.titulo}
                              </h5>
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                {paso.descripcion}
                              </p>
                            </div>
                          </div>
                          {paso.prioridad && (
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                paso.prioridad === 'alta'
                                  ? 'bg-red-50 text-red-600 border border-red-100'
                                  : paso.prioridad === 'media'
                                  ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                  : 'bg-blue-50 text-blue-600 border border-blue-100'
                              }`}
                            >
                              {paso.prioridad}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coaching Section */}
              {insight.coachingPracticas?.length > 0 && (
                <div className="border border-cyan-100 rounded-xl overflow-hidden bg-white shadow-sm">
                  <button
                    onClick={() => setShowCoaching(!showCoaching)}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-cyan-50 to-white hover:from-cyan-100 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm font-bold text-cyan-800">
                      <BookOpen size={16} />
                      Coaching en Buenas Prácticas
                    </span>
                    {showCoaching ? (
                      <ChevronUp size={18} className="text-cyan-600" />
                    ) : (
                      <ChevronDown size={18} className="text-cyan-600" />
                    )}
                  </button>

                  {showCoaching && (
                    <div className="p-4 space-y-4 animate-in fade-in duration-200">
                      {insight.coachingPracticas.map((tip: any, i: number) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="p-1.5 bg-cyan-100 rounded-lg shrink-0">
                            <Lightbulb size={14} className="text-cyan-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">
                              {tip.tema}
                            </p>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                              {tip.consejo}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Focus of the Day */}
              {insight.enfoqueDelDia && (
                <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-xl p-4 text-white shadow-lg shadow-cyan-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                      Enfoque del Día
                    </span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed">
                    {insight.enfoqueDelDia}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Progress */}
          {insight && !error && activeTab === 'progress' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-5 animate-in fade-in duration-300 font-sans">
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <h4 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-2">
                  <History size={18} className="text-cyan-500" />
                  Evolución Semanal de Mejoras (Acumulado)
                </h4>

                {processedHistory.length > 1 ? (
                  <div className="h-[300px] w-full min-h-[300px]">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={processedHistory}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#e2e8f0"
                        />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 12 }}
                        />
                        <RechartsTooltip
                          cursor={{ fill: '#f1f5f9' }}
                          contentStyle={{
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          }}
                        />
                        <Legend iconType="circle" />
                        <Bar
                          dataKey="Tarjetas 5S Cerradas"
                          stackId="a"
                          fill="#3b82f6"
                          radius={[0, 0, 4, 4]}
                          barSize={20}
                        />
                        <Bar
                          dataKey="Quick Wins"
                          stackId="a"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                          barSize={20}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
                    <Calendar size={48} className="mb-4 opacity-50" />
                    <p className="font-medium">
                      No hay suficientes datos históricos para generar una tendencia.
                    </p>
                    <p className="text-xs mt-1">
                      Se necesitan registros en al menos 2 semanas diferentes.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Mejoras Totales (Últimas 12 Semanas)
                  </p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-slate-800">
                      {processedHistory.length > 0
                        ? (processedHistory[processedHistory.length - 1][
                            'Tarjetas 5S Cerradas'
                          ] || 0) +
                          (processedHistory[processedHistory.length - 1][
                            'Quick Wins'
                          ] || 0)
                        : 0}
                    </span>
                    <span className="text-sm font-medium text-emerald-500 mb-1 flex items-center">
                      <TrendingUp size={14} className="mr-1" /> Acumulado
                    </span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl p-4 text-white shadow-md">
                  <p className="text-xs font-bold text-cyan-100 uppercase tracking-wider mb-1">
                    Análisis de Tendencia IA
                  </p>
                  <p className="text-sm font-medium leading-relaxed italic opacity-95">
                    "La tendencia refleja una tracción constante en la resolución de
                    anomalías de Gemba. Focalizar esfuerzos en cuellos de botella para
                    maximizar el flujo de valor."
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Chat Assistant */}
          {insight && !error && activeTab === 'chat' && (
            <div className="flex-1 flex flex-col h-full animate-in fade-in duration-300 font-sans">
              {/* Chat Messages List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {chatHistory.length === 0 && (
                  <div className="text-center py-12 px-6">
                    <div className="bg-cyan-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-cyan-600">
                      <MessageSquare size={32} />
                    </div>
                    <h4 className="text-slate-800 font-bold mb-2">
                      Asistente de Mejora Continua
                    </h4>
                    <p className="text-slate-500 text-sm">
                      Pregúntame sobre tus Ishikawas, 5 Porqués, tarjetas 5S o cómo
                      mejorar tus KPIs.
                    </p>
                  </div>
                )}

                {chatHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-cyan-600 text-white rounded-br-none'
                          : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
                      }`}
                    >
                      {msg.content.split('\n').map((line, i) => (
                        <p key={i} className="mb-1 last:mb-0">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-4 shadow-sm">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                          style={{ animationDelay: '150ms' }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                          style={{ animationDelay: '300ms' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef}></div>
              </div>

              {/* Chat Input */}
              <div className="p-3 bg-white border-t border-slate-200">
                <form
                  onSubmit={handleSendMessage}
                  className="relative flex items-center gap-2"
                >
                  <input
                    type="text"
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-sm text-slate-800 placeholder-slate-400 transition-all font-sans"
                    placeholder="Escribe tu consulta sobre los proyectos o datos..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={chatLoading}
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || chatLoading}
                    className="absolute right-2 p-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg hover:shadow-md disabled:opacity-50 transition-all active:scale-95"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIConsultant;
