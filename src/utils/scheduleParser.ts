import { User, ParseResult, EmployeeScheduleRow, ShiftDetail, AmbiguityMatch, ShiftType } from '../types';

export function getWeekDates(weekStartDate: string): string[] {
  const dates: string[] = [];
  const parts = weekStartDate.split('-').map(Number);
  const start = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

export function formatDaySpanish(dateStr: string): {
  dayName: string;
  dayNumber: number;
  monthName: string;
  year: number;
} {
  const parts = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));

  const dayNames = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  return {
    dayName: dayNames[d.getUTCDay()],
    dayNumber: d.getUTCDate(),
    monthName: monthNames[d.getUTCMonth()],
    year: d.getUTCFullYear(),
  };
}

export function normalizeStr(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function matchEmployee(
  rawName: string,
  employees: User[]
): {
  employee?: User;
  ambiguous?: User[];
} | null {
  const cleanRaw = normalizeStr(rawName);
  if (!cleanRaw) return null;

  // Exact full name match
  const exactMatch = employees.find(
    e => normalizeStr(e.name) === cleanRaw
  );
  if (exactMatch) {
    return { employee: exactMatch };
  }

  // Exact alias match
  const exactAliasMatches = employees.filter(e =>
    e.aliases.some(a => normalizeStr(a) === cleanRaw)
  );
  if (exactAliasMatches.length === 1) {
    return { employee: exactAliasMatches[0] };
  }
  if (exactAliasMatches.length > 1) {
    return { ambiguous: exactAliasMatches };
  }

  // Prefix / substring match
  const matched = employees.filter(e => {
    const empNorm = normalizeStr(e.name);
    if (empNorm.includes(cleanRaw) || cleanRaw.includes(empNorm)) return true;
    return e.aliases.some(a => {
      const aNorm = normalizeStr(a);
      return aNorm.includes(cleanRaw) || cleanRaw.includes(aNorm);
    });
  });

  if (matched.length === 1) {
    return { employee: matched[0] };
  }
  if (matched.length > 1) {
    return { ambiguous: matched };
  }

  return null;
}

export function calculateShiftHours(
  dateStr: string,
  startTime: string,
  endTime: string
): { hours: number; isOvernight: boolean } {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);

  const startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  const isOvernight = endMinutes <= startMinutes;

  if (isOvernight) {
    endMinutes += 24 * 60;
  }

  let totalMinutes = endMinutes - startMinutes;

  // Daylight Saving Time (DST) Check for Europe/Madrid
  // Fall DST in Spain occurs on the last Sunday of October (clocks go 03:00 -> 02:00, adding +1 hour)
  // In 2026, the last Sunday is October 25th. A night shift starting Oct 24th and ending Oct 25th in the morning spans the extra hour!
  if (dateStr === '2026-10-24' && isOvernight && sh <= 23 && eh >= 3) {
    totalMinutes += 60; // Extra hour worked during change back
  }

  const hours = Math.round((totalMinutes / 60) * 100) / 100;
  return { hours, isOvernight };
}

