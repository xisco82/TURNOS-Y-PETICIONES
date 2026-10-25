import React, { useState, useEffect } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Eye,
  Lock,
  Clock,
  Sparkles,
  Download,
  Palette,
  Check,
} from 'lucide-react';
import { WeekSchedule } from '../types';
import { formatDaySpanish, getWeekDates } from '../utils/scheduleParser';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getShiftStyle, PRESET_TEXT_COLORS } from '../utils/shiftStyles';

export const GeneralScheduleView: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<WeekSchedule[]>([]);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin';
  const [showColorToolbar, setShowColorToolbar] = useState(false);
  const [selectedCodeToColor, setSelectedCodeToColor] = useState('AP');
  const [customColorOverrides, setCustomColorOverrides] = useState<Record<string, { textColor?: string }>>(() => {
    try {
      const raw = localStorage.getItem('schedule_custom_colors');
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      AP: { textColor: '#16a34a' },
    };
  });

  const handleSetCodeColor = (code: string, color: string) => {
    const updated = {
      ...customColorOverrides,
      [code.toUpperCase()]: { textColor: color },
    };
    setCustomColorOverrides(updated);
    try {
      localStorage.setItem('schedule_custom_colors', JSON.stringify(updated));
    } catch {}
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const list = await api.getSchedules();
        setSchedules(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) {
    return <div className="py-12 text-center text-sm text-slate-500">Cargando cuadrante general...</div>;
  }

  if (schedules.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center max-w-lg mx-auto shadow-xs">
        <Calendar className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
        <h3 className="font-bold text-slate-900 dark:text-white text-sm">No hay cuadrantes disponibles</h3>
        <p className="text-xs text-slate-500 mt-1">Aún no se han guardado ni publicado cuadrantes semanales.</p>
      </div>
    );
  }

  const currentSchedule = schedules[selectedWeekIndex] || schedules[0];
  const weekDates = getWeekDates(currentSchedule.weekStartDate);

  const filteredRows = currentSchedule.rows.filter(r =>
    r.employeeName.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="space-y-4">
      {/* Top Header & Navigation */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
              Cuadrante General de la Empresa
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                currentSchedule.status === 'published'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50'
              }`}
            >
              {currentSchedule.status === 'published' ? `Publicado v${currentSchedule.version}` : 'Borrador'}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
            {currentSchedule.weekLabel}
          </h2>
        </div>

        {/* Filters and Week Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar empleado..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 w-44"
            />
          </div>

          {/* Color Customizer Button */}
          <button
            onClick={() => setShowColorToolbar(!showColorToolbar)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
              showColorToolbar
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
            title="Pintar o personalizar el color de la letra para cualquier turno (AP, L, M, T, etc.)"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Pintar Colores</span>
          </button>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setSelectedWeekIndex(prev => Math.max(0, prev - 1))}
              disabled={selectedWeekIndex === 0}
              className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 transition"
              title="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4 text-slate-700 dark:text-slate-200" />
            </button>
            <span className="text-xs font-semibold px-2 text-slate-700 dark:text-slate-200 whitespace-nowrap">
              {selectedWeekIndex + 1} / {schedules.length}
            </span>
            <button
              onClick={() => setSelectedWeekIndex(prev => Math.min(schedules.length - 1, prev + 1))}
              disabled={selectedWeekIndex === schedules.length - 1}
              className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 transition"
              title="Semana siguiente"
            >
              <ChevronRight className="w-4 h-4 text-slate-700 dark:text-slate-200" />
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Color Toolbar (Personalizar colores de letra para turnos) */}
      {showColorToolbar && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900/40 shadow-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-indigo-600" />
              <span>Color de letra para:</span>
            </span>

            {/* Shift code picker */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {['AP', 'L', 'M', 'T', 'N', 'BP'].map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedCodeToColor(c)}
                  className={`px-2.5 py-1 text-xs font-extrabold rounded-lg transition ${
                    selectedCodeToColor === c
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Quick color swatches */}
            <div className="flex items-center gap-1.5">
              {PRESET_TEXT_COLORS.map(p => {
                const isSelected = customColorOverrides[selectedCodeToColor]?.textColor === p.value;
                return (
                  <button
                    key={p.value}
                    onClick={() => handleSetCodeColor(selectedCodeToColor, p.value)}
                    className={`w-6 h-6 rounded-full border-2 transition transform active:scale-90 flex items-center justify-center ${
                      isSelected ? 'border-indigo-600 scale-110 shadow-sm' : 'border-slate-200 dark:border-slate-700 hover:scale-105'
                    }`}
                    style={{ backgroundColor: p.value }}
                    title={`Pintar letra de ${selectedCodeToColor} en ${p.name}`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white mix-blend-difference" />}
                  </button>
                );
              })}

              {/* Native color picker for any custom color */}
              <label className="cursor-pointer relative flex items-center gap-1 ml-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-600">
                <input
                  type="color"
                  value={customColorOverrides[selectedCodeToColor]?.textColor || '#000000'}
                  onChange={e => handleSetCodeColor(selectedCodeToColor, e.target.value)}
                  className="w-6 h-6 rounded-full p-0 border-0 cursor-pointer opacity-0 absolute"
                />
                <span className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  🎨 Selector libre
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="bg-yellow-400 text-black px-2 py-0.5 rounded font-extrabold text-[10px]">L: Casilla amarilla / Letra negra</span>
            <span className="text-emerald-600 font-extrabold text-[10px]">AP: Verde</span>
          </div>
        </div>
      )}

      {/* Turnos Oficiales Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-3.5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
            Horarios Oficiales:
          </span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-[11px]">
            <span className="font-black text-sky-800 dark:text-sky-200">M</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">08:00 a 16:00</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-[11px]">
            <span className="font-black text-amber-800 dark:text-amber-200">T</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">16:00 a 0:00</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 text-[11px]">
            <span className="font-black text-violet-800 dark:text-violet-200">N</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">0:00 a 08:00 🌙</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FACC15] text-[#000000] border border-yellow-500 font-black shadow-xs text-[11px]">
            <span>L</span>
            <span className="font-bold">Libre</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 font-extrabold text-emerald-600 dark:text-emerald-400 text-[11px]">
            <span>AP</span>
            <span className="font-bold">Asuntos Propios</span>
          </div>
        </div>

        <span className="text-[11px] text-slate-400 font-medium hidden md:inline">
          8 horas por turno de trabajo
        </span>
      </div>

      {/* Grid Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto touch-pan-x">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-bold sticky left-0 bg-slate-100/95 dark:bg-slate-800 z-10 min-w-[130px] sm:min-w-[170px] border-r border-slate-200 dark:border-slate-700">
                  Empleado
                </th>
                {weekDates.map(dateStr => {
                  const info = formatDaySpanish(dateStr);
                  return (
                    <th key={dateStr} className="py-2.5 sm:py-3 px-2 sm:px-3 font-semibold min-w-[95px] sm:min-w-[110px] text-center border-r border-slate-200 dark:border-slate-700">
                      <div className="font-bold text-slate-800 dark:text-slate-100">{info.dayName}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {info.dayNumber} {info.monthName.slice(0, 3)}
                      </div>
                    </th>
                  );
                })}
                <th className="py-2.5 sm:py-3 px-3 font-bold text-right min-w-[80px]">Total Semanal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.map(row => {
                const isMe = row.employeeId === user?.id;

                return (
                  <tr
                    key={row.employeeId}
                    className={`transition ${
                      isMe
                        ? 'bg-indigo-50/40 dark:bg-indigo-950/20 font-semibold'
                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-2 sm:py-3 px-3 sm:px-4 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-900 dark:text-white truncate font-medium">{row.employeeName}</span>
                        {isMe && (
                          <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-bold">
                            TÚ
                          </span>
                        )}
                      </div>
                    </td>

                    {weekDates.map(dateStr => {
                      const shift = row.days[dateStr];

                      // Strict privacy enforcement:
                      // If the shift is a sick leave or absence, and user is NOT admin and NOT this employee,
                      // never show sensitive reason, show only "No disponible" or code!
                      let displayLabel = shift ? shift.rawText : 'LIBRE';
                      if (!isAdmin && !isMe && shift?.type === 'sick') {
                        displayLabel = 'No disponible';
                      }

                      const mergedOverrides = {
                        ...(currentSchedule.colorOverrides || {}),
                        ...customColorOverrides,
                      };
                      const shiftStyle = getShiftStyle(shift, mergedOverrides);

                      return (
                        <td
                          key={dateStr}
                          className={shiftStyle.tdClasses}
                        >
                          <div
                            className={shiftStyle.badgeClasses}
                            style={shiftStyle.style}
                          >
                            <div
                              className="font-black text-xs leading-tight"
                              style={shiftStyle.isFree ? { color: '#000000' } : undefined}
                            >
                              {displayLabel}
                            </div>
                            {shift && shift.hours > 0 && (
                              <div
                                className="text-[10px] mt-0.5 opacity-80"
                                style={{ color: shiftStyle.style.color }}
                              >
                                {shift.hours} h {shift.isOvernight && '🌙'}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    <td className="py-2.5 sm:py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                      {row.totalHours} h
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
