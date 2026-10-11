import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Compass,
  BookOpen,
  Trash2,
  Workflow,
  Award,
  Search,
  ArrowRight,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Lightbulb,
  ExternalLink,
  ChevronRight,
  Layers,
  HelpCircle,
  Flame,
  Info,
} from 'lucide-react';
import {
  GLOSSARY_ITEMS,
  CATEGORIES,
  WASTES_LIST,
  TOOLS_GUIDE,
  TRIVIA_QUESTIONS,
  GlossaryItem,
  WasteItem,
} from './data/leanData';

export const FundamentalsPage: React.FC = () => {
  const navigate = useNavigate();

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'glosario' | 'desperdicios' | 'guia' | 'trivia'>('glosario');

  // Glossary Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedGlossaryItem, setSelectedGlossaryItem] = useState<GlossaryItem | null>(null);

  // Waste selection
  const [selectedWaste, setSelectedWaste] = useState<WasteItem | null>(WASTES_LIST[0]);

  // Trivia State
  const [currentTriviaIndex, setCurrentTriviaIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [triviaFinished, setTriviaFinished] = useState(false);

  // Filtered glossary items
  const filteredGlossary = useMemo(() => {
    return GLOSSARY_ITEMS.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      if (!query) return matchesCategory;

      const matchesQuery =
        item.term.toLowerCase().includes(query) ||
        (item.originalTerm && item.originalTerm.toLowerCase().includes(query)) ||
        item.shortSummary.toLowerCase().includes(query) ||
        item.simpleExplanation.toLowerCase().includes(query) ||
        item.realWorldExample.toLowerCase().includes(query);

      return matchesCategory && matchesQuery;
    });
  }, [searchQuery, selectedCategory]);

  // Handle Trivia Option Click
  const handleSelectOption = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedAnswer(idx);
  };

  const handleConfirmAnswer = () => {
    if (selectedAnswer === null) return;
    setIsAnswerSubmitted(true);

    const currentQ = TRIVIA_QUESTIONS[currentTriviaIndex];
    if (selectedAnswer === currentQ.correctIndex) {
      setScore((prev) => prev + 1);
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
  };

  const handleNextQuestion = () => {
    if (currentTriviaIndex + 1 < TRIVIA_QUESTIONS.length) {
      setCurrentTriviaIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
    } else {
      setTriviaFinished(true);
      if (score >= 4) {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
        });
      }
    }
  };

  const handleRestartTrivia = () => {
    setCurrentTriviaIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setTriviaFinished(false);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-indigo-900/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold uppercase tracking-wider">
              <Compass size={14} className="text-cyan-400" />
              <span>Academia de Mejora Continua</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Fundamentos Lean
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl font-normal leading-relaxed">
              Aprende los conceptos, palabras japonesas y metodologías de Lean de forma fácil, con analogías reales de
              planta y sin tecnicismos complicados.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 text-center">
              <span className="block text-2xl font-black text-cyan-300 font-mono">{GLOSSARY_ITEMS.length}</span>
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Términos</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 text-center">
              <span className="block text-2xl font-black text-rose-300 font-mono">8</span>
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Desperdicios</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 text-center">
              <span className="block text-2xl font-black text-amber-300 font-mono">{TOOLS_GUIDE.length}</span>
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Herramientas</span>
            </div>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-200/60 rounded-2xl border border-slate-300/50 backdrop-blur-xs">
        <button
          type="button"
          onClick={() => setActiveTab('glosario')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeTab === 'glosario'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <BookOpen size={16} />
          <span>Glosario A-Z</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('desperdicios')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeTab === 'desperdicios'
              ? 'bg-white text-rose-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Trash2 size={16} />
          <span>Los 8 Desperdicios (Muda)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('guia')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeTab === 'guia'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Workflow size={16} />
          <span>¿Qué Herramienta Uso?</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('trivia')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeTab === 'trivia'
              ? 'bg-white text-amber-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Award size={16} />
          <span>Ponte a Prueba (Trivia)</span>
        </button>
      </div>

      {/* TAB 1: GLOSARIO A-Z */}
      {activeTab === 'glosario' && (
        <div className="space-y-6">
          {/* Controls: Search + Categories */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar término (ej: Gemba, 5S, Poka-Yoke, A3, Kanban, Takt Time)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Category pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          {filteredGlossary.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8">
              <HelpCircle className="mx-auto text-slate-300 mb-3" size={40} />
              <p className="text-slate-600 font-bold">No se encontraron términos para tu búsqueda.</p>
              <p className="text-slate-400 text-xs mt-1">Prueba con palabras como Kaizen, Desperdicio, Espera o 5S.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100"
              >
                Restablecer filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredGlossary.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 hover:shadow-md transition-all p-5 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${item.tagColor}`}>
                          {item.categoryLabel}
                        </span>
                        <h3 className="text-lg font-black text-slate-900 mt-1 group-hover:text-indigo-600 transition-colors">
                          {item.term}
                        </h3>
                        {item.originalTerm && (
                          <span className="text-[11px] font-medium text-slate-400">
                            {item.originalTerm} {item.pronunciation ? `· ${item.pronunciation}` : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs font-bold text-indigo-900/80 bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100/70">
                      💡 {item.shortSummary}
                    </p>

                    <div className="space-y-2 text-xs text-slate-600 leading-relaxed font-normal">
                      <p>
                        <strong className="text-slate-800 font-bold">¿Qué significa?</strong> {item.simpleExplanation}
                      </p>
                      <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60 text-amber-900">
                        <strong className="block text-[11px] text-amber-800 uppercase font-black tracking-wider mb-0.5">
                          Ejemplo real de terreno:
                        </strong>
                        <span className="text-xs">{item.realWorldExample}</span>
                      </div>
                    </div>
                  </div>

                  {item.nexusModule && (
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400">Disponible en Nexus:</span>
                      <button
                        type="button"
                        onClick={() => navigate(item.nexusModule!.path)}
                        className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        <span>{item.nexusModule.label}</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LOS 8 DESPERDICIOS (TIMWOODS) */}
      {activeTab === 'desperdicios' && (
        <div className="space-y-6">
          {/* Introductory callout */}
          <div className="bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-200/80 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                <Trash2 size={14} /> La regla de oro Lean
              </span>
              <h2 className="text-lg font-black text-slate-900">
                Todo lo que el cliente no pagaría por ello, es un Desperdicio (Muda)
              </h2>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                Se resumen con la regla mnemotécnica en inglés <strong>TIMWOODS</strong>: Transporte, Inventario, Movimiento, Espera (Waiting), Sobreproducción, Sobreprocesamiento, Defectos y Talento No Aprovechado (Skills).
              </p>
            </div>
          </div>

          {/* Waste cards list */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {WASTES_LIST.map((waste) => {
              const isSelected = selectedWaste?.id === waste.id;
              return (
                <div
                  key={waste.id}
                  onClick={() => setSelectedWaste(waste)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-white border-rose-500 shadow-md ring-2 ring-rose-500/20'
                      : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-mono font-black flex items-center justify-center text-sm shadow-xs">
                      {waste.code}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">{waste.englishName}</span>
                  </div>
                  <h3 className="text-base font-black text-slate-900">{waste.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{waste.definition}</p>
                </div>
              );
            })}
          </div>

          {/* Selected Waste Deep Dive */}
          {selectedWaste && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl bg-slate-900 text-cyan-300 font-mono font-black text-xl flex items-center justify-center shadow-sm">
                    {selectedWaste.code}
                  </span>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">{selectedWaste.name}</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{selectedWaste.englishName}</p>
                  </div>
                </div>

                {selectedWaste.recommendedNexusTool && (
                  <button
                    type="button"
                    onClick={() => navigate(selectedWaste.recommendedNexusTool!.path)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs self-start sm:self-auto"
                  >
                    <span>{selectedWaste.recommendedNexusTool.name}</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Definición Sencilla</h4>
                    <p className="text-sm text-slate-700 font-medium leading-relaxed">{selectedWaste.definition}</p>
                  </div>

                  <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/70 space-y-1">
                    <span className="text-[11px] font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Lightbulb size={13} /> Ejemplo en Bodega o Planta
                    </span>
                    <p className="text-xs text-amber-950 leading-relaxed font-normal">{selectedWaste.realExample}</p>
                  </div>

                  <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/70 space-y-1">
                    <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={13} /> ¿Cómo combatirlo?
                    </span>
                    <p className="text-xs text-emerald-950 leading-relaxed font-normal">{selectedWaste.howToEliminate}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/70 space-y-3">
                  <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Info size={14} className="text-rose-500" /> Señales de Alerta (¿Cómo detectarlo en terreno?)
                  </h4>
                  <ul className="space-y-2.5">
                    {selectedWaste.warningSigns.map((sign, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                        <span>{sign}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GUÍA DE HERRAMIENTAS (ÁRBOL DE DECISIÓN) */}
      {activeTab === 'guia' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
              <Workflow size={14} /> Orientador de Terreno
            </span>
            <h2 className="text-lg font-black text-slate-900">
              ¿Qué herramienta de Nexus Lean debo usar para mi problema?
            </h2>
            <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
              No todos los problemas se resuelven igual. Elige la herramienta adecuada según la complejidad, tiempo y alcance del problema.
            </p>
          </div>

          <div className="space-y-4">
            {TOOLS_GUIDE.map((guide, idx) => (
              <div
                key={guide.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 p-5 md:p-6 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center font-mono">
                      {idx + 1}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${guide.badgeColor}`}>
                      {guide.indicator}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    "{guide.problemSituation}"
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {guide.explanation}
                  </p>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-700">
                    <strong className="text-slate-900 font-bold">Ejemplo típico:</strong> {guide.practicalExample}
                  </div>
                </div>

                <div className="flex md:flex-col items-center md:items-end justify-between gap-3 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Herramienta</span>
                    <span className="text-sm font-black text-indigo-900 block">{guide.toolName}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(guide.nexusPath)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    <span>{guide.nexusActionLabel}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PONTE A PRUEBA (TRIVIA) */}
      {activeTab === 'trivia' && (
        <div className="max-w-3xl mx-auto space-y-6">
          {!triviaFinished ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
              {/* Trivia Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs">
                    <Flame size={16} />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Trivia de Conocimientos Lean</h3>
                    <p className="text-[11px] text-slate-400">Pregunta {currentTriviaIndex + 1} de {TRIVIA_QUESTIONS.length}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Puntaje:</span>
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-mono font-bold text-xs rounded-lg border border-indigo-100">
                    {score} / {TRIVIA_QUESTIONS.length}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${((currentTriviaIndex + 1) / TRIVIA_QUESTIONS.length) * 100}%` }}
                />
              </div>

              {/* Question Text */}
              <div className="space-y-2 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  Nivel: {TRIVIA_QUESTIONS[currentTriviaIndex].difficulty}
                </span>
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                  {TRIVIA_QUESTIONS[currentTriviaIndex].question}
                </h2>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {TRIVIA_QUESTIONS[currentTriviaIndex].options.map((opt, idx) => {
                  const isSelected = selectedAnswer === idx;
                  const isCorrect = idx === TRIVIA_QUESTIONS[currentTriviaIndex].correctIndex;

                  let optionStyles = 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100';

                  if (isAnswerSubmitted) {
                    if (isCorrect) {
                      optionStyles = 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-1 ring-emerald-400';
                    } else if (isSelected && !isCorrect) {
                      optionStyles = 'bg-rose-50 border-rose-300 text-rose-900';
                    }
                  } else if (isSelected) {
                    optionStyles = 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isAnswerSubmitted}
                      onClick={() => handleSelectOption(idx)}
                      className={`w-full text-left p-4 rounded-2xl border text-xs sm:text-sm font-medium transition-all flex items-center justify-between gap-3 ${optionStyles}`}
                    >
                      <span>{opt}</span>
                      {isAnswerSubmitted && isCorrect && <CheckCircle2 className="text-emerald-600 shrink-0" size={18} />}
                      {isAnswerSubmitted && isSelected && !isCorrect && (
                        <XCircle className="text-rose-600 shrink-0" size={18} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Feedback Explanation */}
              {isAnswerSubmitted && (
                <div
                  className={`p-4 rounded-2xl border text-xs leading-relaxed animate-fadeIn ${
                    selectedAnswer === TRIVIA_QUESTIONS[currentTriviaIndex].correctIndex
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <strong className="block font-bold mb-1">
                    {selectedAnswer === TRIVIA_QUESTIONS[currentTriviaIndex].correctIndex
                      ? '🎉 ¡Respuesta Correcta!'
                      : '💡 Explicación:'}
                  </strong>
                  <span>{TRIVIA_QUESTIONS[currentTriviaIndex].explanation}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">Aprende jugando con tu equipo</span>

                {!isAnswerSubmitted ? (
                  <button
                    type="button"
                    disabled={selectedAnswer === null}
                    onClick={handleConfirmAnswer}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                  >
                    Confirmar Respuesta
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2"
                  >
                    <span>{currentTriviaIndex + 1 === TRIVIA_QUESTIONS.length ? 'Ver Resultados' : 'Siguiente Pregunta'}</span>
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Results Screen */
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-6 animate-fadeIn shadow-sm">
              <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-3xl shadow-sm">
                🏆
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900">¡Trivia Completada!</h2>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  {score >= 5
                    ? '¡Excelente resultado! Tienes claros los conceptos fundamentales de la cultura Lean.'
                    : '¡Buen intento! Repasa el glosario y los 8 desperdicios para dominar todas las herramientas.'}
                </p>
              </div>

              <div className="inline-flex items-center gap-4 bg-slate-50 border border-slate-200 px-6 py-3 rounded-2xl">
                <div>
                  <span className="block text-2xl font-black text-indigo-600 font-mono">
                    {score} / {TRIVIA_QUESTIONS.length}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aciertos</span>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <span className="block text-2xl font-black text-slate-800 font-mono">
                    {Math.round((score / TRIVIA_QUESTIONS.length) * 100)}%
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Efectividad</span>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleRestartTrivia}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-xs"
                >
                  <RotateCcw size={14} />
                  <span>Intentar de Nuevo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('glosario')}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                >
                  Ir al Glosario
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FundamentalsPage;
