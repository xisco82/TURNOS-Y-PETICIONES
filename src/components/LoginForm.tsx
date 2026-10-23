import React, { useState } from 'react';
import {
  CalendarDays,
  KeyRound,
  Mail,
  LogIn,
  AlertCircle,
  Users,
  UserPlus,
  CheckCircle2,
  Phone,
  X,
  ShieldCheck,
  Eye,
  EyeOff,
  Database,
  IdCard,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { APP_BRAND } from '../constants/branding';
import { InteractiveLogo } from './InteractiveLogo';
import { api } from '../services/api';
import { DatabaseSyncIndicator } from './DatabaseSyncIndicator';
import { DatabaseConnectionVerifierModal } from './DatabaseConnectionVerifierModal';

export const LoginForm: React.FC = () => {
  const { login, quickUsers, switchUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'register-dni' | 'reset-dni'>('login');

  // Form states - Login
  const [identifier, setIdentifier] = useState(''); // Email or DNI
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form states - Register with DNI
  const [regDni, setRegDni] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [verifiedEmployee, setVerifiedEmployee] = useState<{
    id: string;
    name: string;
    dni: string;
    email: string;
    isRegistered: boolean;
  } | null>(null);
  const [verifyingDni, setVerifyingDni] = useState(false);

  // Form states - Reset password with DNI
  const [resetDni, setResetDni] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');

  // General feedback states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Database Connection Verifier Modal
  const [showDbVerifier, setShowDbVerifier] = useState(false);

  // Handlers
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMsg('Por favor introduce tu Correo o DNI y la contraseña');
      return;
    }
    setErrorMsg(null);
    setLoading(true);

    try {
      await login(identifier.trim(), password.trim());
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDni = async () => {
    if (!regDni.trim()) {
      setErrorMsg('Introduce tu DNI o NIE para verificar');
      return;
    }
    setVerifyingDni(true);
    setErrorMsg(null);
    try {
      const res = await api.verifyDni(regDni.trim());
      setVerifiedEmployee(res.employee);
      if (res.employee.email && !res.employee.email.includes('pendiente.es')) {
        setRegEmail(res.employee.email);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'DNI no encontrado');
      setVerifiedEmployee(null);
    } finally {
      setVerifyingDni(false);
    }
  };

  const handleRegisterDniSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regDni.trim()) {
      setErrorMsg('El DNI es obligatorio');
      return;
    }
    if (!regEmail.trim()) {
      setErrorMsg('El correo electrónico es obligatorio');
      return;
    }
    if (!regPassword.trim() || regPassword.trim().length < 4) {
      setErrorMsg('La contraseña debe tener al menos 4 caracteres');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.registerWithDni({
        dni: regDni.trim(),
        email: regEmail.trim(),
        password: regPassword.trim(),
        phone: regPhone.trim() || undefined,
      });

      setSuccessBanner(res.message);
      setTimeout(() => {
        switchUser(res.user);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al completar el alta con DNI');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetDni.trim()) {
      setErrorMsg('El DNI es obligatorio para restablecer la contraseña');
      return;
    }
    if (!resetNewPassword.trim() || resetNewPassword.trim().length < 4) {
      setErrorMsg('La nueva contraseña debe tener al menos 4 caracteres');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.resetPassword({
        dni: resetDni.trim(),
        email: resetEmail.trim() || undefined,
        newPassword: resetNewPassword.trim(),
      });

      setSuccessBanner(res.message);
      setIdentifier(resetDni.trim());
      setPassword(resetNewPassword.trim());
      setTimeout(() => {
        setActiveTab('login');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-5 bg-slate-100 dark:bg-slate-950 font-sans">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-5">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <InteractiveLogo size="xl" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {APP_BRAND.name}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {APP_BRAND.subtitle}
          </p>
        </div>

        {/* Database Connection Test Verifier Trigger Banner */}
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => setShowDbVerifier(true)}
            className="w-full p-2.5 px-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-800 transition cursor-pointer text-xs flex items-center justify-between group shadow-2xs"
            title="Abrir Verificador de test de conexión con la base de datos"
          >
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div className="text-left">
                <span className="font-bold text-emerald-900 dark:text-emerald-200 block">
                  Verificador de Test de Conexión BD
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                  Dual-Engine: Archivo Local + Firestore Cloud
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 group-hover:translate-x-0.5 transition">
              <span>Ejecutar Test</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMsg(null);
            }}
            className={`py-2 px-1 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Iniciar Sesión</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('register-dni');
              setErrorMsg(null);
            }}
            className={`py-2 px-1 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'register-dni'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <IdCard className="w-3.5 h-3.5" />
            <span>Alta con DNI</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('reset-dni');
              setErrorMsg(null);
            }}
            className={`py-2 px-1 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'reset-dni'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Resetear Clave</span>
          </button>
        </div>

        {/* Messages */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successBanner && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successBanner}</span>
          </div>
        )}

        {/* TAB 1: LOGIN (EMAIL OR DNI) */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs pt-1">
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Correo Electrónico o DNI / NIE
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="Ej: 43134155-R o tu.correo@empresa.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Puedes identificarte indistintamente con tu número de DNI oficial o con tu correo.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => setActiveTab('reset-dni')}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Introduce tu contraseña"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-wider text-slate-900 dark:text-white"
                  required
                  autoComplete="current-password"
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
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Accediendo...' : 'Iniciar Sesión'}</span>
            </button>
          </form>
        )}

        {/* TAB 2: ALTA CON DNI */}
        {activeTab === 'register-dni' && (
          <form onSubmit={handleRegisterDniSubmit} className="space-y-3.5 text-xs pt-1">
            <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-1">
              <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <IdCard className="w-4 h-4 text-emerald-600" />
                <span>Alta y Activación de Cuenta mediante DNI</span>
              </span>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                Introduce tu DNI/NIE oficial asignado. El sistema te identificará para que añadas tu correo personal y elijas tu contraseña.
              </p>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                1. DNI o NIE del Empleado *
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <IdCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={regDni}
                    onChange={e => {
                      setRegDni(e.target.value);
                      setVerifiedEmployee(null);
                    }}
                    placeholder="Ej: 43134155-R o X4366728V"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none uppercase font-mono font-bold tracking-wider"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={handleVerifyDni}
                  disabled={verifyingDni || !regDni.trim()}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{verifyingDni ? 'Buscando...' : 'Verificar DNI'}</span>
                </button>
              </div>
            </div>

            {verifiedEmployee && (
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-emerald-300 dark:border-emerald-700 space-y-1 animate-in fade-in">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Identidad Confirmada:</span>
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{verifiedEmployee.name}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">DNI Oficial: {verifiedEmployee.dni}</div>
              </div>
            )}

            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                2. Tu Correo Electrónico *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  placeholder="tu.correo@ejemplo.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                3. Elige tu Contraseña *
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 font-mono tracking-wider"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Teléfono móvil (Opcional)
              </label>
              <input
                type="tel"
                value={regPhone}
                onChange={e => setRegPhone(e.target.value)}
                placeholder="+34 600 000 000"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Dando de alta...' : 'Completar Alta y Entrar'}</span>
            </button>
          </form>
        )}

        {/* TAB 3: RESETEAR CLAVE */}
        {activeTab === 'reset-dni' && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs pt-1">
            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-1">
              <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <span>Restablecimiento Inmediato de Contraseña</span>
              </span>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                Introduce tu DNI registrado para definir inmediatamente tu nueva contraseña sin esperas.
              </p>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Tu DNI / NIE *
              </label>
              <div className="relative">
                <IdCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={resetDni}
                  onChange={e => setResetDni(e.target.value)}
                  placeholder="Ej: 43134155-R"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none uppercase font-mono font-bold tracking-wider"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Correo Electrónico (Opcional, para verificación)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="tu.correo@empresa.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Nueva Contraseña *
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={resetNewPassword}
                  onChange={e => setResetNewPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none font-mono tracking-wider"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-md shadow-amber-600/20 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{loading ? 'Restableciendo...' : 'Restablecer Contraseña'}</span>
            </button>
          </form>
        )}

        {/* Quick evaluation / employee list reference */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <span>Censo Oficial de Empleados y DNIs</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">10 Empleados</span>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
            {quickUsers.map(u => (
              <div
                key={u.id}
                onClick={() => {
                  if (activeTab === 'login') {
                    setIdentifier(u.dni || u.email);
                    setPassword(u.tempPassword || 'emp1234');
                  } else if (activeTab === 'register-dni') {
                    setRegDni(u.dni || '');
                    setRegEmail(u.email);
                  } else {
                    setResetDni(u.dni || '');
                  }
                }}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/40 dark:hover:bg-slate-800/60 transition cursor-pointer flex items-center justify-between text-xs group"
                title="Haz clic para autocompletar credenciales"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {u.name}
                    </span>
                    {u.role === 'admin' && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    {u.dni && (
                      <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1 rounded border border-emerald-200 dark:border-emerald-800">
                        {u.dni}
                      </span>
                    )}
                    <span className="truncate">{u.email}</span>
                  </div>
                </div>

                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                  Usar →
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center space-y-1">
          <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
            © {new Date().getFullYear()} {APP_BRAND.name}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            {APP_BRAND.copyrightText}
          </p>
        </div>
      </div>

      {/* Database Connection Verifier Modal */}
      <DatabaseConnectionVerifierModal
        isOpen={showDbVerifier}
        onClose={() => setShowDbVerifier(false)}
      />
    </div>
  );
};
