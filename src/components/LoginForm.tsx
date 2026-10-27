import React, { useState } from 'react';
import { User as UserIcon, KeyRound, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { APP_BRAND } from '../constants/branding';
import { InteractiveLogo } from './InteractiveLogo';

export const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('xiscoquin@gmail.com');
  const [password, setPassword] = useState('3090');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMsg('Por favor introduce tu usuario o correo y la contraseña');
      return;
    }
    setErrorMsg(null);
    setLoading(true);

    try {
      await login(identifier.trim(), password.trim());
    } catch (err: any) {
      setErrorMsg(err.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-[420px] bg-white rounded-[32px] shadow-2xl p-8 sm:p-9 space-y-6 text-slate-800 animate-in fade-in zoom-in-95">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <InteractiveLogo size="xl" />
          </div>
          <div className="pt-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {APP_BRAND.name}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Portal Oficial de Gestión de Turnos y Cuadrantes
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-800 border border-rose-200 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold mb-1.5 text-slate-700">
              Usuario o Correo Electrónico
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="Nombre, usuario o correo corporativo"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 bg-white text-slate-900 text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 transition"
                required
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1.5 text-slate-700">
              Contraseña
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Introduce tu contraseña"
                className="w-full pl-10 pr-11 py-3 rounded-2xl border border-slate-300 bg-white text-slate-900 text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 font-mono tracking-wider transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm mt-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Iniciando Sesión...' : 'Iniciar Sesión'}</span>
          </button>
        </form>

        {/* Footer */}
        <div className="pt-2 text-center space-y-1">
          <p className="text-xs font-semibold text-slate-600">
            Hotel HM Gran Fiesta
          </p>
          <p className="text-[11px] text-slate-400 font-medium">
            © 2026 Xisco G. H.
          </p>
        </div>
      </div>
    </div>
  );
};
