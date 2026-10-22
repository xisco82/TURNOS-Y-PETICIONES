import React, { useState } from 'react';
import { CalendarDays, KeyRound, Mail, LogIn, AlertCircle, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { APP_BRAND } from '../constants/branding';
import { InteractiveLogo } from './InteractiveLogo';

export const LoginForm: React.FC = () => {
  const { login, quickUsers, switchUser } = useAuth();
  const [email, setEmail] = useState('xiscoquin@gmail.com');
  const [password, setPassword] = useState('3090');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminDirectLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await login('xiscoquin@gmail.com', '3090');
    } catch {
      const admin = quickUsers.find(u => u.role === 'admin' || u.email === 'xiscoquin@gmail.com');
      if (admin) {
        switchUser(admin);
      } else {
        setErrorMsg('Error al conectar con la cuenta de administrador');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-950">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <InteractiveLogo size="xl" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{APP_BRAND.name}</h1>
          <p className="text-xs text-slate-500">{APP_BRAND.subtitle}</p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1-Click Direct Admin Access Button */}
        <button
          type="button"
          onClick={handleAdminDirectLogin}
          disabled={loading}
          className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 hover:from-indigo-500 hover:to-slate-800 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 active:scale-98 transition flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white font-black text-sm">
              🛡️
            </div>
            <div className="text-left">
              <div className="font-extrabold text-sm tracking-tight">Conectar como Administrador</div>
              <div className="text-[11px] text-indigo-200 font-mono">xiscoquin@gmail.com • Clave: 3090</div>
            </div>
          </div>
          <span className="text-[11px] font-bold bg-white text-indigo-900 px-3 py-1 rounded-xl shadow-xs group-hover:scale-105 transition">
            Entrar Ahora →
          </span>
        </button>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          <span className="flex-shrink mx-3 text-[11px] font-semibold text-slate-400">O ingresa manualmente</span>
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="xiscoquin@gmail.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
              Contraseña
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="3090"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Accediendo...' : 'Iniciar Sesión'}</span>
          </button>
        </form>

        {/* Quick Demo Access Bar */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Acceso rápido con un clic
            </span>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={handleAdminDirectLogin}
              className="p-2.5 text-left rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 transition cursor-pointer"
            >
              <div className="font-bold text-indigo-900 dark:text-indigo-200">Administrador</div>
              <div className="text-[10px] text-slate-500">xiscoquin@gmail.com</div>
            </button>

            <button
              onClick={() => {
                const emp = quickUsers.find(u => u.role === 'employee');
                if (emp) switchUser(emp);
              }}
              className="p-2.5 text-left rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 transition"
            >
              <div className="font-bold text-emerald-900 dark:text-emerald-200">Empleado (Ejemplo)</div>
              <div className="text-[10px] text-slate-500">Clave: emp1234</div>
            </button>
          </div>
        </div>

        {/* Derechos reservados */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center space-y-1">
          <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
            © {new Date().getFullYear()} {APP_BRAND.name}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            {APP_BRAND.copyrightText}
          </p>
        </div>
      </div>
    </div>
  );
};



