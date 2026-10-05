import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
          },
        },
      });

      if (signupError) throw signupError;

      setSuccess('¡Registro exitoso! Revisa tu correo electrónico para confirmar tu cuenta.');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err?.message || 'Error al procesar el registro.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050B14] flex font-sans selection:bg-cyan-500/30 overflow-hidden">
      {/* Left Panel - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 bg-gradient-to-br from-[#050B14] via-[#0A1628] to-[#050B14] overflow-hidden">
        <div className="absolute inset-0 z-0 h-full w-full">
          <div className="absolute -top-[20%] -left-[10%] w-[800px] h-[800px] bg-blue-600/20 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob pointer-events-none" />
          <div className="absolute top-[20%] -right-[20%] w-[600px] h-[600px] bg-cyan-500/10 rounded-full mix-blend-screen filter blur-[80px] opacity-20 animate-blob animation-delay-2000 pointer-events-none" />
          <div className="absolute -bottom-[10%] left-[20%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob animation-delay-4000 pointer-events-none" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-40 rounded-full" />
              <img src="/nexus-logo.svg" alt="Nexus Logo" className="h-10 w-auto relative" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white font-sans">
              NEXUS LEAN <span className="text-cyan-400">ULTRA BLUE</span>
            </span>
          </div>
        </div>

        <div className="relative z-10 w-full max-w-xl mx-auto flex flex-col justify-center">
          <div className="self-start inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/30 border border-cyan-500/30 text-cyan-400 text-xs font-semibold tracking-wider uppercase mb-6 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Acceso Corporativo
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6 font-sans">
            Únete a la <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              Revolución
            </span>{' '}
            <br />
            Operacional.
          </h1>

          <p className="text-slate-400 text-lg leading-relaxed mb-10 max-w-md font-sans">
            Comienza a digitalizar tus auditorías, proyectos A3 y resolución de anomalías en Gemba.
          </p>
        </div>

        <div className="relative z-10 text-xs text-slate-500 font-medium">
          © {new Date().getFullYear()} NEXUS LEAN ULTRA BLUE. ALL RIGHTS RESERVED.
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 relative bg-[#050B14] overflow-y-auto">
        <div className="w-full max-w-[420px] relative z-10 py-8">
          <div className="mb-8">
            <div className="mb-6 lg:hidden text-center">
              <img src="/nexus-logo.svg" alt="Nexus Logo" className="h-10 w-auto mx-auto mb-2" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2 font-sans">Crear Cuenta</h2>
            <p className="text-slate-400">Completa tus datos para registrarte en la plataforma.</p>
          </div>

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-lg mb-6 text-sm flex items-center animate-fade-in-up">
              <span className="mr-2">✅</span>
              {success}
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm flex items-center animate-shake">
              <span className="mr-2">⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Nombre Completo
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <input
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Tu Nombre"
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 pl-11 pr-4 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Correo Electrónico
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="tu@empresa.com"
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 pl-11 pr-4 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <input
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 pl-11 pr-4 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Confirmar Contraseña
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 pl-11 pr-4 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-cyan-500/20 transform transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <span>CREAR CUENTA</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-slate-800/50">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white font-medium transition-colors hover:translate-x-[-4px] duration-300"
            >
              <ArrowLeft size={16} /> Volver al Inicio de Sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
