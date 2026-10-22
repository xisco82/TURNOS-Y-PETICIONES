import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition active:scale-95"
        title="Instalar en la pantalla de inicio"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Añadir a inicio</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl text-indigo-600">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Instalar en iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <p className="flex items-start gap-2">
                  <span className="font-bold text-indigo-600">1.</span>
                  <span>Toca el botón <strong>Compartir</strong> <span className="inline-block px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-xs">⎋</span> en la barra de Safari.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-bold text-indigo-600">2.</span>
                  <span>Baja y pulsa en <strong>«Añadir a la pantalla de inicio»</strong>.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-bold text-indigo-600">3.</span>
                  <span>Pulsa <strong>Añadir</strong> en la esquina superior derecha.</span>
                </p>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 py-2.5 text-sm font-semibold hover:opacity-90 transition"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
