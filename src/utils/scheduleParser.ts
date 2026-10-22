import {
  User,
  ShiftDetail,
  ShiftType,
  EmployeeScheduleRow,
  ParseResult,
  AppSettings,
} from '../types';

// Spanish months dictionary
const MONTHS_MAP: Record<string, number> = {
  enero: 0,
  ene: 0,
  febrero: 1,
  feb: 1,
  marzo: 2,
  mar: 2,
  abril: 3,
  abr: 3,
  mayo: 4,
  may: 4,
  junio: 5,
  jun: 5,
  julio: 6,
  jul: 6,
  agosto: 7,
  ago: 7,
  septiembre: 8,
  sep: 8,
  setiembre: 8,
  octubre: 9,
  oct: 9,
  noviembre: 10,
  nov: 10,
  diciembre: 11,
  dic: 11,
};

// Days of week mapping (1 = Monday ... 7 = Sunday)
const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates duration in hours between two times, taking Europe/Madrid timezone and DST into account.
 * E.g. night of 24-25 October 2026: 22:00 to 06:00 is 9 hours!
 */
export function calculateShiftHours(
  dateStr: string, // YYYY-MM-DD
  startTime: string, // HH:MM
  endTime: string, // HH:MM
  deductBreaks = false,
  breakMinutes = 0
): { hours: number; isOvernight: boolean } {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const isOvernight = endH < startH || (endH === startH && endM < startM);

  // Construct start date
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Create date objects representing timestamps in Europe/Madrid
  // Using explicit UTC calculation with Europe/Madrid offset or Intl
  // Let's check Europe/Madrid DST transition rule:
  // Last Sunday of October: 03:00 -> 02:00 (autumn DST change, day has 25 hours)
  // Last Sunday of March: 02:00 -> 03:00 (spring DST change, day has 23 hours)
  
  const startISO = `${dateStr}T${startTime.padStart(5, '0')}:00`;
  
  // Next day if overnight
  let nextDateStr = dateStr;
  if (isOvernight) {
    const nextD = new Date(Date.UTC(year, month - 1, day + 1));
    nextDateStr = nextD.toISOString().split('T')[0];
  }
  const endISO = `${nextDateStr}T${endTime.padStart(5, '0')}:00`;

  // Specific high-precision check for Europe/Madrid DST:
  // If the overnight shift crosses the 25 Oct 2026 (or last Sunday of October) transition:
  // At 03:00 CEST clocks roll back to 02:00 CET, adding 1 hour!
  let hours = 0;
  
  // Test if this shift crosses the last Sunday of October transition (2:00-3:00 am)
  const isLastSundayOfOct = (y: number, m: number, d: number) => {
    if (m !== 10) return false;
    const dt = new Date(Date.UTC(y, 9, d));
    // Must be Sunday
    if (dt.getUTCDay() !== 0) return false;
    // Must be the last Sunday: d + 7 > 31
    return d + 7 > 31;
  };

  const isLastSundayOfMarch = (y: number, m: number, d: number) => {
    if (m !== 3) return false;
    const dt = new Date(Date.UTC(y, 2, d));
    return dt.getUTCDay() === 0 && d + 7 > 31;
  };

  const baseMinutes = isOvernight
    ? 24 * 60 - (startH * 60 + startM) + (endH * 60 + endM)
    : endH * 60 + endM - (startH * 60 + startM);

  let totalMinutes = baseMinutes;

  if (isOvernight) {
    const [nextY, nextM, nextD] = nextDateStr.split('-').map(Number);
    // If the next morning is the last Sunday of October and shift crosses 03:00
    if (isLastSundayOfOct(nextY, nextM, nextD) && endH >= 3) {
      totalMinutes += 60; // 1 extra hour due to DST rollback!
    } else if (isLastSundayOfMarch(nextY, nextM, nextD) && endH >= 3) {
      totalMinutes -= 60; // 1 fewer hour due to spring forward!
    }
  }

  if (deductBreaks && breakMinutes > 0) {
    totalMinutes = Math.max(0, totalMinutes - breakMinutes);
  }

  hours = Math.round((totalMinutes / 60) * 100) / 100;
  return { hours, isOvernight };
}