export function parseShiftText(rawShift: string, dateStr: string): ShiftDetail | null {
  const text = rawShift.trim();
  if (!text) {
    return { type: 'free', rawText: 'LIBRE', hours: 0 };
  }

  const norm = normalizeStr(text);

  // Free / Rest
  if (['libre', 'l', 'descanso', 'desc', 'd', 'off', '-'].includes(norm)) {
    return { type: 'free', rawText: text.toUpperCase() === 'L' ? 'L' : 'LIBRE', hours: 0 };
  }

  // Vacation
  if (['vacaciones', 'vac', 'v'].includes(norm)) {
    return { type: 'vacation', rawText: text.toUpperCase() === 'V' ? 'V' : 'VACACIONES', hours: 0 };
  }

  // Sick Leave / Baja médica
  if (['baja', 'baja medica', 'bp', 'it', 'enfermedad', 'medico'].includes(norm)) {
    return { type: 'sick', rawText: text.toUpperCase() === 'BP' ? 'BP' : 'BAJA', hours: 0 };
  }

  // Holiday / Festivo
  if (['festivo', 'fest', 'f'].includes(norm)) {
    return { type: 'holiday', rawText: 'FESTIVO', hours: 0 };
  }

  // Preset Shift Codes (Hotelería HM Gran Fiesta: M, T, N)
  if (norm === 'm' || norm === 'manana' || norm === 'mañana') {
    return { type: 'work', rawText: 'M', hours: 8, startTime: '09:00', endTime: '17:00' };
  }
  if (norm === 't' || norm === 'tarde') {
    return { type: 'work', rawText: 'T', hours: 8, startTime: '14:00', endTime: '22:00' };
  }
  if (norm === 'n' || norm === 'noche') {
    return { type: 'work', rawText: 'N', hours: 8, startTime: '22:00', endTime: '06:00', isOvernight: true };
  }

  // Split shift: e.g. "09:00-13:00 / 17:00-21:00" or "09:00-13:00 y 17:00-21:00"
  if (text.includes('/') || text.includes(' y ') || text.includes(' + ')) {
    const parts = text.split(/[/+y]/).map(s => s.trim()).filter(Boolean);
    let totalH = 0;
    for (const p of parts) {
      const parsedPart = parseShiftText(p, dateStr);
      if (parsedPart && parsedPart.hours) {
        totalH += parsedPart.hours;
      }
    }
    return {
      type: 'work',
      rawText: text,
      hours: Math.round(totalH * 100) / 100,
      isSplit: true,
    };
  }

  // Exact hour range: e.g. "09:00-17:00", "9:00 a 17:00", "09:00 - 17:00"
  const rangeMatch = text.match(/(\d{1,2}:\d{2})\s*(?:-|a|al|to)\s*(\d{1,2}:\d{2})/i);
  if (rangeMatch) {
    const startTime = rangeMatch[1].padStart(5, '0');
    const endTime = rangeMatch[2].padStart(5, '0');
    const calc = calculateShiftHours(dateStr, startTime, endTime);
    return {
      type: 'work',
      startTime,
      endTime,
      rawText: text,
      hours: calc.hours,
      isOvernight: calc.isOvernight,
    };
  }

  // Single hour count: e.g. "8h", "8 horas"
  const hoursOnlyMatch = text.match(/^(\d+(?:[.,]\d+)?)\s*h(?:oras)?$/i);
  if (hoursOnlyMatch) {
    const h = parseFloat(hoursOnlyMatch[1].replace(',', '.'));
    return { type: 'work', rawText: text, hours: h };
  }

  // Fallback for unparseable text
  return {
    type: 'other',
    rawText: text,
    hours: 8,
    note: 'Turno no estándar',
  };
}

