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
  Table,
  CalendarDays,
  Moon,
} from 'lucide-react';
import { WeekSchedule } from '../types';
import { formatDaySpanish, getWeekDates } from '../utils/scheduleParser';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const GeneralScheduleView: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<WeekSchedule[]>([]);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [mobileViewMode, setMobileViewMode] = useState<'table' | 'day'>('table');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

  const isAdmin = user?.role === 'admin';

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

        {/* Filters, View Switcher and Week Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mobile View Mode Switcher (Tabla vs Por Día) */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setMobileViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                mobileViewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Tabla</span>
            </button>
            <button
              onClick={() => setMobileViewMode('day')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                mobileViewMode === 'day'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Por Día</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar empleado..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 w-36 sm:w-44"
            />
          </div>

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

      {/* Mode 1: BY-DAY VIEW (Perfect for Mobile Smartphones) */}
      {mobileViewMode === 'day' ? (
        <div className="space-y-4">
          {/* Day selection horizontal pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar touch-pan-x">
            {weekDates.map((dateStr, idx) => {
              const info = formatDaySpanish(dateStr);
              const isSelected = selectedDayIndex === idx;

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDayIndex(idx)}
                  className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl min-w-[76px] sm:min-w-[90px] border transition cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-400'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                  }`}
                >
                  <span className={`text-[11px] font-bold uppercase ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {info.dayName.slice(0, 3)}
                  </span>
                  <span className="text-base font-black tracking-tight">{info.dayNumber}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {info.monthName.slice(0, 3)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Cards for all employees on the selected day */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Plantilla para el {formatDaySpanish(weekDates[selectedDayIndex] || weekDates[0]).dayName}{' '}
                {formatDaySpanish(weekDates[selectedDayIndex] || weekDates[0]).dayNumber} de{' '}
                {formatDaySpanish(weekDates[selectedDayIndex] || weekDates[0]).monthName}
              </span>
              <span className="text-[11px] text-slate-400">
                {filteredRows.length} empleados
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredRows.map(row => {
                const targetDateStr = weekDates[selectedDayIndex] || weekDates[0];
                const shift = row.days[targetDateStr];
                const isMe = row.employeeId === user?.id;

                let displayLabel = shift ? shift.rawText : 'LIBRE';
                if (!isAdmin && !isMe && shift?.type === 'sick') {
                  displayLabel = 'No disponible';
                }

                let badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                let shiftName = 'Día Libre';
                let shiftHours = 'Descanso';
                const code = (shift?.rawText || '').trim().toUpperCase();

                if (code === 'M') {
                  badgeColor = 'bg-sky-50 text-sky-800 dark:bg-sky-950/70 dark:text-sky-200 border border-sky-300/80';
                  shiftName = 'Mañana';
                  shiftHours = '08:00 a 16:00 (8h)';
                } else if (code === 'T') {
                  badgeColor = 'bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-300/80';
                  shiftName = 'Tarde';
                  shiftHours = '16:00 a 0:00 (8h)';
                } else if (code === 'N' || shift?.isOvernight) {
                  badgeColor = 'bg-violet-50 text-violet-800 dark:bg-violet-950/70 dark:text-violet-200 border border-violet-300/80';
                  shiftName = 'Noche 🌙';
                  shiftHours = '0:00 a 08:00 (8h)';
                } else if (code === 'BP' || shift?.type === 'sick') {
                  badgeColor = 'bg-rose-50 text-rose-800 dark:bg-rose-950/70 dark:text-rose-200 border border-rose-300/80';
                  shiftName = 'Baja Médica / IT';
                  shiftHours = 'Ausencia justificada';
                } else if (code === 'AP') {
                  badgeColor = 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200 border border-emerald-300/80';
                  shiftName = 'Asuntos Propios';
                  shiftHours = 'Permiso retribuido';
                } else if (code === 'L') {
                  badgeColor = 'bg-[#FACC15] text-[#000000] border border-yellow-500 font-black';
                  shiftName = 'Libre';
                  shiftHours = 'Día de descanso';
                } else if (shift?.hours && shift.hours > 0) {
                  badgeColor = 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-200 border border-indigo-300/80';
                  shiftName = 'Turno especial';
                  shiftHours = `${shift.hours}h de jornada`;
                }

                return (
                  <div
                    key={row.employeeId}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
                      isMe
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-xs'
                        : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {row.employeeName}
                        </span>
                        {isMe && (
                          <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-bold">
                            TÚ
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        {shiftHours}
                      </span>
                    </div>

                    <div className={`px-3 py-1.5 rounded-xl text-center shrink-0 ${badgeColor}`}>
                      <div className="font-black text-xs">{displayLabel}</div>
                      <div className="text-[10px] font-semibold opacity-90">{shiftName}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Mode 2: FULL TABLE VIEW (Optimized with touch-pan-x and scroll hint) */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {/* Mobile Swipe Notice */}
          <div className="sm:hidden px-3 py-1.5 bg-indigo-50/80 dark:bg-indigo-950/50 border-b border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-800 dark:text-indigo-300 flex items-center justify-between">
            <span>👉 Desliza horizontalmente para ver toda la semana</span>
            <button
              onClick={() => setMobileViewMode('day')}
              className="font-bold text-indigo-600 dark:text-indigo-400 underline"
            >
              Ver por día
            </button>
          </div>

          <div className="overflow-x-auto touch-pan-x">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-3 sm:px-4 font-bold sticky left-0 bg-slate-100/95 dark:bg-slate-800 z-10 min-w-[130px] sm:min-w-[180px] border-r border-slate-200 dark:border-slate-700 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                    Empleado
                  </th>
                  {weekDates.map(dateStr => {
                    const info = formatDaySpanish(dateStr);
                    return (
                      <th key={dateStr} className="py-2.5 sm:py-3 px-2 sm:px-3 font-semibold min-w-[95px] sm:min-w-[120px] text-center border-r border-slate-100 dark:border-slate-800">
                        <div className="font-bold text-slate-800 dark:text-slate-100">{info.dayName}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {info.dayNumber} {info.monthName.slice(0, 3)}
                        </div>
                      </th>
                    );
                  })}
                  <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-right min-w-[80px]">Total</th>
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
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-slate-900 dark:text-white truncate">{row.employeeName}</span>
                          {isMe && (
                            <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-bold shrink-0">
                              TÚ
                            </span>
                          )}
                        </div>
                      </td>

                      {weekDates.map(dateStr => {
                        const shift = row.days[dateStr];

                        let displayLabel = shift ? shift.rawText : 'LIBRE';
                        if (!isAdmin && !isMe && shift?.type === 'sick') {
                          displayLabel = 'No disponible';
                        }

                        let badgeColor = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
                        const code = (shift?.rawText || '').trim().toUpperCase();
                        if (code === 'M') {
                          badgeColor = 'bg-sky-50 text-sky-800 dark:bg-sky-950/70 dark:text-sky-200 border border-sky-200/80 dark:border-sky-800';
                        } else if (code === 'T') {
                          badgeColor = 'bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800';
                        } else if (code === 'N' || shift?.isOvernight) {
                          badgeColor = 'bg-violet-50 text-violet-800 dark:bg-violet-950/70 dark:text-violet-200 border border-violet-200/80 dark:border-violet-800';
                        } else if (code === 'BP' || shift?.type === 'sick') {
                          badgeColor = 'bg-rose-50 text-rose-800 dark:bg-rose-950/70 dark:text-rose-200 border border-rose-200/80 dark:border-rose-800';
                        } else if (code === 'V' || shift?.type === 'vacation') {
                          badgeColor = 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800';
                        } else if (code === 'AP') {
                          badgeColor = 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700';
                        } else if (code === 'L') {
                          badgeColor = 'bg-[#FACC15] text-[#000000] border border-yellow-500 font-black';
                        } else if (shift?.type === 'work') {
                          badgeColor = 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-200 border border-indigo-200/80 dark:border-indigo-800';
                        }

                        return (
                          <td
                            key={dateStr}
                            className="py-1.5 sm:py-2 px-1.5 sm:px-2 text-center border-r border-slate-100 dark:border-slate-800/60"
                          >
                            <div className={`p-1 sm:p-1.5 rounded-lg text-center ${badgeColor}`}>
                              <div className="font-semibold text-xs leading-tight">{displayLabel}</div>
                              {shift && shift.hours > 0 && (
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {shift.hours} h {shift.isOvernight && '🌙'}
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-right font-bold text-slate-900 dark:text-white">
                        {row.totalHours} h
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};