/**
 * Parses a shift string like "09:00-17:00", "9-17", "9:00 a 17:00", "9h-17h",
 * split "09:00-13:00 / 17:00-21:00", or codes "LIBRE", "VAC", "DESC", "BAJA", "FESTIVO".
 */
export function parseShiftText(
  text: string,
  dateStr: string,
  settings?: AppSettings
): ShiftDetail | null {
  const raw = text.trim();
  const normalized = normalizeText(raw);

  if (!raw) return null;

  // Codes
  if (['libre', 'l'].includes(normalized)) {
    return { type: 'free', rawText: raw, hours: 0 };
  }
  if (['desc', 'descanso', 'd'].includes(normalized)) {
    return { type: 'rest', rawText: raw, hours: 0 };
  }
  if (['vac', 'vacaciones', 'v'].includes(normalized)) {
    return { type: 'vacation', rawText: raw, hours: 0 };
  }
  if (['baja', 'it', 'medico', 'med'].includes(normalized)) {
    return { type: 'sick', rawText: raw, hours: 0, note: 'Baja Médica' };
  }
  if (['festivo', 'fest', 'f'].includes(normalized)) {
    return { type: 'holiday', rawText: raw, hours: 0 };
  }

  // Google Sheets / Spanish shift abbreviations:
  // M: Mañana (07:00-15:00) - 8 horas
  if (['m', 'manana', 'mañana'].includes(normalized)) {
    return {
      type: 'work',
      startTime: '07:00',
      endTime: '15:00',
      rawText: raw,
      hours: 8,
      note: 'Mañana (07:00-15:00)',
    };
  }

  // T: Tarde (15:00-23:00) - 8 horas
  if (['t', 'tarde'].includes(normalized)) {
    return {
      type: 'work',
      startTime: '15:00',
      endTime: '23:00',
      rawText: raw,
      hours: 8,
      note: 'Tarde (15:00-23:00)',
    };
  }

  // N: Noche (22:00-06:00) - 8 horas (o 9h si cruza cambio de hora DST)
  if (['n', 'noche'].includes(normalized)) {
    const { hours } = calculateShiftHours(
      dateStr,
      '22:00',
      '06:00',
      settings?.deductBreaks,
      settings?.breakMinutes
    );
    return {
      type: 'work',
      startTime: '22:00',
      endTime: '06:00',
      rawText: raw,
      hours,
      isOvernight: true,
      note: 'Noche (22:00-06:00)',
    };
  }

  // BP: Baja Permiso / Baja Personal / Permiso retribuido
  if (['bp', 'bajapermiso', 'baja permiso', 'permiso'].includes(normalized)) {
    return { type: 'sick', rawText: raw, hours: 0, note: 'Baja / Permiso' };
  }

  // FIN: Fin de período o contrato
  if (['fin', 'finalizado'].includes(normalized)) {
    return { type: 'free', rawText: raw, hours: 0, note: 'Fin de período' };
  }

  // Check split shift: contains '/' or ' y '
  if (raw.includes('/') || normalized.includes(' y ')) {
    const parts = raw.includes('/') ? raw.split('/') : raw.split(/\s+y\s+/i);
    if (parts.length === 2) {
      const part1 = parseShiftText(parts[0], dateStr, settings);
      const part2 = parseShiftText(parts[1], dateStr, settings);
      if (part1 && part2 && part1.startTime && part1.endTime && part2.startTime && part2.endTime) {
        return {
          type: 'work',
          startTime: part1.startTime,
          endTime: part1.endTime,
          startTime2: part2.startTime,
          endTime2: part2.endTime,
          rawText: raw,
          hours: Math.round((part1.hours + part2.hours) * 100) / 100,
          isSplit: true,
          isOvernight: part1.isOvernight || part2.isOvernight,
        };
      }
    }
  }

  // Regex patterns for single shift:
  // e.g. "09:00-17:00", "9-17", "9:00 a 17:00", "9h-17h", "09:00 a 17:00", "9:00 - 17:00"
  const timeRegex = /(\d{1,2})(?::(\d{2})|h)?\s*(?:-|a|to|\/)\s*(\d{1,2})(?::(\d{2})|h)?/i;
  const match = raw.match(timeRegex);

  if (match) {
    const h1 = parseInt(match[1], 10);
    const m1 = match[2] ? parseInt(match[2], 10) : 0;
    const h2 = parseInt(match[3], 10);
    const m2 = match[4] ? parseInt(match[4], 10) : 0;

    if (h1 >= 0 && h1 < 24 && m1 >= 0 && m1 < 60 && h2 >= 0 && h2 < 24 && m2 >= 0 && m2 < 60) {
      const startTime = `${String(h1).padStart(2, '0')}:${String(m1).padStart(2, '0')}`;
      const endTime = `${String(h2).padStart(2, '0')}:${String(m2).padStart(2, '0')}`;

      const { hours, isOvernight } = calculateShiftHours(
        dateStr,
        startTime,
        endTime,
        settings?.deductBreaks,
        settings?.breakMinutes
      );

      return {
        type: 'work',
        startTime,
        endTime,
        rawText: raw,
        hours,
        isOvernight,
      };
    }
  }

  return null;
}

