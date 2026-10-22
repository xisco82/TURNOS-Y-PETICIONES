export type UserRole = 'admin' | 'employee';
export type UserStatus = 'active' | 'deactivated' | 'deleted';

export interface User {
  id: string;
  name: string;
  aliases: string[];
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  tempPassword?: string;
  mustChangePassword?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type ShiftType = 'work' | 'free' | 'vacation' | 'rest' | 'sick' | 'holiday';

export interface ShiftDetail {
  type: ShiftType;
  startTime?: string;
  endTime?: string;
  startTime2?: string;
  endTime2?: string;
  rawText: string;
  hours: number;
  isOvernight?: boolean;
  isSplit?: boolean;
  note?: string;
}

export interface DayShift {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 1 (Lunes) .. 7 (Domingo)
  dayName: string; // "Lunes", "Martes", etc.
  shift: ShiftDetail;
}

export interface EmployeeScheduleRow {
  employeeId: string;
  employeeName: string;
  days: Record<string, ShiftDetail>; // 'YYYY-MM-DD' -> ShiftDetail
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
  rows: EmployeeScheduleRow[];
  rawInputText?: string;
  changeReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type RequestStatus = 'pending' | 'info_requested' | 'approved' | 'rejected' | 'cancelled';

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
  date: string;
  currentShift: string;
  proposedShift: string;
  coworkerId?: string;
  coworkerName?: string;
  coworkerStatus?: 'pending' | 'accepted' | 'rejected';
  status: RequestStatus;
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
  status: RequestStatus;
  comments: RequestComment[];
  createdAt: string;
  updatedAt: string;
}

export interface AbsenceRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'absence';
  subType: 'communication' | 'leave_request'; // "comunicación de ausencia" o "petición de permiso"
  category: 'medico' | 'urgencia_familiar' | 'fuerza_mayor' | 'otro'; // NUNCA diagnósticos
  startDate: string;
  endDate: string;
  hasCertificate: boolean; // Justificante entregado: sí/no
  status: 'pending' | 'acknowledged' | 'approved' | 'rejected' | 'cancelled';
  comments: RequestComment[];
  createdAt: string;
  updatedAt: string;
}

export interface IncidentItem {
  id: string;
  employeeId: string;
  employeeName: string;
  category: 'fichaje' | 'turno_incorrecto' | 'material' | 'horario' | 'otro';
  date: string;
  description: string;
  status: 'abierta' | 'en_revision' | 'resuelta';
  comments: RequestComment[];
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string; // 'admin' or employeeId or 'all'
  title: string;
  message: string;
  type: 'schedule_published' | 'schedule_modified' | 'request_created' | 'request_updated' | 'incident_updated' | 'coworker_shift_request';
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
  entity: 'cuadrante' | 'empleado' | 'solicitud' | 'incidencia' | 'ajustes' | 'copia_seguridad';
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
  resendApiKey?: string;
  emailSenderDomain?: string;
  timezone: string;
}

export interface ParseResult {
  success: boolean;
  weekStartDate: string;
  weekEndDate: string;
  weekLabel: string;
  rows: EmployeeScheduleRow[];
  errors: string[];
  warnings: string[];
  ambiguities: {
    rawName: string;
    matchedEmployees: Array<{ id: string; name: string }>;
  }[];
  unknownEmployees?: string[];
}
