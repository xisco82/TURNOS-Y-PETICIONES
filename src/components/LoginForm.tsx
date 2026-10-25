import React, { useState } from 'react';
import {
  KeyRound,
  LogIn,
  AlertCircle,
  Eye,
  EyeOff,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { APP_BRAND } from '../constants/branding';
import { InteractiveLogo } from './InteractiveLogo';

export const LoginForm: React.FC = () => {
  const { login } = useAuth();

  // Form states - Only User/Email and Password
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
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
      setErrorMsg(err.message || 'Credenciales no válidas. Por favor, verifica tus datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-4 sm:p-6">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <InteractiveLogo size="lg" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {APP_BRAND.name}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Portal Oficial de Gestión de Turnos y Cuadrantes
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
            <span className="leading-relaxed font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Login Form: Clean, only Usuario/Correo and Contraseña */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Usuario o Correo Electrónico
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="Nombre, usuario o correo corporativo"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white transition"
                required
                autoFocus
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Introduce tu contraseña"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white transition font-mono"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-600/25 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Accediendo...' : 'Iniciar Sesión'}</span>
          </button>
        </form>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center space-y-1">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {APP_BRAND.name}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} {APP_BRAND.copyrightText}
          </p>
        </div>
      </div>
    </div>
  );
};