/**
 * Tries to parse week dates from header text like:
 * "SEMANA DEL 2 AL 8 DE NOVIEMBRE"
 * "SEMANA DEL 28 DE DICIEMBRE AL 3 DE ENERO"
 * "Semana 02/11/2026 - 08/11/2026"
 */
export function parseWeekHeader(text: string, fallbackYear = 2026): {
  startDate: string;
  endDate: string;
  label: string;
} | null {
  const norm = normalizeText(text);

  // Pattern 0: Google Sheets tab-separated dates row: e.g. "26/10 \t 27/10 \t 28/10 \t 29/10 \t 30/10 \t 31/10 \t 01/11"
  const tokens = text.split(/[\t\s]+/).map(t => t.trim()).filter(Boolean);
  const dateTokens = tokens.filter(t => /^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?$/.test(t));
  if (dateTokens.length >= 7) {
    const firstParts = dateTokens[0].split('/').map(Number);
    const lastParts = dateTokens[6].split('/').map(Number);
    const d1 = firstParts[0];
    const m1 = firstParts[1] - 1;
    let y1 = firstParts[2] || fallbackYear;
    if (y1 < 100) y1 += 2000;

    const d2 = lastParts[0];
    const m2 = lastParts[1] - 1;
    let y2 = lastParts[2] || fallbackYear;
    if (y2 < 100) y2 += 2000;

    // Cross-year check: e.g. 28/12 to 03/01
    if (m1 === 11 && m2 === 0 && !lastParts[2]) {
      y2 = y1 + 1;
    }

    const dt1 = new Date(Date.UTC(y1, m1, d1));
    const dt2 = new Date(Date.UTC(y2, m2, d2));
    const startIso = dt1.toISOString().split('T')[0];
    const endIso = dt2.toISOString().split('T')[0];

    return {
      startDate: startIso,
      endDate: endIso,
      label: `SEMANA DEL ${d1} DE ${getMonthName(m1).toUpperCase()} AL ${d2} DE ${getMonthName(m2).toUpperCase()} ${y2}`,
    };
  }

  // Pattern 1: dd/mm/yyyy - dd/mm/yyyy
  const slashPattern = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*(?:al|-|a)\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i;
  const slashMatch = text.match(slashPattern);
  if (slashMatch) {
    const d1 = parseInt(slashMatch[1], 10);
    const m1 = parseInt(slashMatch[2], 10) - 1;
    let y1 = slashMatch[3] ? parseInt(slashMatch[3], 10) : fallbackYear;
    if (y1 < 100) y1 += 2000;

    const d2 = parseInt(slashMatch[4], 10);
    const m2 = parseInt(slashMatch[5], 10) - 1;
    let y2 = parseInt(slashMatch[6], 10);
    if (y2 < 100) y2 += 2000;

    const dt1 = new Date(Date.UTC(y1, m1, d1));
    const dt2 = new Date(Date.UTC(y2, m2, d2));
    const startIso = dt1.toISOString().split('T')[0];
    const endIso = dt2.toISOString().split('T')[0];

    return {
      startDate: startIso,
      endDate: endIso,
      label: `SEMANA DEL ${d1} DE ${getMonthName(m1).toUpperCase()} AL ${d2} DE ${getMonthName(m2).toUpperCase()} ${y2}`,
    };
  }

  // Pattern 2: "del 2 al 8 de noviembre [de 2026]"
  const singleMonthPattern = /(?:semana\s+)?(?:del\s+)?(\d{1,2})\s*(?:al|-|a)\s*(\d{1,2})\s*(?:de\s+)?([a-z]+)(?:\s*(?:de\s+)?(\d{4}))?/i;
  const match1 = norm.match(singleMonthPattern);
  if (match1) {
    const d1 = parseInt(match1[1], 10);
    const d2 = parseInt(match1[2], 10);
    const monthName = match1[3];
    const year = match1[4] ? parseInt(match1[4], 10) : fallbackYear;

    if (monthName in MONTHS_MAP) {
      const monthIdx = MONTHS_MAP[monthName];
      const dt1 = new Date(Date.UTC(year, monthIdx, d1));
      const dt2 = new Date(Date.UTC(year, monthIdx, d2));
      return {
        startDate: dt1.toISOString().split('T')[0],
        endDate: dt2.toISOString().split('T')[0],
        label: `SEMANA DEL ${d1} AL ${d2} DE ${monthName.toUpperCase()} ${year}`,
      };
    }
  }

  // Pattern 3: Cross-month: "del 28 de diciembre al 3 de enero [de 2027]"
  const crossMonthPattern = /(?:semana\s+)?(?:del\s+)?(\d{1,2})\s*(?:de\s+)?([a-z]+)\s*(?:al|-|a)\s*(\d{1,2})\s*(?:de\s+)?([a-z]+)(?:\s*(?:de\s+)?(\d{4}))?/i;
  const match2 = norm.match(crossMonthPattern);
  if (match2) {
    const d1 = parseInt(match2[1], 10);
    const mName1 = match2[2];
    const d2 = parseInt(match2[3], 10);
    const mName2 = match2[4];
    let endYear = match2[5] ? parseInt(match2[5], 10) : fallbackYear;

    if (mName1 in MONTHS_MAP && mName2 in MONTHS_MAP) {
      const m1 = MONTHS_MAP[mName1];
      const m2 = MONTHS_MAP[mName2];
      let startYear = endYear;
      // If crossing year: Dec (11) to Jan (0)
      if (m1 === 11 && m2 === 0) {
        startYear = endYear - 1;
      }
      const dt1 = new Date(Date.UTC(startYear, m1, d1));
      const dt2 = new Date(Date.UTC(endYear, m2, d2));
      return {
        startDate: dt1.toISOString().split('T')[0],
        endDate: dt2.toISOString().split('T')[0],
        label: `SEMANA DEL ${d1} DE ${mName1.toUpperCase()} AL ${d2} DE ${mName2.toUpperCase()} ${endYear}`,
      };
    }
  }

  return null;
}

