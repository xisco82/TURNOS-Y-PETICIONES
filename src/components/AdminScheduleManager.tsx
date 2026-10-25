import React, { useState, useEffect } from 'react';
import {
  FileText,
  Eye,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Calendar,
  Clock,
  Sparkles,
  Save,
  Send,
  HelpCircle,
  RefreshCw,
  Edit2,
  Trash2,
  Check,
  Info,
  Copy,
  Table,
} from 'lucide-react';
import { User, WeekSchedule, ParseResult, EmployeeScheduleRow, ShiftDetail, CellStyleOverride } from '../types';
import { parseScheduleInput, getWeekDates, formatDaySpanish } from '../utils/scheduleParser';
import { api } from '../services/api';
import { OFFICIAL_SCHEDULE_TEXT, OFFICIAL_WEEK_SCHEDULE } from '../constants/officialSchedule';
import { getShiftStyle, isInes, isJakeline, isAfternoonShift } from '../utils/shiftStyles';

interface Props {
  employees: User[];
  onSchedulePublished: () => void;
  onRefreshEmployees?: () => void;
}

export const AdminScheduleManager: React.FC<Props> = ({ employees, onSchedulePublished, onRefreshEmployees }) => {
  const [inputText, setInputText] = useState(OFFICIAL_SCHEDULE_TEXT);
  const [targetWeekDate, setTargetWeekDate] = useState('2026-11-02');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [existingSchedules, setExistingSchedules] = useState<WeekSchedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [customColorOverrides, setCustomColorOverrides] = useState<Record<string, CellStyleOverride>>({});

  // Publish / Modify modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isModifyingPublished, setIsModifyingPublished] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Inline editing inside preview
  const [editingCell, setEditingCell] = useState<{ empId: string; dateStr: string } | null>(null);
  const [cellInputValue, setCellInputValue] = useState('');

  const fetchExistingSchedules = async () => {
    try {
      const list = await api.getSchedules();
      setExistingSchedules(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchExistingSchedules();
  }, []);

  // Automatically parse official schedule when employees list is loaded
  useEffect(() => {
    if (employees && employees.length > 1 && !parseResult) {
      const res = parseScheduleInput(inputText || OFFICIAL_SCHEDULE_TEXT, employees, targetWeekDate);
      setParseResult(res);
    } else if (!employees || employees.length <= 1) {
      api.getUsers().then(list => {
        if (list && list.length > 1) {
          onRefreshEmployees?.();
          const res = parseScheduleInput(inputText || OFFICIAL_SCHEDULE_TEXT, list, targetWeekDate);
          setParseResult(res);
        }
      });
    }
  }, [employees, inputText, targetWeekDate, parseResult]);

  /**
   * REQUISITO 7: Cargar plantilla
   * Dejar únicamente la opción de importar desde Google Sheets.
   * Al copiar los turnos, conservar los colores, bordes, tipos de letra, alineación
   * y demás formatos originales de la hoja en la plantilla de la aplicación.
   */
  const handlePasteFromGoogleSheets = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const htmlData = e.clipboardData.getData('text/html');
    const textData = e.clipboardData.getData('text/plain');

    if (htmlData) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlData, 'text/html');
        const rows = doc.querySelectorAll('tr');
        const newOverrides: Record<string, CellStyleOverride> = { ...customColorOverrides };

        rows.forEach(row => {
          const cells = row.querySelectorAll('td, th');
          cells.forEach(cell => {
            const rawContent = (cell.textContent || '').trim().toUpperCase();
            if (!rawContent) return;

            const style = (cell as HTMLElement).style;
            const bg = style.backgroundColor || cell.getAttribute('bgcolor') || '';
            const fg = style.color || '';
            const fw = style.fontWeight || '';
            const fs = style.fontStyle || '';
            const ta = style.textAlign || '';
            const border = style.border || '';

            if (bg || fg || fw || fs || ta || border) {
              newOverrides[rawContent] = {
                ...(newOverrides[rawContent] || {}),
                ...(bg ? { bgColor: bg } : {}),
                ...(fg ? { textColor: fg } : {}),
                ...(fw ? { fontWeight: fw } : {}),
                ...(fs ? { fontStyle: fs } : {}),
                ...(ta ? { textAlign: ta } : {}),
                ...(border ? { border } : {}),
              };
            }
          });
        });

        if (Object.keys(newOverrides).length > 0) {
          setCustomColorOverrides(newOverrides);
        }
      } catch (err) {
        console.warn('Error parsing Google Sheets HTML clipboard styles:', err);
      }
    }

    if (textData) {
      setInputText(textData);
      setTimeout(() => {
        const res = parseScheduleInput(textData, employees, targetWeekDate);
        setParseResult(res);
      }, 50);
    }
  };

  const handleLoadGoogleSheetsTemplate = async () => {
    let activeEmployees = employees;
    if (!activeEmployees || activeEmployees.length <= 1) {
      try {
        const fresh = await api.getUsers();
        if (fresh && fresh.length > 1) {
          activeEmployees = fresh;
          onRefreshEmployees?.();
        }
      } catch {}
    }

    setInputText(OFFICIAL_SCHEDULE_TEXT);
    setTargetWeekDate('2026-11-02');
    const res = parseScheduleInput(OFFICIAL_SCHEDULE_TEXT, activeEmployees, '2026-11-02');
    setParseResult(res);
    setFeedbackMsg({
      text: 'Plantilla de Google Sheets cargada correctamente (turnos M, T, N, L, AP, BP con formato preservado).',
      type: 'success',
    });
  };

  const handlePreview = async () => {
    if (!inputText.trim()) {
      setFeedbackMsg({ text: 'Por favor, pega el contenido copiado desde Google Sheets', type: 'error' });
      return;
    }

    let activeEmployees = employees;
    if (!activeEmployees || activeEmployees.length <= 1) {
      try {
        const fresh = await api.getUsers();
        if (fresh && fresh.length > 1) {
          activeEmployees = fresh;
          onRefreshEmployees?.();
        }
      } catch {}
    }

    const res = parseScheduleInput(inputText, activeEmployees, targetWeekDate);
    setParseResult(res);
    setFeedbackMsg(null);

    const existing = existingSchedules.find(
      s => s.weekStartDate === res.weekStartDate && s.status === 'published'
    );
    if (existing) {
      setIsModifyingPublished(true);
      setSelectedScheduleId(existing.id);
    } else {
      setIsModifyingPublished(false);
      setSelectedScheduleId(null);
    }
  };

  const handleResolveAmbiguity = (rawName: string, chosenEmployeeId: string) => {
    const chosen = employees.find(e => e.id === chosenEmployeeId);
    if (!chosen) return;

    const regex = new RegExp(`\\b${rawName}\\b`, 'i');
    const newText = inputText.replace(regex, chosen.name);
    setInputText(newText);

    setTimeout(() => {
      const res = parseScheduleInput(newText, employees, targetWeekDate);
      setParseResult(res);
    }, 50);
  };

  const handleSaveDraft = async () => {
    if (!parseResult) return;
    setIsSubmitting(true);
    try {
      await api.saveDraft({
        id: selectedScheduleId || undefined,
        weekStartDate: parseResult.weekStartDate,
        weekEndDate: parseResult.weekEndDate,
        weekLabel: parseResult.weekLabel,
        rows: parseResult.rows,
        rawInputText: inputText,
        colorOverrides: customColorOverrides,
      });
      setFeedbackMsg({ text: 'Cuadrante guardado como borrador con éxito', type: 'success' });
      fetchExistingSchedules();
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Error al guardar borrador', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishSubmit = async () => {
    if (!parseResult || !parseResult.success) return;
    if (isModifyingPublished && !changeReason.trim()) {
      setFeedbackMsg({ text: 'Debes indicar el motivo de la modificación del cuadrante', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.publishSchedule({
        id: selectedScheduleId || undefined,
        weekStartDate: parseResult.weekStartDate,
        weekEndDate: parseResult.weekEndDate,
        weekLabel: parseResult.weekLabel,
        rows: parseResult.rows,
        rawInputText: inputText,
        colorOverrides: customColorOverrides,
        changeReason: isModifyingPublished ? changeReason.trim() : undefined,
      });

      setShowConfirmModal(false);
      setChangeReason('');
      setFeedbackMsg({
        text: isModifyingPublished
          ? 'Nueva versión del cuadrante publicada y notificaciones enviadas'
          : 'Cuadrante publicado con éxito. Visible para los empleados.',
        type: 'success',
      });
      fetchExistingSchedules();
      onSchedulePublished();
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Error al publicar cuadrante', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * REGLA 5: Verificar que INES y JAKELINE nunca coincidan en turno de tarde (T)
   */
  const handleApplyCellEdit = (empId: string, dateStr: string) => {
    if (!parseResult) return;
    const rawText = cellInputValue.trim().toUpperCase() || 'LIBRE';
    const isEditingAfternoon = isAfternoonShift(rawText);

    // Rule 5 validation
    if (isInes(empId) && isEditingAfternoon) {
      const jakeRow = parseResult.rows.find(r => isJakeline(r.employeeId) || isJakeline(r.employeeName));
      if (jakeRow && isAfternoonShift(jakeRow.days[dateStr]?.rawText || '')) {
        setFeedbackMsg({
          text: 'Normativa Hotel HM Gran Fiesta: INES y JAKELINE no pueden coincidir en el turno de tarde (T) el mismo día.',
          type: 'error',
        });
        return;
      }
    }

    if (isJakeline(empId) && isEditingAfternoon) {
      const inesRow = parseResult.rows.find(r => isInes(r.employeeId) || isInes(r.employeeName));
      if (inesRow && isAfternoonShift(inesRow.days[dateStr]?.rawText || '')) {
        setFeedbackMsg({
          text: 'Normativa Hotel HM Gran Fiesta: INES y JAKELINE no pueden coincidir en el turno de tarde (T) el mismo día.',
          type: 'error',
        });
        return;
      }
    }

    const updatedRows = parseResult.rows.map(row => {
      if (row.employeeId !== empId) return row;
      const isFree = ['L', 'LIBRE', 'DESC', 'VAC'].includes(rawText);
      const hours = isFree ? 0 : rawText === 'M' || rawText === 'T' || rawText === 'N' ? 8 : 8;
      const newShift: ShiftDetail = isFree
        ? { type: 'free', rawText, hours: 0 }
        : {
            type: 'work',
            rawText,
            hours,
            startTime: rawText === 'M' ? '08:00' : rawText === 'T' ? '16:00' : rawText === 'N' ? '00:00' : undefined,
            endTime: rawText === 'M' ? '16:00' : rawText === 'T' ? '00:00' : rawText === 'N' ? '08:00' : undefined,
            isOvernight: rawText === 'N',
          };

      const newDays = { ...row.days, [dateStr]: newShift };
      const newTotal = Object.values(newDays).reduce((sum, s) => sum + s.hours, 0);

      return {
        ...row,
        days: newDays,
        totalHours: Math.round(newTotal * 100) / 100,
      };
    });

    setParseResult({ ...parseResult, rows: updatedRows });
    setEditingCell(null);
  };

  const weekDates = parseResult ? getWeekDates(parseResult.weekStartDate) : [];

  return (
    <div className="space-y-6">
      {/* Top banner / introduction */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Table className="w-5 h-5 text-indigo-600" />
              <span>Cargar Plantilla desde Google Sheets</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Copia y pega directamente las celdas desde tu hoja de <strong>Google Sheets</strong>. La aplicación conserva automáticamente colores de fondo, bordes, tipos de letra y alineación originales, validando la normativa de descansos y turnos del hotel.
            </p>
          </div>

          {/* ÚNICA OPCIÓN: Importar desde Google Sheets */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadGoogleSheetsTemplate}
              className="text-xs px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 transition cursor-pointer active:scale-95"
              title="Cargar la plantilla oficial de Google Sheets con los 10 empleados y turnos exactos"
            >
              <Sparkles className="w-4 h-4" />
              <span>Importar Plantilla Google Sheets</span>
            </button>
          </div>
        </div>

        {/* Text Area for pasting Google Sheets */}
        <div className="mt-4">
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onPaste={handlePasteFromGoogleSheets}
            rows={7}
            placeholder="Pega aquí directamente las celdas copiadas desde tu hoja de cálculo de Google Sheets...&#10;Se detectarán automáticamente las fechas, los nombres de empleados y se preservarán los colores y formatos de celda originales."
            className="w-full p-3.5 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            💡 Al copiar celdas en Google Sheets (Ctrl+C) y pegarlas aquí (Ctrl+V), el sistema captura el formato HTML de Google Sheets para mantener estilos originales.
          </p>
        </div>

        {/* Action bar below textarea */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Semana base (Lunes):</span>
            <input
              type="date"
              value={targetWeekDate}
              onChange={e => setTargetWeekDate(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center gap-2">
            {inputText && (
              <button
                onClick={() => {
                  setInputText('');
                  setParseResult(null);
                }}
                className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 rounded-xl cursor-pointer"
              >
                Limpiar
              </button>
            )}
            <button
              onClick={handlePreview}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>PREVISUALIZAR CUADRANTE</span>
            </button>
          </div>
        </div>

        {feedbackMsg && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {feedbackMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            <span className="font-medium">{feedbackMsg.text}</span>
          </div>
        )}
      </div>

      {/* Ambiguity Resolution Modal / Banner */}
      {parseResult && parseResult.ambiguities.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Se requiere resolver ambigüedad de nombres (Regla: Nunca adivinar)
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                El texto importado contiene alias que coinciden con más de un empleado. Elige quién corresponde:
              </p>
              {parseResult.ambiguities.map((item, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-amber-200 dark:border-amber-800/80 space-y-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Alias «{item.rawName}» corresponde a:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {item.matchedEmployees.map(emp => (
                      <button
                        key={emp.id}
                        onClick={() => handleResolveAmbiguity(item.rawName, emp.id)}
                        className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        {emp.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Parse Errors & Inés/Jakeline conflicts */}
      {parseResult && parseResult.errors.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                Se detectaron errores en el cuadrante (No se puede publicar hasta corregir):
              </h3>
              <ul className="list-disc list-inside text-xs text-rose-700 dark:text-rose-300 space-y-1 font-medium">
                {parseResult.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Preview Section */}
      {parseResult && parseResult.rows.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {/* Header toolbar */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                  Previsualización de Cuadrante
                </span>
                <span className="text-xs text-slate-400">
                  {parseResult.rows.length} empleados procesados
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                {parseResult.weekLabel}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveDraft}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>GUARDAR BORRADOR</span>
              </button>

              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={!parseResult.success || isSubmitting}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition cursor-pointer ${
                  parseResult.success
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 active:scale-95'
                    : 'bg-slate-400 cursor-not-allowed opacity-60'
                }`}
                title={!parseResult.success ? 'Corrige los errores antes de publicar' : 'Publicar cuadrante para empleados'}
              >
                <Send className="w-3.5 h-3.5" />
                <span>PUBLICAR CUADRANTE</span>
              </button>
            </div>
          </div>

          {/* Turnos Oficiales Bar */}
          <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                Horarios Oficiales:
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-[11px]">
                <span className="font-black text-sky-800 dark:text-sky-200">M</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">08:00 a 16:00</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-[11px]">
                <span className="font-black text-amber-800 dark:text-amber-200">T</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">16:00 a 0:00</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 text-[11px]">
                <span className="font-black text-violet-800 dark:text-violet-200">N</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">0:00 a 08:00 🌙</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#FACC15] text-[#000000] border border-yellow-500 font-black shadow-xs text-[11px]">
                <span>L</span>
                <span className="font-bold">Libre</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 font-extrabold text-emerald-600 dark:text-emerald-400 text-[11px]">
                <span>AP</span>
                <span className="font-bold">Asuntos Propios</span>
              </div>
            </div>

            <span className="text-[11px] text-slate-400 font-medium hidden md:inline">
              8 horas por turno
            </span>
          </div>

          {/* Table Container: Responsive with horizontal scrolling & sticky employee column */}
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
                        <div className="text-[10px] text-slate-500 font-normal">
                          {info.dayNumber} {info.monthName.slice(0, 3)}
                        </div>
                      </th>
                    );
                  })}
                  <th className="py-2.5 sm:py-3 px-3 font-bold text-right min-w-[80px]">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {parseResult.rows.map(row => (
                  <tr key={row.employeeId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="py-2 sm:py-3 px-3 sm:px-4 font-semibold text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-200 dark:border-slate-800">
                      <div className="truncate">{row.employeeName}</div>
                    </td>

                    {weekDates.map(dateStr => {
                      const shift = row.days[dateStr];
                      const isEditing = editingCell?.empId === row.employeeId && editingCell.dateStr === dateStr;
                      const shiftStyle = getShiftStyle(shift, customColorOverrides);

                      return (
                        <td
                          key={dateStr}
                          className={shiftStyle.tdClasses}
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={cellInputValue}
                                onChange={e => setCellInputValue(e.target.value)}
                                placeholder="M / T / N / L"
                                className="w-full text-[11px] p-1 rounded border border-indigo-500 bg-white dark:bg-slate-800 outline-none uppercase font-bold"
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleApplyCellEdit(row.employeeId, dateStr);
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                              />
                              <button
                                onClick={() => handleApplyCellEdit(row.employeeId, dateStr)}
                                className="p-1 bg-emerald-600 text-white rounded cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                setEditingCell({ empId: row.employeeId, dateStr });
                                setCellInputValue(shift ? shift.rawText : 'LIBRE');
                              }}
                              className={`${shiftStyle.badgeClasses} cursor-pointer select-none`}
                              style={shiftStyle.style}
                              title="Haz clic para editar turno"
                            >
                              <div
                                className="font-black text-xs leading-tight"
                                style={shiftStyle.isFree ? { color: '#000000' } : undefined}
                              >
                                {shift ? shift.rawText : 'LIBRE'}
                              </div>
                              {shift && shift.hours > 0 && (
                                <div className="text-[10px] mt-0.5 opacity-80">
                                  {shift.hours} h {shift.isOvernight && '🌙'}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}

                    <td className="py-2.5 sm:py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                      {row.totalHours} h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Publish */}
      {showConfirmModal && parseResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span>Confirmar Publicación del Cuadrante</span>
            </h3>

            <div className="mt-3 p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <p>
                <strong>Semana:</strong> {parseResult.weekLabel}
              </p>
              <p>
                <strong>Empleados incluidos:</strong> {parseResult.rows.length}
              </p>
            </div>

            {isModifyingPublished && (
              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Motivo de la modificación:
                </label>
                <textarea
                  value={changeReason}
                  onChange={e => setChangeReason(e.target.value)}
                  rows={2}
                  placeholder="Ej: Ajuste de turnos de la semana"
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handlePublishSubmit}
                disabled={isSubmitting || (isModifyingPublished && !changeReason.trim())}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Publicando...' : 'Confirmar y Publicar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
