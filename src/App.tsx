import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { LoginForm } from './components/LoginForm';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminScheduleManager } from './components/AdminScheduleManager';
import { GeneralScheduleView } from './components/GeneralScheduleView';
import { RequestsManager } from './components/RequestsManager';
import { EmployeeManager } from './components/EmployeeManager';
import { AuditAndBackups } from './components/AuditAndBackups';
import { EmployeeMyScheduleView } from './components/EmployeeMyScheduleView';
import { EmployeeProfileView } from './components/EmployeeProfileView';
import { AppSettingsModal } from './components/AppSettingsModal';
import { MandatoryTestsRunner } from './components/MandatoryTestsRunner';
import { OfflineIndicator } from './components/OfflineIndicator';
import { api } from './services/api';
import { User } from './types';
import { Shield, Clock, HelpCircle, Heart } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [employees, setEmployees] = useState<User[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showTests, setShowTests] = useState(false);

  const fetchEmployees = async () => {
    try {
      const list = await api.getUsers();
      setEmployees(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchEmployees();
      if (user.role === 'admin') {
        if (!['dashboard', 'manage-schedule', 'general-schedule', 'requests', 'employees', 'audit'].includes(activeTab)) {
          setActiveTab('dashboard');
        }
      } else {
        if (!['my-schedule', 'general-schedule', 'requests', 'my-profile'].includes(activeTab)) {
          setActiveTab('my-schedule');
        }
      }
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Iniciando TurnoFácil...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setShowSettings(true)}
        onOpenTests={() => setShowTests(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isAdmin ? (
          <>
            {activeTab === 'dashboard' && (
              <AdminDashboard onNavigate={setActiveTab} employees={employees} />
            )}
            {activeTab === 'manage-schedule' && (
              <AdminScheduleManager
                employees={employees}
                onSchedulePublished={() => {
                  fetchEmployees();
                  setActiveTab('general-schedule');
                }}
                onRefreshEmployees={fetchEmployees}
              />
            )}
            {activeTab === 'general-schedule' && <GeneralScheduleView />}
            {activeTab === 'requests' && <RequestsManager employees={employees} />}
            {activeTab === 'employees' && (
              <EmployeeManager employees={employees} onRefresh={fetchEmployees} />
            )}
            {activeTab === 'audit' && <AuditAndBackups />}
          </>
        ) : (
          <>
            {activeTab === 'my-schedule' && <EmployeeMyScheduleView />}
            {activeTab === 'general-schedule' && <GeneralScheduleView />}
            {activeTab === 'requests' && <RequestsManager employees={employees} />}
            {activeTab === 'my-profile' && <EmployeeProfileView />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">TurnoFácil</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Zona Horaria: Europe/Madrid</span>
            </span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">PWA Instalable</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => setShowTests(true)}
              className="text-indigo-600 hover:underline font-semibold"
            >
              Informe de Pruebas (Apartado 13)
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Ajustes y Guía
            </button>
            <span>Semanas Lunes a Domingo</span>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      {showSettings && (
        <AppSettingsModal
          onClose={() => setShowSettings(false)}
          onRefresh={fetchEmployees}
        />
      )}

      {/* Tests Modal */}
      {showTests && (
        <MandatoryTestsRunner
          employees={employees}
          onClose={() => setShowTests(false)}
        />
      )}

      {/* PWA Offline indicator */}
      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