export function getMonthName(monthIdx: number): string {
  const names = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  return names[monthIdx] || '';
}

/**
 * Returns the 7 dates (YYYY-MM-DD) from Monday to Sunday for a given week start date (Monday).
 */
export function getWeekDates(weekStartDate: string): string[] {
  const [y, m, d] = weekStartDate.split('-').map(Number);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d + i));
    dates.push(dt.toISOString().split('T')[0]);
  }
  return dates;
}

/**
 * Given a date, returns the Monday of that week.
 */
export function getMondayOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay(); // 0 is Sunday, 1 is Monday
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(Date.UTC(y, m - 1, d + diff));
  return mon.toISOString().split('T')[0];
}

/**
 * Formats a date string YYYY-MM-DD into Spanish short format (e.g., "Lun 2 Nov").
 */
export function formatDaySpanish(dateStr: string): { dayName: string; dayNumber: number; monthName: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dayIdx = (dt.getUTCDay() + 6) % 7; // 0 = Lunes .. 6 = Domingo
  return {
    dayName: DAYS_OF_WEEK[dayIdx],
    dayNumber: d,
    monthName: getMonthName(m - 1),
  };
}

/**
 * Finds employee by exact name or alias.
 * Returns either:
 * - { match: User }
 * - { ambiguous: User[] } if "Francisco" matches multiple employees!
 * - null if not found
 */
