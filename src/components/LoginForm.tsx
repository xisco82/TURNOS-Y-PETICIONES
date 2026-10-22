import React, { useState } from 'react';
import { CalendarDays, KeyRound, Mail, LogIn, AlertCircle, Users, UserPlus, CheckCircle2, Phone, X, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { APP_BRAND } from '../constants/branding';
import { InteractiveLogo } from './InteractiveLogo';
import { api } from '../services/api';

export const LoginForm: React.FC = () => {
  const { login, quickUsers, switchUser } = useAuth();
  const [email, setEmail] = useState('xiscoquin@gmail.com');
  const [password, setPassword] = useState('3090');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // New employee registration modal
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [createdEmpInfo, setCreatedEmpInfo] = useState<{ name: string; email: string; pass: string } | null>(null);
  const [showCreatedPass, setShowCreatedPass] = useState(false);

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

  const handleRegisterEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim() || !newEmpEmail.trim()) {
      setErrorMsg('Nombre y correo electrónico son obligatorios');
      return;
    }

    setRegSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await api.registerEmployee({
        name: newEmpName.trim(),
        email: newEmpEmail.trim(),
        phone: newEmpPhone.trim() || undefined,
      });

      // Save info but do not expose password publicly on screen
      setCreatedEmpInfo({
        name: res.user.name,
        email: res.user.email,
        pass: res.tempPassword,
      });

      setSuccessBanner(
        `¡Cuenta creada con éxito para ${res.user.name}! Se han enviado las credenciales a su correo ${res.user.email}.`
      );

      // Log in as the newly created employee
      setTimeout(() => {
        switchUser(res.user);
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al crear la cuenta de empleado');
      setRegSubmitting(false);
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

        {successBanner && (
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span>{successBanner}</span>
              <p className="mt-1 font-semibold text-emerald-900">Entrando a la app para que definas tu contraseña...</p>
            </div>
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
              <div className="text-[11px] text-indigo-200 font-medium">xiscoquin@gmail.com • Acceso Seguro</div>
            </div>
          </div>
          <span className="text-[11px] font-bold bg-white text-indigo-900 px-3 py-1 rounded-xl shadow-xs group-hover:scale-105 transition">
            Entrar Ahora →
          </span>
        </button>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          <span className="flex-shrink mx-3 text-[11px] font-semibold text-slate-400">O ingresa con tus credenciales</span>
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
                placeholder="tu.correo@empresa.com"
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
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-wider"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
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

        {/* Quick Access Bar & Employee Registration trigger */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between mb-1">
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
              <div className="text-[10px] text-slate-500 truncate">xiscoquin@gmail.com</div>
            </button>

            <button
              onClick={() => setShowEmployeeModal(true)}
              className="p-2.5 text-left rounded-xl border border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 transition cursor-pointer group"
            >
              <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                <span>Empleado</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-600 text-white font-bold">+ Crear</span>
              </div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-300">Crear usuario / Entrar</div>
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

      {/* EMPLOYEE ACCESS & REGISTRATION MODAL */}
      {showEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Acceso de Empleado</h3>
                  <p className="text-[11px] text-slate-500">Crea tu cuenta nueva o accede si ya eres empleado</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowEmployeeModal(false);
                  setCreatedEmpInfo(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdEmpInfo ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl space-y-3 text-xs">
                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>¡Usuario Creado y Notificado!</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  Se ha registrado la cuenta para <strong>{createdEmpInfo.name}</strong> y se ha enviado la clave inicial a su correo <strong>{createdEmpInfo.email}</strong>.
                </p>

                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-emerald-200 dark:border-emerald-700 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Datos de la cuenta:</span>
                  <div className="text-xs"><strong>Correo:</strong> <span className="font-mono">{createdEmpInfo.email}</span></div>
                  
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <strong className="text-xs">Contraseña inicial: </strong>
                      <span className="font-mono text-xs font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700">
                        {showCreatedPass ? createdEmpInfo.pass : '••••••••'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCreatedPass(!showCreatedPass)}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      {showCreatedPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showCreatedPass ? 'Ocultar' : 'Revelar'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-900 dark:text-indigo-200 text-[11px] flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <span>A continuación entrarás a la aplicación y se te pedirá definir tu nueva contraseña personal secreta.</span>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setShowEmployeeModal(false)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs"
                  >
                    Continuar al Panel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Registration Form */}
                <form onSubmit={handleRegisterEmployeeSubmit} className="space-y-3 text-xs">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    1. Crear Nuevo Empleado (Recibir clave por correo)
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Nombre y Apellidos *
                    </label>
                    <input
                      type="text"
                      value={newEmpName}
                      onChange={e => setNewEmpName(e.target.value)}
                      placeholder="Ej: Laura Martínez Gomis"
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      value={newEmpEmail}
                      onChange={e => setNewEmpEmail(e.target.value)}
                      placeholder="tu.correo@ejemplo.com"
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      A este correo se enviará la contraseña inicial y los avisos de cuadrantes.
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Teléfono móvil (Opcional)
                    </label>
                    <input
                      type="tel"
                      value={newEmpPhone}
                      onChange={e => setNewEmpPhone(e.target.value)}
                      placeholder="+34 600 000 000"
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={regSubmitting}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{regSubmitting ? 'Creando cuenta...' : 'Crear Cuenta y Recibir Contraseña'}</span>
                  </button>
                </form>

                {/* Existing employees quick list */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    2. O conectar como empleado existente
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {quickUsers
                      .filter(u => u.role === 'employee')
                      .slice(0, 6)
                      .map(emp => (
                        <div
                          key={emp.id}
                          onClick={() => {
                            switchUser(emp);
                            setShowEmployeeModal(false);
                          }}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-slate-800 transition cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white block">{emp.name}</span>
                            <span className="text-[10px] text-slate-400">{emp.email}</span>
                          </div>
                          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                            Entrar →
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
