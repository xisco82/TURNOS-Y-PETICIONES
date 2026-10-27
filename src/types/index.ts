export interface User {
  id: string;
  name: string;
  dni?: string;
  aliases: string[];
  email: string;
  phone?: string;
  role: 'admin' | 'employee';
  status: 'active' | 'deactivated' | 'deleted';
  position?: string;
  tempPassword?: string;
  mustChangePassword?: boolean;
  registeredAt?: string;
  lastPasswordResetAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export type ShiftType = 'work' | 'free' | 'rest' | 'vacation' | 'sick' | 'holiday' | 'other';

export interface ShiftDetail {
  type: ShiftType;
  startTime?: string;
  endTime?: string;
  rawText: string;
  hours: number;
  isOvernight?: boolean;
  isSplit?: boolean;
  note?: string;
}

export type DayShift = ShiftDetail;

export interface EmployeeScheduleRow {
  employeeId: string;
  employeeName: string;
  days: Record<string, ShiftDetail>; // ISO date 'YYYY-MM-DD' -> shift
  totalHours: number;
  warnings: string[];
}

export interface WeekSchedule {
  id: string;
  weekStartDate: string; // YYYY-MM-DD (Monday)
  weekEndDate: string; // YYYY-MM-DD (Sunday)
  weekLabel: string;
  status: 'draft' | 'published';
  version: number;
  publishedAt?: string;
  publishedBy?: string;
  changeReason?: string;
  rows: EmployeeScheduleRow[];
  rawInputText?: string;
  colorOverrides?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface AmbiguityMatch {
  rawName: string;
  matchedEmployees: User[];
}

export interface ParseResult {
  success: boolean;
  weekStartDate: string;
  weekEndDate: string;
  weekLabel: string;
  rows: EmployeeScheduleRow[];
  warnings: string[];
  errors: string[];
  ambiguities: AmbiguityMatch[];
  unknownEmployees?: string[];
}

export interface RequestComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface ShiftChangeRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'shift_change';
  swapKind?: 'shift' | 'day_off';
  date: string;
  targetDate?: string;
  currentShift: string;
  proposedShift: string;
  coworkerId?: string;
  coworkerName?: string;
  coworkerPhone?: string;
  coworkerCurrentShift?: string;
  coworkerStatus?: 'pending' | 'accepted' | 'rejected';
  status: 'pending' | 'approved' | 'rejected' | 'info_requested';
  comments: RequestComment[];
  createdAt: string;
  updatedAt: string;
}

export interface DaysOffRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'days_off';
  startDate: string;
  endDate: string;
  comment?: string;
  status: 'pending' | 'approved' | 'rejected' | 'info_requested';
  comments: RequestComment[];
  createdAt: string;
  updatedAt: string;
}

export interface AbsenceRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'absence';
  subType: 'communication' | 'leave_request';
  category: 'medico' | 'urgencia_familiar' | 'fuerza_mayor' | 'otro';
  startDate: string;
  endDate: string;
  hasCertificate: boolean;
  status: 'pending' | 'acknowledged' | 'approved' | 'rejected' | 'info_requested';
  comments: RequestComment[];
  createdAt: string;
  updatedAt: string;
}

export interface IncidentItem {
  id: string;
  employeeId: string;
  employeeName: string;
  category: string;
  date: string;
  description: string;
  status: 'abierta' | 'en_revision' | 'resuelta';
  comments: RequestComment[];
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string; // specific user ID, 'admin-1', or 'all'
  title: string;
  message: string;
  type: 'schedule_published' | 'schedule_modified' | 'request_created' | 'request_updated' | 'coworker_shift_request' | 'incident_updated' | 'system';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  entity: 'cuadrante' | 'solicitud' | 'empleado' | 'incidencia' | 'ajustes' | 'copia_seguridad';
  previousValue?: string;
  newValue?: string;
  notes?: string;
}

export interface AppSettings {
  generalScheduleVisibleToEmployees: boolean;
  requireFirstPasswordChange: boolean;
  deductBreaks: boolean;
  breakMinutes: number;
  warningRestBetweenShiftsHours: number;
  warningMaxDailyHours: number;
  warningMaxWeeklyHours: number;
  warningMinWeeklyRestDays: number;
  timezone: string;
  emailSenderDomain: string;
}