export function matchEmployee(
  query: string,
  employees: User[]
): { match?: User; ambiguous?: User[] } | null {
  const normQuery = normalizeText(query);
  if (!normQuery) return null;

  const activeEmployees = employees.filter(e => e.status !== 'deleted');

  // Exact full name match first
  for (const emp of activeEmployees) {
    if (normalizeText(emp.name) === normQuery) {
      return { match: emp };
    }
  }

  // Exact alias match
  const aliasMatches: User[] = [];
  for (const emp of activeEmployees) {
    const hasAlias = emp.aliases.some(a => normalizeText(a) === normQuery);
    if (hasAlias) {
      aliasMatches.push(emp);
    }
  }

  if (aliasMatches.length === 1) {
    return { match: aliasMatches[0] };
  } else if (aliasMatches.length > 1) {
    return { ambiguous: aliasMatches };
  }

  // Word token containment (e.g. "Gallego" or "Francisco")
  const partialMatches: User[] = [];
  for (const emp of activeEmployees) {
    const normFull = normalizeText(emp.name);
    const tokens = normFull.split(' ');
    const allAliasesNorm = emp.aliases.map(normalizeText);

    if (tokens.includes(normQuery) || allAliasesNorm.some(a => a.split(' ').includes(normQuery))) {
      partialMatches.push(emp);
    }
  }

  if (partialMatches.length === 1) {
    return { match: partialMatches[0] };
  } else if (partialMatches.length > 1) {
    return { ambiguous: partialMatches };
  }

  return null;
}

/**
 * Main Schedule Interpreter
 * Parses both Free Text and Tab-separated (Excel) inputs.
 */
