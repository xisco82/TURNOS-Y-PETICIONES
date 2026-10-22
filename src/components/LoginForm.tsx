import React, { useState } from 'react';
import { CalendarDays, KeyRound, Mail, LogIn, AlertCircle, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';

export const LoginForm: React.FC = () => {
  const { login, quickUsers, switchUser } = useAuth();
  const [email, setEmail] = useState('admin@empresa.com');
  const [password, setPassword] = useState('admin');
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-950">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-gradient-to-tr from-slate-900 to-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-600/30">
            <CalendarDays className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">TurnoFácil</h1>
          <p className="text-xs text-slate-500">Gestión Profesional de Turnos y Solicitudes</p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

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
                placeholder="ejemplo@empresa.com"
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
                placeholder="••••••••"
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
              Acceso rápido de evaluación
            </span>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => {
                const admin = quickUsers.find(u => u.role === 'admin');
                if (admin) switchUser(admin);
              }}
              className="p-2.5 text-left rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 transition"
            >
              <div className="font-bold text-indigo-900 dark:text-indigo-200">Administrador</div>
              <div className="text-[10px] text-slate-500">Clave: admin</div>
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
      </div>
    </div>
  );
};
