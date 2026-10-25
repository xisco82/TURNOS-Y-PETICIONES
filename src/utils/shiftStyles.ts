import { ShiftDetail } from '../types';

export function getShiftBadgeClass(shift?: ShiftDetail | null): string {
  if (!shift) {
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  }

  const code = (shift.rawText || '').trim().toUpperCase();

  if (code === 'M') {
    return 'bg-sky-50 text-sky-800 dark:bg-sky-950/70 dark:text-sky-200 border border-sky-200/80 dark:border-sky-800';
  }
  if (code === 'T') {
    return 'bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800';
  }
  if (code === 'N' || shift.isOvernight) {
    return 'bg-violet-50 text-violet-800 dark:bg-violet-950/70 dark:text-violet-200 border border-violet-200/80 dark:border-violet-800';
  }
  if (code === 'BP' || shift.type === 'sick') {
    return 'bg-rose-50 text-rose-800 dark:bg-rose-950/70 dark:text-rose-200 border border-rose-200/80 dark:border-rose-800';
  }
  if (code === 'AP') {
    return 'bg-teal-50 text-teal-800 dark:bg-teal-950/70 dark:text-teal-200 border border-teal-200/80 dark:border-teal-800';
  }
  if (code === 'V' || shift.type === 'vacation') {
    return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800';
  }
  if (shift.type === 'holiday') {
    return 'bg-purple-50 text-purple-800 dark:bg-purple-950/70 dark:text-purple-200 border border-purple-200/80 dark:border-purple-800';
  }
  if (shift.type === 'work') {
    return 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-200 border border-indigo-200/80 dark:border-indigo-800';
  }

  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
}