export function parseScheduleInput(
  input: string,
  employees: User[],
  explicitWeekStart?: string,
  settings?: AppSettings
): ParseResult {
  const lines = input
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const errors: string[] = [];
  const warnings: string[] = [];
  const ambiguities: ParseResult['ambiguities'] = [];

  let weekStartDate = explicitWeekStart || '';
  let weekEndDate = '';
  let weekLabel = '';

  const unknownEmployees: string[] = [];

  // Step 1: Detect week from first line or lines
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const parsedHeader = parseWeekHeader(lines[i]);
    if (parsedHeader) {
      weekStartDate = parsedHeader.startDate;
      weekEndDate = parsedHeader.endDate;
      weekLabel = parsedHeader.label;
      break;
    }
  }

  // If week not detected, use explicit or default to current Monday
  if (!weekStartDate) {
    const now = new Date();
    const todayIso = now.toISOString().split('T')[0];
    weekStartDate = getMondayOfWeek(todayIso);
  }

  const weekDates = getWeekDates(weekStartDate);
  if (!weekEndDate) {
    weekEndDate = weekDates[6];
  }
  if (!weekLabel) {
    const d1 = formatDaySpanish(weekDates[0]);
    const d7 = formatDaySpanish(weekDates[6]);
    weekLabel = `SEMANA DEL ${d1.dayNumber} DE ${d1.monthName.toUpperCase()} AL ${d7.dayNumber} DE ${d7.monthName.toUpperCase()} ${weekDates[0].split('-')[0]}`;
  }

  // Step 2: Determine if table format (tab-separated) or free text
  const isTabSeparated = lines.some(l => l.includes('\t'));

  const parsedRows: EmployeeScheduleRow[] = [];
  const seenEmployeeIds = new Set<string>();

  if (isTabSeparated) {
    // Excel / Google Sheets tab-separated parsing
    let headerSkipped = false;

    for (const line of lines) {
      if (parseWeekHeader(line)) continue;

      let cols = line.split('\t').map(c => c.trim());
      if (cols.length < 2) continue;

      // Handle leading empty column if present (e.g. when copied from Google Sheets with empty corner)
      if (!cols[0] && cols.length >= 8) {
        cols.shift();
      }

      // Check if day header row (contains day names like LUNES, MARTES or words like Empleado/Nombre)
      const dayNames = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
      const hasDayNames = cols.some(c => dayNames.includes(normalizeText(c)));
      const firstColNorm = normalizeText(cols[0]);
      if (hasDayNames || firstColNorm.includes('empleado') || firstColNorm.includes('nombre')) {
        headerSkipped = true;
        continue;
      }

      // Skip metadata/notes rows (e.g. "JAKELINE VIATGE", "CARLOS MEDICO") that do not contain shift codes
      const validShifts = cols.slice(1).filter(c => parseShiftText(c, weekDates[0], settings) !== null);
      if (!matchEmployee(cols[0], employees) && validShifts.length < 3) {
        continue;
      }

      const empNameToken = cols[0];
      const matchRes = matchEmployee(empNameToken, employees);

      if (!matchRes) {
        unknownEmployees.push(empNameToken);
        errors.push(`Empleado desconocido: "${empNameToken}". No se encuentra en la base de datos.`);
        continue;
      }

      if (matchRes.ambiguous) {
        ambiguities.push({
          rawName: empNameToken,
          matchedEmployees: matchRes.ambiguous.map(e => ({ id: e.id, name: e.name })),
        });
        errors.push(
          `Nombre ambiguo "${empNameToken}": coincide con múltiples empleados (${matchRes.ambiguous
            .map(e => e.name)
            .join(' y ')}). Elige a cuál corresponde.`
        );
        continue;
      }

      const emp = matchRes.match!;
      if (seenEmployeeIds.has(emp.id)) {
        errors.push(`Empleado repetido en el cuadrante: ${emp.name}.`);
        continue;
      }
      seenEmployeeIds.add(emp.id);

      const shiftCols = cols.slice(1, 8);
      if (shiftCols.length < 7) {
        errors.push(`El empleado ${emp.name} solo tiene ${shiftCols.length} días (debe tener los 7 días de la semana).`);
      }

      const dayMap: Record<string, ShiftDetail> = {};
      let totalHours = 0;

      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const rawShift = shiftCols[dayIdx] || 'LIBRE';
        const dateStr = weekDates[dayIdx];
        const shift = parseShiftText(rawShift, dateStr, settings);

        if (!shift) {
          errors.push(`Turno ilegible para ${emp.name} en el día ${DAYS_OF_WEEK[dayIdx]}: "${rawShift}".`);
          dayMap[dateStr] = { type: 'free', rawText: rawShift || 'ILEGIBLE', hours: 0 };
        } else {
          dayMap[dateStr] = shift;
          totalHours += shift.hours;
        }
      }

      parsedRows.push({
        employeeId: emp.id,
        employeeName: emp.name,
        days: dayMap,
        totalHours: Math.round(totalHours * 100) / 100,
        warnings: [],
      });
    }
  } else {
    // Free text format
    // E.g.
    // Empleado 1: Lunes: 09:00-17:00 Martes: 09:00-17:00 Miércoles: LIBRE Jueves: 14:00-22:00 Viernes: 14:00-22:00 Sábado: LIBRE Domingo: LIBRE
    // or
    // Francisco Gallego: L: 9-17 M: 9-17 X: LIBRE J: 14-22 V: 14-22 S: LIBRE D: LIBRE
    for (const line of lines) {
      if (parseWeekHeader(line)) continue;

      // Extract employee name before the first colon or dash
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const empNameToken = line.substring(0, colonIdx).trim();
      const rest = line.substring(colonIdx + 1).trim();

      const matchRes = matchEmployee(empNameToken, employees);
      if (!matchRes) {
        errors.push(`Empleado desconocido: "${empNameToken}". No se encuentra en la base de datos.`);
        continue;
      }

      if (matchRes.ambiguous) {
        ambiguities.push({
          rawName: empNameToken,
          matchedEmployees: matchRes.ambiguous.map(e => ({ id: e.id, name: e.name })),
        });
        errors.push(
          `Nombre ambiguo "${empNameToken}": coincide con múltiples empleados (${matchRes.ambiguous
            .map(e => e.name)
            .join(' y ')}). Elige a cuál corresponde.`
        );
        continue;
      }

      const emp = matchRes.match!;
      if (seenEmployeeIds.has(emp.id)) {
        errors.push(`Empleado repetido en el cuadrante: ${emp.name}.`);
        continue;
      }
      seenEmployeeIds.add(emp.id);

      // Parse the rest of line by day
      // Days can be: Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo OR L, M, X, J, V, S, D
      // Regex splits on day names followed by colon or space
      const dayTokenRegex = /(lunes|martes|miercoles|jueves|viernes|sabado|domingo|\b[lmxjvsd]\b)[:\s]/gi;
      
      const dayIndices: { day: string; index: number }[] = [];
      let m: RegExpExecArray | null;
      while ((m = dayTokenRegex.exec(rest)) !== null) {
        dayIndices.push({ day: m[1], index: m.index });
      }

      const dayMap: Record<string, ShiftDetail> = {};
      const dayCountMap: Record<number, number> = {};
      let totalHours = 0;

      const dayNameMapping: Record<string, number> = {
        lunes: 0, l: 0,
        martes: 1, m: 1,
        miercoles: 2, x: 2,
        jueves: 3, j: 3,
        viernes: 4, v: 4,
        sabado: 5, s: 5,
        domingo: 6, d: 6,
      };

      for (let i = 0; i < dayIndices.length; i++) {
        const cur = dayIndices[i];
        const next = dayIndices[i + 1];
        const rawDayText = cur.day.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const dayIdx = dayNameMapping[rawDayText];

        const textChunk = rest
          .substring(cur.index, next ? next.index : rest.length)
          .replace(new RegExp(`^${cur.day}[:\\s]*`, 'i'), '')
          .trim();

        if (dayIdx !== undefined) {
          dayCountMap[dayIdx] = (dayCountMap[dayIdx] || 0) + 1;
          if (dayCountMap[dayIdx] > 1) {
            errors.push(`Día duplicado para ${emp.name}: ${DAYS_OF_WEEK[dayIdx]}.`);
          }

          const dateStr = weekDates[dayIdx];
          const shift = parseShiftText(textChunk, dateStr, settings);

          if (!shift) {
            errors.push(`Turno ilegible para ${emp.name} en ${DAYS_OF_WEEK[dayIdx]}: "${textChunk}".`);
            dayMap[dateStr] = { type: 'free', rawText: textChunk || 'ILEGIBLE', hours: 0 };
          } else {
            dayMap[dateStr] = shift;
            totalHours += shift.hours;
          }
        }
      }

      // Check if all 7 days were provided
      const missingDays: string[] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = weekDates[d];
        if (!dayMap[dateStr]) {
          missingDays.push(DAYS_OF_WEEK[d]);
        }
      }

      if (missingDays.length > 0) {
        errors.push(`El empleado ${emp.name} no tiene los 7 días completos (faltan: ${missingDays.join(', ')}).`);
      }

      parsedRows.push({
        employeeId: emp.id,
        employeeName: emp.name,
        days: dayMap,
        totalHours: Math.round(totalHours * 100) / 100,
        warnings: [],
      });
    }
  }

  // Step 3: Run Labour & Schedule Warnings (Spanish rules / thresholds)
  const restBetweenMin = settings?.warningRestBetweenShiftsHours ?? 12;
  const maxDaily = settings?.warningMaxDailyHours ?? 9;
  const maxWeekly = settings?.warningMaxWeeklyHours ?? 40;
  const minRestDays = settings?.warningMinWeeklyRestDays ?? 1.5;

  // Active employees missing from schedule
  const activeEmployees = employees.filter(e => e.status === 'active');
  const missingActiveEmployees = activeEmployees.filter(e => !seenEmployeeIds.has(e.id));
  if (missingActiveEmployees.length > 0) {
    warnings.push(
      `Empleados activos ausentes del cuadrante (${missingActiveEmployees.length}): ${missingActiveEmployees
        .map(e => e.name)
        .join(', ')}.`
    );
  }

  // Row-level checks:
  for (const row of parsedRows) {
    const rowWarnings: string[] = [];
    let freeDaysCount = 0;

    // Check daily hours & rest between days
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const dateStr = weekDates[dayIdx];
      const shift = row.days[dateStr];
      if (!shift) continue;

      if (shift.type === 'free' || shift.type === 'rest') {
        freeDaysCount += 1;
      }

      if (shift.hours > maxDaily) {
        const w = `Supera el límite diario (${shift.hours} h > ${maxDaily} h) el ${DAYS_OF_WEEK[dayIdx]}.`;
        rowWarnings.push(w);
        warnings.push(`${row.employeeName}: ${w}`);
      }

      // Check rest between consecutive days
      if (dayIdx < 6) {
        const nextDateStr = weekDates[dayIdx + 1];
        const nextShift = row.days[nextDateStr];

        if (shift.type === 'work' && nextShift && nextShift.type === 'work') {
          const shiftEnd = shift.endTime2 || shift.endTime;
          const nextStart = nextShift.startTime;

          if (shiftEnd && nextStart) {
            const [endH, endM] = shiftEnd.split(':').map(Number);
            const [nextH, nextM] = nextStart.split(':').map(Number);

            let restHours = 0;
            if (shift.isOvernight) {
              // Shift ended in the morning of dayIdx + 1
              const restMinutes = (nextH * 60 + nextM) - (endH * 60 + endM);
              restHours = restMinutes / 60;
            } else {
              // Rest is remainder of day 1 + hours before nextStart on day 2
              const restMinutes = (24 * 60 - (endH * 60 + endM)) + (nextH * 60 + nextM);
              restHours = restMinutes / 60;
            }

            if (restHours < restBetweenMin) {
              const w = `Menos de ${restBetweenMin} h de descanso entre ${DAYS_OF_WEEK[dayIdx]} y ${
                DAYS_OF_WEEK[dayIdx + 1]
              } (descanso: ${Math.round(restHours * 10) / 10} h).`;
              rowWarnings.push(w);
              warnings.push(`${row.employeeName}: ${w}`);
            }
          }
        }
      }
    }

    if (row.totalHours > maxWeekly) {
      const w = `Jornada semanal superior a ${maxWeekly} h (${row.totalHours} h).`;
      rowWarnings.push(w);
      warnings.push(`${row.employeeName}: ${w}`);
    }

    if (freeDaysCount < minRestDays) {
      const w = `Menos de ${minRestDays} días de descanso semanal (${freeDaysCount} días libres).`;
      rowWarnings.push(w);
      warnings.push(`${row.employeeName}: ${w}`);
    }

    row.warnings = rowWarnings;
  }

  return {
    success: errors.length === 0,
    weekStartDate,
    weekEndDate,
    weekLabel,
    rows: parsedRows,
    errors,
    warnings,
    ambiguities,
    unknownEmployees,
  };
}