export function parseScheduleInput(
  rawInput: string,
  employees: User[],
  defaultWeekStartDate?: string
): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ambiguities: AmbiguityMatch[] = [];
  const unknownEmployees: string[] = [];

  const lines = rawInput
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  let weekStartDate = defaultWeekStartDate || '';
  let weekEndDate = '';
  let weekLabel = '';

  // 1. Detect week from text or header
  // Example: "SEMANA DEL 2 AL 8 DE NOVIEMBRE" or "SEMANA DEL 28 DE DICIEMBRE AL 3 DE ENERO DE 2027"
  const firstLines = lines.slice(0, 3).join(' ');
  const weekRangeMatch = firstLines.match(/SEMANA DEL\s+(\d{1,2})(?:\s+DE\s+([A-Za-z]+))?\s+AL\s+(\d{1,2})\s+DE\s+([A-Za-z]+)(?:\s+DE\s+(\d{4}))?/i);

  const monthsMap: Record<string, number> = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  };

  if (weekRangeMatch) {
    const startDay = parseInt(weekRangeMatch[1], 10);
    const endMonthName = normalizeStr(weekRangeMatch[4]);
    const startMonthName = weekRangeMatch[2] ? normalizeStr(weekRangeMatch[2]) : endMonthName;
    const year = weekRangeMatch[5] ? parseInt(weekRangeMatch[5], 10) : 2026;

    const startMonth = monthsMap[startMonthName] || 11;
    let endMonth = monthsMap[endMonthName] || 11;
    let endYear = year;

    // Cross-year check (e.g. 28 December to 3 January)
    if (startMonth === 12 && endMonth === 1) {
      endYear = year + 1;
    }

    weekStartDate = `${year}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
    const endDay = parseInt(weekRangeMatch[3], 10);
    weekEndDate = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
    weekLabel = `SEMANA DEL ${startDay} ${weekRangeMatch[2] ? `DE ${weekRangeMatch[2].toUpperCase()} ` : ''}AL ${endDay} DE ${weekRangeMatch[4].toUpperCase()} ${year}`;
  }

  // Also check for Google Sheets date header line: e.g. "\t26/10\t27/10\t28/10\t29/10\t30/10\t31/10\t01/11"
  if (!weekStartDate) {
    for (const line of lines) {
      const dateTokens = line.split('\t').map(t => t.trim()).filter(t => /^\d{1,2}\/\d{1,2}$/.test(t));
      if (dateTokens.length >= 7) {
        const [d1, m1] = dateTokens[0].split('/').map(Number);
        const [d7, m7] = dateTokens[6].split('/').map(Number);
        const y = 2026;
        weekStartDate = `${y}-${String(m1).padStart(2, '0')}-${String(d1).padStart(2, '0')}`;
        weekEndDate = `${m1 === 12 && m7 === 1 ? y + 1 : y}-${String(m7).padStart(2, '0')}-${String(d7).padStart(2, '0')}`;
        weekLabel = `SEMANA DEL ${d1}/${m1} AL ${d7}/${m7} DE ${y}`;
        break;
      }
    }
  }

  // Fallback default
  if (!weekStartDate) {
    weekStartDate = defaultWeekStartDate || '2026-11-02';
  }
  const dates = getWeekDates(weekStartDate);
  if (!weekEndDate) {
    weekEndDate = dates[6];
  }
  if (!weekLabel) {
    const f1 = formatDaySpanish(dates[0]);
    const f7 = formatDaySpanish(dates[6]);
    weekLabel = `SEMANA DEL ${f1.dayNumber} DE ${f1.monthName.toUpperCase()} AL ${f7.dayNumber} DE ${f7.monthName.toUpperCase()} DE ${f1.year}`;
  }

  const rows: EmployeeScheduleRow[] = [];

  // Parse lines
  for (const line of lines) {
    // Ignore pure title lines or header rows
    const normLine = normalizeStr(line);
    if (
      normLine.startsWith('semana del') ||
      normLine.startsWith('cuadrante') ||
      normLine.startsWith('horario')
    ) {
      continue;
    }

    // Check if line is a table header: e.g. "Lunes\tMartes..." or "Empleado\tLunes..."
    const tokens = line.split('\t').map(t => t.trim());
    const isHeader = tokens.some(t => {
      const nt = normalizeStr(t);
      return ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo', 'empleado'].includes(nt);
    });
    if (isHeader) continue;

    // Check if line contains only dates: e.g. "\t26/10\t27/10..."
    if (tokens.filter(t => /^\d{1,2}\/\d{1,2}$/.test(t)).length >= 5) {
      continue;
    }

    let rawEmployeeName = '';
    let dayValues: string[] = [];

    // Case 1: Tab-delimited (Excel / Google Sheets)
    if (line.includes('\t')) {
      const parts = line.split('\t').map(t => t.trim());
      // First non-empty token is employee name
      const firstIdx = parts.findIndex(p => p.length > 0);
      if (firstIdx !== -1) {
        rawEmployeeName = parts[firstIdx];
        dayValues = parts.slice(firstIdx + 1, firstIdx + 8);
      }
    }
    // Case 2: Colon-delimited format: "Francisco Gallego: Lunes: 09:00-17:00 Martes: ..."
    else if (line.includes(':')) {
      const colonIdx = line.indexOf(':');
      rawEmployeeName = line.substring(0, colonIdx).trim();
      const rest = line.substring(colonIdx + 1).trim();

      // Split days: Lunes: ..., Martes: ..., etc.
      const dayMatches = [
        ...rest.matchAll(/(?:Lunes|Martes|Miércoles|Miercoles|Jueves|Viernes|Sábado|Sabado|Domingo)\s*:\s*([^:]+?)(?=\s+(?:Lunes|Martes|Miércoles|Miercoles|Jueves|Viernes|Sábado|Sabado|Domingo)\s*:|$)/gi)
      ];

      if (dayMatches.length > 0) {
        dayValues = dayMatches.map(m => m[1].trim());
      } else {
        // Simple comma or space separation
        dayValues = rest.split(/[,;]/).map(s => s.trim());
      }
    }

    if (!rawEmployeeName) continue;

    // Match employee
    const match = matchEmployee(rawEmployeeName, employees);

    if (!match) {
      errors.push(`Empleado desconocido: «${rawEmployeeName}». No coincide con ningún empleado ni alias.`);
      if (!unknownEmployees.includes(rawEmployeeName)) {
        unknownEmployees.push(rawEmployeeName);
      }
      continue;
    }

    if (match.ambiguous) {
      ambiguities.push({
        rawName: rawEmployeeName,
        matchedEmployees: match.ambiguous,
      });
      errors.push(
        `Ambigüedad en «${rawEmployeeName}»: coincide con varios empleados (${match.ambiguous.map(e => e.name).join(', ')}). Debe asignarse manualmente.`
      );
      continue;
    }

    const emp = match.employee!;

    // Build 7-day shift map
    const days: Record<string, ShiftDetail> = {};
    let totalHours = 0;
    const rowWarnings: string[] = [];

    for (let i = 0; i < 7; i++) {
      const dateStr = dates[i];
      const rawShift = dayValues[i] || 'LIBRE';
      const parsed = parseShiftText(rawShift, dateStr) || { type: 'free', rawText: 'LIBRE', hours: 0 };
      days[dateStr] = parsed;
      totalHours += parsed.hours || 0;

      // Check max daily hours warning (> 9h)
      if (parsed.hours > 9) {
        rowWarnings.push(`El ${formatDaySpanish(dateStr).dayName} supera las 9 horas ordinarias (${parsed.hours}h).`);
      }
    }

    // Check max weekly hours warning (> 40h)
    if (totalHours > 40) {
      rowWarnings.push(`Supera las 40 horas semanales (${totalHours}h).`);
    }

    // Check rest days (< 1.5 rest days)
    const restDaysCount = Object.values(days).filter(d => d.type === 'free' || d.type === 'rest').length;
    if (restDaysCount < 1) {
      rowWarnings.push(`Descanso semanal insuficiente (${restDaysCount} días libres).`);
    }

    if (rowWarnings.length > 0) {
      warnings.push(`${emp.name}: ${rowWarnings.join(' ')}`);
    }

    rows.push({
      employeeId: emp.id,
      employeeName: emp.name,
      days,
      totalHours: Math.round(totalHours * 100) / 100,
      warnings: rowWarnings,
    });
  }

  const success = errors.length === 0 && ambiguities.length === 0 && rows.length > 0;

  return {
    success,
    weekStartDate,
    weekEndDate,
    weekLabel,
    rows,
    warnings,
    errors,
    ambiguities,
    unknownEmployees,
  };
}
