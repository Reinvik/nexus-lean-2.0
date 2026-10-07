import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader2, WifiOff, ClipboardCheck, User } from 'lucide-react';

const LEAN_QUOTES = [
  { text: 'Sin estándares no puede haber mejora.', author: 'Taiichi Ohno' },
  { text: 'La mejor herramienta es la que se usa en el Gemba, no en la oficina.', author: 'Shigeo Shingo' },
  { text: '¿Para qué sirve la velocidad si no vas por el camino correcto?', author: 'Masaaki Imai' },
  { text: 'Los datos son importantes, pero confío más en mis ojos.', author: 'Kiichiro Toyoda' },
  { text: 'La excelencia no es un acto, es un hábito.', author: 'Aristóteles (Kaizen)' },
  { text: 'Muda (desperdicio) es cualquier cosa que no agrega valor al cliente.', author: 'Lean Philosophy' },
];

export const LoginPage: React.FC = () => {
  const { login, logout, user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'colaborador'>('colaborador');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const navigate = useNavigate();

  // Rotate quotes every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % LEAN_QUOTES.length);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Load saved credentials
  useEffect(() => {
    const savedEmail = localStorage.getItem('saved_email');
    const savedPassword = localStorage.getItem('saved_password');

    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    if (savedPassword) {
      try {
        setPassword(atob(savedPassword));
      } catch (e) {
        console.error('Error decoding saved password');
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    try {
      const cleanEmail = email.trim();
      const result = await login(cleanEmail, password);
      if (!result || !result.success) {
        if (result?.message?.includes('Invalid login credentials')) {
          setError('Correo o contraseña incorrectos. Verifica tus datos de acceso.');
        } else {
          setError(result?.message || 'Credenciales no reconocidas. Revisa tu estándar de acceso.');
        }
      } else {
        if (rememberMe) {
          localStorage.setItem('saved_email', cleanEmail);
          localStorage.setItem('saved_password', btoa(password));
        } else {
          localStorage.removeItem('saved_email');
          localStorage.removeItem('saved_password');
        }
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050B14] flex flex-col lg:flex-row font-sans selection:bg-cyan-500/30 overflow-y-auto">
      {/* Left Panel - Hero Section (Premium Display) */}
      <div className="flex w-full lg:w-1/2 relative flex-col justify-between p-8 sm:p-12 bg-gradient-to-br from-[#050B14] via-[#0A1628] to-[#050B14] overflow-hidden min-h-screen">
        {/* Background Effects */}
        <div className="absolute inset-0 z-0 h-full w-full">
          {/* Centered smooth glow at the bottom */}
          <div className="absolute -bottom-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/20 rounded-full mix-blend-screen filter blur-[120px] opacity-40 pointer-events-none" />
        </div>

        {/* Content Top Logo */}
        <div className="relative z-10">
          <div className="flex flex-col gap-1 mb-2">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-40 rounded-full" />
                <img src="/nexus-logo.svg" alt="Nexus Logo" className="h-10 w-auto relative" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                NEXUS <span className="text-cyan-400">LEAN</span>
              </span>
            </div>
          </div>
        </div>

        {/* Center Hero Information */}
        <div className="relative z-10 w-full max-w-xl mx-auto flex flex-col justify-center my-auto py-8">
          <div className="self-start inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/30 border border-cyan-500/30 text-cyan-400 text-sm font-semibold tracking-wider uppercase mb-6 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Excelencia Operacional 4.0
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold text-white leading-tight mb-6 font-sans">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              Ingeniería, Gemba e IA:
            </span>{' '}
            <br />
            Donde la excelencia <br />
            converge.
          </h1>

          <p className="text-slate-400 text-lg sm:text-2xl font-medium leading-relaxed mb-8 max-w-2xl font-sans">
            Bienvenido a Nexus Lean. Minimizamos el tiempo de reporte para maximizar la resolución en
            el Gemba. Seguimientos claros, datos en tiempo real y resultados contundentes.
          </p>

          {/* Rotating Lean Quotes - Left Panel */}
          <div className="relative h-40 w-full overflow-hidden mb-10">
            {/* Custom vertical line */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-28 w-1 bg-cyan-500/50" />
            {LEAN_QUOTES.map((quote, index) => (
              <div
                key={index}
                className={`absolute inset-0 flex flex-col justify-center pl-16 transition-all duration-1000 transform ${
                  index === currentQuoteIndex
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-4 pointer-events-none'
                }`}
              >
                <p className="text-slate-300 italic text-lg leading-relaxed">"{quote.text}"</p>
                <p className="text-cyan-500 text-base font-bold mt-4">— {quote.author}</p>
              </div>
            ))}
          </div>

          {/* Abstract Visualization */}
          <div className="relative w-full h-64 sm:h-96 overflow-hidden bg-transparent group">
            <div className="absolute inset-0 bg-transparent" />

            {/* Animated particles mockup */}
            <div className="absolute inset-0 flex items-center justify-center opacity-60">
              <div className="absolute w-64 h-64 bg-cyan-500/20 rounded-full filter blur-xl animate-pulse" />
              <div className="grid grid-cols-6 gap-8 transform rotate-12">
                {[...Array(24)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-float"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>

            <div className="absolute bottom-24 left-4 flex items-center gap-2 text-xs font-medium text-cyan-300/80">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              Motor de IA Nexus: Calibrado y Activo
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-500 font-medium pt-4">
          © {new Date().getFullYear()} NEXUS ENTERPRISE. ALL RIGHTS RESERVED.
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 relative bg-[#050B14] min-h-[100dvh]">
        {/* Mobile Background Effects */}
        <div className="absolute inset-0 lg:hidden overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] right-[-20%] w-96 h-96 bg-cyan-600/10 rounded-full filter blur-3xl opacity-20" />
        </div>

        <div className="w-full max-w-[420px] relative z-10 py-8">
          <div className="mb-8">
            <h2 className="text-xl sm:text-3xl font-bold text-white mb-2 leading-tight font-sans">
              Bienvenido al <br className="hidden sm:block" /> Ecosistema Nexus
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Centro de comando para la Excelencia Operacional 4.0.
            </p>
          </div>

          {/* Role Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-900/80 rounded-xl mb-8 border border-slate-800">
            <button
              type="button"
              onClick={() => setRole('admin')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all ${
                role === 'admin'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-900/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <ClipboardCheck size={16} />
              <span>Administrador</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('colaborador')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all ${
                role === 'colaborador'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-900/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <User size={16} />
              <span>Colaborador</span>
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm flex items-center animate-shake">
              <span className="mr-2">⚠️</span>
              {error}
            </div>
          )}

          {user ? (
            <div className="space-y-6 text-center animate-in fade-in zoom-in duration-300">
              <div className="mx-auto w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mb-4 border border-cyan-500/30">
                <User className="w-10 h-10 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2 font-sans">¡Hola de nuevo!</h3>
                <p className="text-slate-400 text-sm mb-6">
                  Sesión activa como <span className="text-cyan-400 font-medium">{user.email}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="w-full bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-cyan-500/20 transform transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-center gap-2 group"
              >
                <span>CONTINUAR AL SISTEMA</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={logout}
                className="w-full bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <span>CERRAR SESIÓN</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="login-email"
                  className="text-xs font-bold text-slate-500 uppercase tracking-wider"
                >
                  CORREO CORPORATIVO
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                  </div>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3.5 pl-11 pr-4 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                    placeholder="usuario@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label
                    htmlFor="login-password"
                    className="text-xs font-bold text-slate-500 uppercase tracking-wider"
                  >
                    CLAVE DE ACCESO
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-cyan-500 hover:text-cyan-400 font-bold transition-colors"
                  >
                    ¿OLVIDASTE TU CLAVE?
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                  </div>
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3.5 pl-11 pr-4 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-offset-slate-900 focus:ring-cyan-500/30 accent-cyan-500"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-400">
                  Recordar mi sesión
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn || loading}
                className="w-full bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-cyan-500/20 transform transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
              >
                {isLoggingIn || loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Sincronizando con el Gemba...</span>
                  </>
                ) : (
                  <>
                    <span>INICIAR SESIÓN</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Mobile Quotes Display */}
          <div className="mt-12 lg:hidden relative py-6 border-y border-slate-800/50">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-1 bg-cyan-500/50" />
            <div className="pl-6 h-20 flex flex-col justify-center">
              {LEAN_QUOTES.map((quote, index) => (
                <div
                  key={index}
                  className={`absolute transition-all duration-1000 transform ${
                    index === currentQuoteIndex
                      ? 'opacity-100 translate-x-0'
                      : 'opacity-0 translate-x-4 pointer-events-none'
                  }`}
                >
                  <p className="text-slate-400 italic text-sm leading-snug">"{quote.text}"</p>
                  <p className="text-cyan-500 text-xs font-bold mt-2">— {quote.author}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Mode Offline Divider */}
          <div className="mt-4 relative flex py-5 items-center">
            <div className="flex-grow border-t border-slate-800" />
            <span className="flex-shrink-0 mx-4 text-slate-600 text-xs font-bold uppercase tracking-widest">
              Modo Offline
            </span>
            <div className="flex-grow border-t border-slate-800" />
          </div>

          {/* Offline Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Link
              to="/5s-cards"
              className="flex items-center justify-center gap-2 py-3 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800/80 hover:border-cyan-500/30 hover:text-cyan-400 transition-all text-slate-300 text-sm font-medium group"
            >
              <WifiOff size={16} className="group-hover:scale-110 transition-transform" />
              <span className="font-bold">Tarjeta 5S</span>
            </Link>
            <Link
              to="/5s-audits"
              className="flex items-center justify-center gap-2 py-3 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800/80 hover:border-cyan-500/30 hover:text-cyan-400 transition-all text-slate-300 text-sm font-medium group"
            >
              <WifiOff size={16} className="group-hover:scale-110 transition-transform" />
              <span className="font-bold">Auditoría 5S</span>
            </Link>
          </div>

          <div className="mt-10 text-center">
            <p className="text-slate-500 text-sm">
              ¿No tienes acceso?{' '}
              <Link
                to="/register"
                className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors"
              >
                Solicita una invitación
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
