import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Database,
  ShieldCheck,
  Zap,
  Footprints,
  Activity,
  ClipboardList,
} from 'lucide-react';
import {
  prepareCompanyData,
  generateAIInsight,
  sendChatMessage,
  getEffectiveApiKey,
} from '../../../services/geminiService';
import { supabase } from '../../../lib/supabase';
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
    gembaWalks?: any[];
    gembaFindings?: any[];
    profiles?: any[];
    [key: string]: any;
  };
  companyName: string;
  companyId?: string | null;
  apiKey?: string;
  fullScreen?: boolean;
  isSyncing?: boolean;
  fetchError?: string | null;
}

export const AIConsultant: React.FC<AIConsultantProps> = ({
  data,
  companyName,
  companyId = null,
  apiKey,
  fullScreen = false,
  isSyncing = false,
  fetchError = null,
}) => {
  const [insight, setInsight] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dbLoading, setDbLoading] = useState(true);
  const [dbSavedAt, setDbSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [showCoaching, setShowCoaching] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);

  // Chat State
  const [activeTab, setActiveTab] = useState<'analysis' | 'progress' | 'chat'>('analysis');
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const autoTriggeredRef = useRef<string | null>(null);

  // Scope único para guardar SOLO LA ÚLTIMA actualización en la base de datos por empresa/vista
  const scopeKey = useMemo(() => {
    return companyId && companyId !== 'all' ? `company_${companyId}` : 'global_all';
  }, [companyId]);

  // API Key Management (con fallback transparente a OpenRouter / Motor Lean)
  const [customApiKey, setCustomApiKey] = useState(
    localStorage.getItem('gemini_api_key') || ''
  );
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempKey, setTempKey] = useState('');

  const effectiveApiKey = getEffectiveApiKey(customApiKey || apiKey);

  // Datos enriquecidos de los 6 módulos en tiempo real
  const preparedData = useMemo(() => {
    return prepareCompanyData(data, companyName);
  }, [data, companyName]);

  const totalRecordsCount = useMemo(() => {
    return (
      (data?.fiveS?.length || 0) +
      (data?.quickWins?.length || 0) +
      (data?.a3?.length || 0) +
      (data?.vsms?.length || 0) +
      (data?.auditLogs?.length || 0) +
      (data?.gembaWalks?.length || 0) +
      (data?.gembaFindings?.length || 0)
    );
  }, [data]);

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

  /**
   * Guarda ÚNICAMENTE la última actualización en Supabase (sobrescribiendo la anterior)
   */
  const persistSingleLatestToDatabase = useCallback(
    async (
      latestInsight: any,
      latestChat: Array<{ role: string; content: string }>
    ) => {
      const nowIso = new Date().toISOString();
      try {
        localStorage.setItem(
          `ai_insight_${scopeKey}`,
          JSON.stringify({
            insight: latestInsight,
            chatHistory: latestChat.slice(-12),
            updatedAt: nowIso,
          })
        );
      } catch {
        // ignore localStorage quota errors
      }

      try {
        const { error: upsertErr } = await supabase
          .from('lean_ai_insights')
          .upsert(
            {
              scope_key: scopeKey,
              company_id: companyId && companyId !== 'all' ? companyId : null,
              company_name: companyName || 'Todas las Empresas',
              insight_data: latestInsight,
              chat_history: latestChat.slice(-12),
              updated_at: nowIso,
            },
            { onConflict: 'scope_key' }
          );

        if (!upsertErr) {
          setDbSavedAt(nowIso);
        } else {
          console.warn('[AIConsultant] Error guardando en BD:', upsertErr.message);
        }
      } catch (err) {
        console.warn('[AIConsultant] No se pudo sincronizar con lean_ai_insights:', err);
      }
    },
    [scopeKey, companyId, companyName]
  );

  /**
   * Carga la ÚLTIMA actualización desde la base de datos (Supabase) al abrir el módulo
   */
  useEffect(() => {
    let isMounted = true;

    async function loadLatestFromDatabase() {
      setDbLoading(true);
      setError(null);

      try {
        const { data: row, error: selectErr } = await supabase
          .from('lean_ai_insights')
          .select('insight_data, chat_history, updated_at')
          .eq('scope_key', scopeKey)
          .maybeSingle();

        if (!isMounted) return;

        if (!selectErr && row && row.insight_data?.resumenEjecutivo) {
          setInsight(row.insight_data);
          setDbSavedAt(row.updated_at || row.insight_data.generatedAt || null);
          if (Array.isArray(row.chat_history) && row.chat_history.length > 0) {
            setChatHistory(row.chat_history);
          }
          setDbLoading(false);
          return;
        }

        // Fallback: revisar caché local y migrarla a la base de datos si existe
        const localRaw =
          localStorage.getItem(`ai_insight_${scopeKey}`) ||
          localStorage.getItem(`ai_insight_${companyName || 'default'}`);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          const candidateInsight = parsed?.insight || parsed;
          const candidateChat = Array.isArray(parsed?.chatHistory)
            ? parsed.chatHistory
            : [];
          if (candidateInsight?.resumenEjecutivo?.trim()) {
            setInsight(candidateInsight);
            setDbSavedAt(
              parsed?.updatedAt || candidateInsight.generatedAt || new Date().toISOString()
            );
            if (candidateChat.length > 0) {
              setChatHistory(candidateChat);
            }
            // Persistir en la tabla de BD para que quede como única última actualización
            persistSingleLatestToDatabase(candidateInsight, candidateChat);
            setDbLoading(false);
            return;
          }
        }

        // Si no hay ningún registro previo para este scope
        setInsight(null);
        setDbSavedAt(null);
      } catch (err) {
        console.warn('[AIConsultant] Error leyendo última actualización de BD:', err);
      } finally {
        if (isMounted) {
          setDbLoading(false);
        }
      }
    }

    loadLatestFromDatabase();

    return () => {
      isMounted = false;
    };
  }, [scopeKey, companyName, persistSingleLatestToDatabase]);

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
        const dClosed = item.close_date
          ? new Date(item.close_date)
          : item.solutionDate
          ? new Date(item.solutionDate)
          : item.status?.toLowerCase() === 'cerrado'
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

  // Auto-scroll chat
  useEffect(() => {
    if (activeTab === 'chat' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, activeTab]);

  const generateInsight = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const currentPrepared = prepareCompanyData(data, companyName);
      const newInsight = await generateAIInsight(
        currentPrepared,
        companyName,
        effectiveApiKey
      );

      setInsight(newInsight);

      const open5S =
        (currentPrepared?.fiveS?.pending || 0) +
        (currentPrepared?.fiveS?.inProcess || 0);
      const topArea = currentPrepared?.fiveS?.topCriticalAreas?.[0];

      const initialGreeting =
        chatHistory.length > 0
          ? chatHistory
          : [
              {
                role: 'model',
                content: `Hola, he actualizado el diagnóstico integral 360° de **${
                  companyName || 'la planta'
                }** analizando **${totalRecordsCount} registros** en los 6 módulos:\n• **5S:** ${
                  currentPrepared?.fiveS?.rate || 0
                }% de cierre (${open5S} abiertas${
                  topArea ? `, foco en ${topArea.area}` : ''
                })\n• **Auditorías 5S:** ${
                  currentPrepared?.auditStats?.avgScore || 0
                }% promedio en ${currentPrepared?.auditStats?.totalAudits || 0} auditorías\n• **Proyectos A3:** ${
                  currentPrepared?.a3?.total || 0
                } proyectos con ${
                  currentPrepared?.a3?.avgProgress || 0
                }% de avance promedio en tareas 5W2H\n• **Quick Wins:** ${
                  currentPrepared?.quickWins?.done || 0
                }/${currentPrepared?.quickWins?.total || 0} implementados\n• **Gemba Walk:** ${
                  currentPrepared?.gemba?.totalWalks || 0
                } caminatas y ${
                  currentPrepared?.gemba?.commitments?.length || 0
                } pactos de compromiso.\n\n¿Sobre qué módulo o cuello de botella quieres profundizar?`,
              },
            ];

      setChatHistory(initialGreeting);

      // Guardar SOLO LA ÚLTIMA actualización en la base de datos
      await persistSingleLatestToDatabase(newInsight, initialGreeting);
    } catch (err: any) {
      console.error('Error generating insight:', err);
      setError(err?.message || 'Error al generar análisis');
    } finally {
      setLoading(false);
    }
  }, [
    data,
    companyName,
    effectiveApiKey,
    chatHistory,
    totalRecordsCount,
    persistSingleLatestToDatabase,
  ]);

  // Si ya terminaron de cargar los datos de los módulos y la base de datos no tenía ningún análisis guardado,
  // generamos automáticamente el primer diagnóstico para que siempre cargue de inmediato.
  useEffect(() => {
    if (
      !dbLoading &&
      !isSyncing &&
      !insight &&
      !loading &&
      !error &&
      totalRecordsCount > 0 &&
      autoTriggeredRef.current !== scopeKey
    ) {
      autoTriggeredRef.current = scopeKey;
      generateInsight();
    }
  }, [dbLoading, isSyncing, insight, loading, error, totalRecordsCount, scopeKey, generateInsight]);

  const sendMessageText = async (messageText: string) => {
    if (!messageText.trim() || chatLoading) return;

    const newUserMsg = { role: 'user', content: messageText.trim() };
    const newHistory = [...chatHistory, newUserMsg];

    setChatHistory(newHistory);
    setInputMessage('');
    setChatLoading(true);

    try {
      const currentPrepared = prepareCompanyData(data, companyName);
      const response = await sendChatMessage(
        newHistory,
        newUserMsg.content,
        currentPrepared,
        companyName,
        effectiveApiKey
      );

      const updatedHistory = [...newHistory, { role: 'model', content: response }];
      setChatHistory(updatedHistory);

      if (insight) {
        await persistSingleLatestToDatabase(insight, updatedHistory);
      }
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessageText(inputMessage);
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
        return <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />;
      case 'advertencia':
        return <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />;
      default:
        return <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />;
    }
  };

  const getAlertBg = (tipo?: string) => {
    switch (tipo?.toLowerCase()) {
      case 'critica':
        return 'bg-red-50 border-red-200';
      case 'advertencia':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTrendIcon = (tendencia?: string) => {
    switch (tendencia) {
      case 'up':
        return <TrendingUp size={18} className="text-emerald-600" />;
      case 'down':
        return <TrendingDown size={18} className="text-red-600" />;
      default:
        return <Minus size={18} className="text-slate-500" />;
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (showKeyInput) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 text-white h-full flex flex-col items-center justify-center text-center font-sans">
        <div className="p-4 bg-cyan-500/20 rounded-2xl mb-6">
          <Brain size={48} className="text-cyan-400" />
        </div>
        <h3 className="text-2xl font-black mb-2 tracking-tight">
          Configurar API Key Personalizada
        </h3>
        <p className="text-slate-300 text-sm max-w-sm mb-8 leading-relaxed">
          El Consultor IA ya cuenta con motor integrado, pero puedes ingresar tu propia API Key de Gemini si lo prefieres.
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
              Obtener API Key en Google AI Studio
            </a>
            <button
              onClick={() => setShowKeyInput(false)}
              className="px-4 py-2 text-slate-300 hover:text-white text-xs font-bold transition-all"
            >
              Volver al Consultor IA
            </button>
          </div>
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

  const quickQuestions = [
    '¿Cuáles son las áreas más críticas en 5S y qué recomiendas hacer hoy?',
    'Analiza el avance de las tareas 5W2H y causas raíz de nuestros proyectos A3',
    '¿Qué estado tienen las Auditorías 5S y cuál de las 5S es la más débil?',
    '¿Qué Quick Wins de alto impacto y compromisos de Gemba Walk están pendientes?',
  ];

  return (
    <div className={containerClasses} style={isMaximized ? { margin: 0 } : {}}>
      {/* Top Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 p-0 flex flex-col shrink-0 font-sans">
        <div
          className={`${fullScreen ? 'px-4 py-3' : 'p-3 lg:p-4'} flex items-center justify-between ${
            !fullScreen && !isMaximized ? 'cursor-pointer' : ''
          }`}
          onClick={() => !fullScreen && !isMaximized && setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl shadow-md shadow-cyan-500/20">
              <Brain size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm md:text-base flex items-center gap-1.5">
                  <span>Consultor IA Master Black Belt</span>
                  <Sparkles size={14} className="text-cyan-400" />
                </h3>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Database size={10} />
                  {dbSavedAt ? 'Última actualización en BD' : 'Conectado a 6 Módulos'}
                </span>
              </div>
              <p className="text-slate-300 text-xs">
                {companyName} • 5S, Auditorías, Quick Wins, A3, VSM y Gemba Walk
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {(dbSavedAt || insight?.generatedAt) && (
              <div className="text-[11px] text-slate-300 hidden sm:block text-right leading-tight">
                <span className="text-slate-400">Última actualización:</span>{' '}
                <span className="font-bold text-white">
                  {formatDate(dbSavedAt || insight?.generatedAt)}
                </span>
                <br />
                <span className="text-cyan-400 font-bold">
                  {totalRecordsCount} registros de 6 módulos captados
                </span>
              </div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                generateInsight();
              }}
              disabled={loading || isSyncing || Boolean(fetchError)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              title="Actualizar diagnóstico y guardar en la base de datos"
            >
              <RefreshCw
                size={13}
                className={`${loading || isSyncing ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">
                {loading ? 'Analizando...' : 'Actualizar Análisis'}
              </span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMaximized(!isMaximized);
              }}
              className="p-1.5 text-slate-300 hover:text-white transition-colors hover:bg-white/10 rounded-lg"
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
          <div className="flex bg-slate-950/50 backdrop-blur-sm px-3 pt-1.5 gap-1 border-t border-white/10 font-sans">
            <button
              onClick={() => setActiveTab('analysis')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors ${
                activeTab === 'analysis'
                  ? 'bg-slate-50 text-slate-900'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Target size={13} /> Diagnóstico 360°
            </button>
            <button
              onClick={() => setActiveTab('progress')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors ${
                activeTab === 'progress'
                  ? 'bg-slate-50 text-slate-900'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <TrendingUp size={13} /> Progreso
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors ${
                activeTab === 'chat'
                  ? 'bg-slate-50 text-slate-900'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
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
          {(loading || dbLoading) && (
            <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center transition-all duration-300">
              <div className="relative">
                <Brain size={48} className="text-cyan-600 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-800 font-bold animate-pulse font-sans">
                {dbLoading
                  ? 'Recuperando última actualización desde la base de datos...'
                  : 'Analizando los 6 módulos operativos con IA...'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Cruzando datos de 5S, Auditorías, Quick Wins, Proyectos A3, VSM y Gemba Walk
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && !loading && (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-900">
                    Error al generar análisis
                  </p>
                  <p className="text-xs text-red-700 mt-1">{error}</p>
                  <div className="flex gap-4 mt-3">
                    <button
                      onClick={generateInsight}
                      className="text-xs font-bold text-red-700 hover:text-red-900 flex items-center gap-1"
                    >
                      <RefreshCw size={12} /> Reintentar ahora
                    </button>
                    <button
                      onClick={() => setShowKeyInput(true)}
                      className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1"
                    >
                      <Sparkles size={12} className="text-cyan-600" /> Configurar API Key
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No Insight Placeholder */}
          {!insight && !loading && !dbLoading && !error && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center font-sans">
              <Brain
                size={48}
                className={`text-cyan-600 mb-4 ${
                  isSyncing ? 'animate-pulse' : ''
                }`}
              />
              <h4 className="text-base font-bold text-slate-800 mb-1">
                {isSyncing
                  ? 'Sincronizando datos de los 6 módulos...'
                  : 'Listo para generar el diagnóstico Lean 360°'}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mb-5">
                {isSyncing
                  ? 'Leyendo tarjetas 5S, auditorías, Quick Wins, proyectos A3, mapas VSM y caminatas Gemba...'
                  : `Se han captado ${totalRecordsCount} registros operativos de ${companyName}. Genera el análisis para guardarlo en la base de datos.`}
              </p>
              <button
                onClick={generateInsight}
                disabled={isSyncing}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold shadow-md shadow-cyan-500/20 transition-all flex items-center gap-2"
              >
                <Sparkles size={16} />
                Generar Diagnóstico con IA
              </button>
            </div>
          )}

          {/* Tab 1: Analysis */}
          {insight && !error && activeTab === 'analysis' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-5 animate-in fade-in duration-300 font-sans">
              {/* Live 6-Module Data Capture Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                    <ClipboardList size={13} className="text-rose-600" />
                    <span>Tarjetas 5S</span>
                  </div>
                  <p className="text-sm font-black text-slate-900 mt-1">
                    {preparedData.fiveS.rate}% cierre
                  </p>
                  <p className="text-[10px] font-semibold text-slate-500">
                    {preparedData.fiveS.pending + preparedData.fiveS.inProcess} abiertas de {preparedData.fiveS.total}
                  </p>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                    <ShieldCheck size={13} className="text-cyan-600" />
                    <span>Auditorías 5S</span>
                  </div>
                  <p className="text-sm font-black text-slate-900 mt-1">
                    {preparedData.auditStats.avgScore}% madurez
                  </p>
                  <p className="text-[10px] font-semibold text-slate-500">
                    {preparedData.auditStats.totalAudits} evaluaciones
                  </p>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                    <Zap size={13} className="text-amber-600" />
                    <span>Quick Wins</span>
                  </div>
                  <p className="text-sm font-black text-slate-900 mt-1">
                    {preparedData.quickWins.done}/{preparedData.quickWins.total} listos
                  </p>
                  <p className="text-[10px] font-semibold text-slate-500">
                    {preparedData.quickWins.highImpactPending} alto impacto pend.
                  </p>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                    <Target size={13} className="text-indigo-600" />
                    <span>Proyectos A3</span>
                  </div>
                  <p className="text-sm font-black text-slate-900 mt-1">
                    {preparedData.a3.avgProgress}% tareas
                  </p>
                  <p className="text-[10px] font-semibold text-slate-500">
                    {preparedData.a3.completedTasks}/{preparedData.a3.totalTasks} en {preparedData.a3.total} A3
                  </p>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                    <Activity size={13} className="text-purple-600" />
                    <span>Mapas VSM</span>
                  </div>
                  <p className="text-sm font-black text-slate-900 mt-1">
                    {preparedData.vsm.count} flujos
                  </p>
                  <p className="text-[10px] font-semibold text-slate-500 truncate">
                    {preparedData.vsm.details?.[0]?.bottleneckStation || 'Mapeo de valor'}
                  </p>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                    <Footprints size={13} className="text-emerald-600" />
                    <span>Gemba Walk</span>
                  </div>
                  <p className="text-sm font-black text-slate-900 mt-1">
                    {preparedData.gemba.totalWalks} caminatas
                  </p>
                  <p className="text-[10px] font-semibold text-slate-500">
                    {preparedData.gemba.commitments.length} pactos • {preparedData.gemba.kudosCount} kudos
                  </p>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-700">
                    Resumen Ejecutivo
                  </span>
                  {dbSavedAt && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <Database size={11} />
                      Memoria activa en BD ({formatDate(dbSavedAt)})
                    </span>
                  )}
                </div>
                <p className="text-slate-800 text-sm leading-relaxed font-medium">
                  "{insight.resumenEjecutivo}"
                </p>
              </div>

              {/* Metric Highlight */}
              {insight.metricaDestacada && (
                <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {insight.metricaDestacada.nombre}
                    </p>
                    <p className="text-2xl font-black text-slate-900 mt-1">
                      {insight.metricaDestacada.valor}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-100 rounded-xl">
                    {getTrendIcon(insight.metricaDestacada.tendencia)}
                  </div>
                </div>
              )}

              {/* Progress Observations */}
              {insight.evaluacionProgreso?.observaciones?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Target size={14} /> Evaluación de Progreso por Módulo
                  </h4>
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${getStatusColor(
                          insight.evaluacionProgreso.estado
                        )}`}
                      ></div>
                      <span className="text-xs font-bold uppercase text-slate-800">
                        Estado Operativo: {insight.evaluacionProgreso.estado}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {insight.evaluacionProgreso.observaciones.map(
                        (obs: string, i: number) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-slate-700"
                          >
                            <CheckCircle
                              size={15}
                              className="text-emerald-600 shrink-0 mt-0.5"
                            />
                            <span>{obs}</span>
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
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <AlertTriangle size={14} /> Alertas y Cuellos de Botella Detectados
                  </h4>
                  <div className="space-y-2">
                    {insight.alertas.map((alerta: any, i: number) => (
                      <div
                        key={i}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border ${getAlertBg(
                          alerta.tipo
                        )}`}
                      >
                        {getAlertIcon(alerta.tipo)}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-800">{alerta.mensaje}</p>
                          {alerta.proyecto && (
                            <p className="text-xs font-bold text-slate-600 mt-1">
                              Foco: {alerta.proyecto}
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
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ListTodo size={14} /> Próximos Pasos Sugeridos
                  </h4>
                  <div className="space-y-3">
                    {insight.proximosPasos.map((paso: any, i: number) => (
                      <div
                        key={i}
                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-cyan-400 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-1 p-1.5 rounded-lg shrink-0 ${
                                paso.prioridad === 'alta'
                                  ? 'bg-red-100 text-red-700'
                                  : paso.prioridad === 'media'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              <ArrowRightCircle size={16} />
                            </div>
                            <div>
                              <h5 className="font-bold text-slate-900 text-sm group-hover:text-cyan-700 transition-colors">
                                {paso.titulo}
                              </h5>
                              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                {paso.descripcion}
                              </p>
                            </div>
                          </div>
                          {paso.prioridad && (
                            <span
                              className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full shrink-0 ${
                                paso.prioridad === 'alta'
                                  ? 'bg-red-100 text-red-800 border border-red-300'
                                  : paso.prioridad === 'media'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-blue-100 text-blue-800 border border-blue-300'
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
                <div className="border border-cyan-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  <button
                    onClick={() => setShowCoaching(!showCoaching)}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-cyan-50 to-white hover:from-cyan-100 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm font-bold text-cyan-900">
                      <BookOpen size={16} />
                      Coaching en Buenas Prácticas Lean
                    </span>
                    {showCoaching ? (
                      <ChevronUp size={18} className="text-cyan-700" />
                    ) : (
                      <ChevronDown size={18} className="text-cyan-700" />
                    )}
                  </button>

                  {showCoaching && (
                    <div className="p-4 space-y-4 animate-in fade-in duration-200">
                      {insight.coachingPracticas.map((tip: any, i: number) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="p-1.5 bg-cyan-100 rounded-lg shrink-0">
                            <Lightbulb size={14} className="text-cyan-700" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {tip.tema}
                            </p>
                            <p className="text-xs text-slate-700 mt-1 leading-relaxed">
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
                <div className="bg-gradient-to-r from-cyan-600 to-blue-700 rounded-xl p-4 text-white shadow-lg shadow-cyan-600/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider opacity-90">
                      Enfoque del Día (Reunión Diaria en Piso)
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
                <h4 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <History size={18} className="text-cyan-600" />
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
                          stroke="#cbd5e1"
                        />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }}
                          dy={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }}
                        />
                        <RechartsTooltip
                          cursor={{ fill: '#f1f5f9' }}
                          contentStyle={{
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          }}
                        />
                        <Legend iconType="circle" />
                        <Bar
                          dataKey="Tarjetas 5S Cerradas"
                          stackId="a"
                          fill="#2563eb"
                          radius={[0, 0, 4, 4]}
                          barSize={22}
                        />
                        <Bar
                          dataKey="Quick Wins"
                          stackId="a"
                          fill="#059669"
                          radius={[4, 4, 0, 0]}
                          barSize={22}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-slate-500">
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
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Mejoras Totales Cerradas (Últimas 12 Semanas)
                  </p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-slate-900">
                      {processedHistory.length > 0
                        ? (processedHistory[processedHistory.length - 1][
                            'Tarjetas 5S Cerradas'
                          ] || 0) +
                          (processedHistory[processedHistory.length - 1][
                            'Quick Wins'
                          ] || 0)
                        : preparedData.fiveS.closed + preparedData.quickWins.done}
                    </span>
                    <span className="text-sm font-bold text-emerald-600 mb-1 flex items-center">
                      <TrendingUp size={14} className="mr-1" /> Acumulado
                    </span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-cyan-600 to-blue-700 rounded-xl p-4 text-white shadow-md">
                  <p className="text-xs font-bold text-cyan-100 uppercase tracking-wider mb-1">
                    Lectura de Tracción Operativa
                  </p>
                  <p className="text-sm font-medium leading-relaxed">
                    El promedio de avance de tareas en proyectos A3 alcanza el{' '}
                    <strong>{preparedData.a3.avgProgress}%</strong> con un tiempo medio de cierre 5S de{' '}
                    <strong>{preparedData.fiveS.avgClosure} días</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Chat Assistant */}
          {insight && !error && activeTab === 'chat' && (
            <div className="flex-1 flex flex-col h-full animate-in fade-in duration-300 font-sans">
              {/* Quick Prompts Bar */}
              <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
                <span className="text-[11px] font-bold text-slate-500 shrink-0">
                  Consultas rápidas:
                </span>
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={chatLoading}
                    onClick={() => sendMessageText(q)}
                    className="text-xs font-semibold px-3 py-1 rounded-full bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 whitespace-nowrap transition-colors disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Chat Messages List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {chatHistory.length === 0 && (
                  <div className="text-center py-12 px-6">
                    <div className="bg-cyan-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-cyan-700">
                      <MessageSquare size={32} />
                    </div>
                    <h4 className="text-slate-800 font-bold mb-2">
                      Asistente de Mejora Continua 360°
                    </h4>
                    <p className="text-slate-600 text-sm">
                      Pregúntame sobre tus proyectos A3, planes 5W2H, tarjetas 5S, auditorías, mapas VSM o compromisos de Gemba Walk.
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
                      className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-cyan-600 text-white rounded-br-none font-medium'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
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
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"
                          style={{ animationDelay: '150ms' }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"
                          style={{ animationDelay: '300ms' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef}></div>
              </div>

              {/* Chat Input */}
              <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                <form
                  onSubmit={handleSendMessage}
                  className="relative flex items-center gap-2"
                >
                  <input
                    type="text"
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-sm text-slate-900 placeholder-slate-500 transition-all font-sans"
                    placeholder="Pregunta por áreas críticas, avance de tareas A3, auditorías 5S o compromisos Gemba..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={chatLoading}
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || chatLoading}
                    className="absolute right-2 p-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:shadow-md disabled:opacity-50 transition-all active:scale-95"
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
