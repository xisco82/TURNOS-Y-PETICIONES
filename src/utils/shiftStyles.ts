import { ShiftDetail, CellStyleOverride } from '../types';

export interface ShiftStyleResult {
  badgeClasses: string;
  tdClasses: string;
  style: React.CSSProperties;
  isFree: boolean;
  isAP: boolean;
}

export const PRESET_TEXT_COLORS = [
  { name: 'Negro', value: '#000000', label: '⬛ Negro' },
  { name: 'Verde', value: '#16a34a', label: '🟩 Verde' },
  { name: 'Rojo', value: '#dc2626', label: '🟥 Rojo' },
  { name: 'Azul', value: '#2563eb', label: '🟦 Azul' },
  { name: 'Amarillo', value: '#ca8a04', label: '🟨 Amarillo' },
  { name: 'Morado', value: '#9333ea', label: '🟪 Morado' },
  { name: 'Naranja', value: '#ea580c', label: '🟧 Naranja' },
  { name: 'Blanco', value: '#ffffff', label: '⬜ Blanco' },
];

export function getShiftStyle(
  shift?: ShiftDetail,
  customOverrides?: Record<string, CellStyleOverride>
): ShiftStyleResult {
  const code = (shift?.rawText || '').trim().toUpperCase();
  const isFree = code === 'L' || code === 'LIBRE' || shift?.type === 'free';
  const isAP = code === 'AP' || (shift?.note && shift.note.toLowerCase().includes('asuntos propios'));

  let badgeClasses = 'p-1.5 sm:p-1.5 rounded-lg text-center font-bold text-xs transition-colors shadow-2xs';
  // Note: tdClasses maintains the default cell background, preserving clean table rows.
  // Rule 2: "Al marcar un día libre, poner en amarillo únicamente el rectángulo de esa casilla, sin cambiar el resto de colores."
  let tdClasses = 'py-1.5 sm:py-2 px-1.5 sm:px-2 text-center border-r border-slate-100 dark:border-slate-800/60 relative';
  const inlineStyle: React.CSSProperties = {};

  // Check code-level or shift-level override
  const override = customOverrides?.[code] || customOverrides?.[shift?.rawText || ''];
  const customTextColor = shift?.textColor || override?.textColor;
  const customBgColor = shift?.bgColor || override?.bgColor;

  if (isFree) {
    // REGLA: Poner en amarillo ÚNICAMENTE el rectángulo interior de esa casilla, con letra L estrictamente en negro
    badgeClasses += ' bg-[#FACC15] text-[#000000] border border-yellow-500 font-black shadow-xs';
    inlineStyle.backgroundColor = '#FACC15'; // Tailwind yellow-400
    inlineStyle.color = '#000000';
  } else if (isAP) {
    // REGLA: AP letras en verde
    badgeClasses += ' bg-emerald-50 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 font-extrabold';
    inlineStyle.color = '#16a34a'; // Emerald-600 green
  } else if (code === 'M') {
    badgeClasses += ' bg-sky-50 text-sky-800 dark:bg-sky-950/70 dark:text-sky-200 border border-sky-200/80 dark:border-sky-800';
  } else if (code === 'T') {
    badgeClasses += ' bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800';
  } else if (code === 'N' || shift?.isOvernight) {
    badgeClasses += ' bg-violet-50 text-violet-800 dark:bg-violet-950/70 dark:text-violet-200 border border-violet-200/80 dark:border-violet-800';
  } else if (code === 'BP' || shift?.type === 'sick') {
    badgeClasses += ' bg-rose-50 text-rose-800 dark:bg-rose-950/70 dark:text-rose-200 border border-rose-200/80 dark:border-rose-800';
  } else if (code === 'V' || shift?.type === 'vacation') {
    badgeClasses += ' bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800';
  } else if (shift?.type === 'holiday') {
    badgeClasses += ' bg-purple-50 text-purple-800 dark:bg-purple-950/70 dark:text-purple-200 border border-purple-200/80 dark:border-purple-800';
  } else if (shift?.type === 'work') {
    badgeClasses += ' bg-indigo-50 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-200 border border-indigo-200/80 dark:border-indigo-800';
  } else {
    badgeClasses += ' bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }

  // Preserve styles imported from Google Sheets (or manual color tool)
  if (customTextColor && !isFree) {
    inlineStyle.color = customTextColor;
  }
  // For free days, enforce solid black text
  if (isFree) {
    inlineStyle.color = '#000000';
  }
  if (customBgColor && !isFree) {
    inlineStyle.backgroundColor = customBgColor;
  }
  if (shift?.fontWeight || override?.fontWeight) {
    inlineStyle.fontWeight = (shift?.fontWeight || override?.fontWeight) as any;
  }
  if (shift?.fontStyle || override?.fontStyle) {
    inlineStyle.fontStyle = (shift?.fontStyle || override?.fontStyle) as any;
  }
  if (shift?.textAlign || override?.textAlign) {
    inlineStyle.textAlign = (shift?.textAlign || override?.textAlign) as any;
  }
  if (shift?.border || override?.border) {
    inlineStyle.border = shift?.border || override?.border;
  }

  return {
    badgeClasses,
    tdClasses,
    style: inlineStyle,
    isFree: Boolean(isFree),
    isAP: Boolean(isAP),
  };
}

/**
 * REGLA 5: "Nunca permitir que INES y JAKELINE coincidan en el mismo turno de tarde.
 * Aplicar esta regla también a los intercambios y a las importaciones de turnos."
 */
export function isInes(employeeIdOrName: string): boolean {
  if (!employeeIdOrName) return false;
  const s = employeeIdOrName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return s === 'emp-5' || s.includes('ines') || s.includes('ruiz');
}

export function isJakeline(employeeIdOrName: string): boolean {
  if (!employeeIdOrName) return false;
  const s = employeeIdOrName.toLowerCase();
  return s === 'emp-9' || s.includes('jakeline') || s.includes('jaqueline') || s.includes('munera');
}

export function isAfternoonShift(shiftRawOrCode: string): boolean {
  if (!shiftRawOrCode) return false;
  const s = shiftRawOrCode.trim().toUpperCase();
  return s === 'T' || s.startsWith('T ') || s.includes('16:00') || s.includes('TARDE');
}

export function validateInesJakelineConflict(
  empA: string,
  shiftA: string,
  empB: string,
  shiftB: string
): { hasConflict: boolean; reason?: string } {
  const isAInes = isInes(empA);
  const isAJake = isJakeline(empA);
  const isBInes = isInes(empB);
  const isBJake = isJakeline(empB);

  const aIsAfternoon = isAfternoonShift(shiftA);
  const bIsAfternoon = isAfternoonShift(shiftB);

  if (((isAInes && isBJake) || (isAJake && isBInes)) && aIsAfternoon && bIsAfternoon) {
    return {
      hasConflict: true,
      reason: 'Normativa del Hotel HM Gran Fiesta: INES y JAKELINE no pueden coincidir en el mismo turno de tarde (T).',
    };
  }

  return { hasConflict: false };
}
