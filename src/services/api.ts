import {
  User,
  WeekSchedule,
  ShiftChangeRequest,
  DaysOffRequest,
  AbsenceRequest,
  IncidentItem,
  NotificationItem,
  AuditLogItem,
  AppSettings,
} from '../types';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('tf_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  async getMe(): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async changePassword(newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ newPassword }),
    });
    return handleResponse(res);
  },

  async getQuickUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/auth/quick-users`);
    return handleResponse(res);
  },

  // Users
  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createUser(data: Partial<User>): Promise<User> {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateUser(id: string, data: Partial<User> & { resetPassword?: boolean }): Promise<User> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteUser(id: string, mode: 'deactivate' | 'permanent'): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/users/${id}?mode=${mode}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Schedules
  async getSchedules(): Promise<WeekSchedule[]> {
    const res = await fetch(`${API_BASE}/schedules`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async saveDraft(scheduleData: Partial<WeekSchedule>): Promise<WeekSchedule> {
    const res = await fetch(`${API_BASE}/schedules/draft`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(scheduleData),
    });
    return handleResponse(res);
  },

  async publishSchedule(scheduleData: Partial<WeekSchedule> & { changeReason?: string }): Promise<WeekSchedule> {
    const res = await fetch(`${API_BASE}/schedules/publish`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(scheduleData),
    });
    return handleResponse(res);
  },

  // Requests
  async getRequests(): Promise<{
    shiftRequests: ShiftChangeRequest[];
    daysOffRequests: DaysOffRequest[];
    absenceRequests: AbsenceRequest[];
  }> {
    const res = await fetch(`${API_BASE}/requests`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createShiftChangeRequest(data: {
    date: string;
    currentShift: string;
    proposedShift: string;
    coworkerId?: string;
    comments?: string;
  }): Promise<ShiftChangeRequest> {
    const res = await fetch(`${API_BASE}/requests/shift-change`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async respondCoworkerShiftChange(id: string, response: 'accepted' | 'rejected', comment?: string): Promise<ShiftChangeRequest> {
    const res = await fetch(`${API_BASE}/requests/shift-change/${id}/coworker-response`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ response, comment }),
    });
    return handleResponse(res);
  },

  async createDaysOffRequest(data: {
    startDate: string;
    endDate: string;
    comment?: string;
  }): Promise<DaysOffRequest> {
    const res = await fetch(`${API_BASE}/requests/days-off`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async createAbsenceRequest(data: {
    subType: 'communication' | 'leave_request';
    category: 'medico' | 'urgencia_familiar' | 'fuerza_mayor' | 'otro';
    startDate: string;
    endDate: string;
    hasCertificate: boolean;
    comment?: string;
  }): Promise<AbsenceRequest> {
    const res = await fetch(`${API_BASE}/requests/absence`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateRequestStatus(
    type: 'shift-change' | 'days-off' | 'absence',
    id: string,
    status: string,
    comment?: string,
    applyToSchedule?: boolean
  ) {
    const res = await fetch(`${API_BASE}/requests/${type}/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, comment, applyToSchedule }),
    });
    return handleResponse(res);
  },

  async addRequestComment(
    type: 'shift-change' | 'days-off' | 'absence',
    id: string,
    text: string
  ) {
    const res = await fetch(`${API_BASE}/requests/${type}/${id}/comments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ text }),
    });
    return handleResponse(res);
  },

  // Incidents
  async getIncidents(): Promise<IncidentItem[]> {
    const res = await fetch(`${API_BASE}/incidents`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createIncident(data: {
    category: string;
    date: string;
    description: string;
  }): Promise<IncidentItem> {
    const res = await fetch(`${API_BASE}/incidents`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateIncidentStatus(id: string, status: string, comment?: string): Promise<IncidentItem> {
    const res = await fetch(`${API_BASE}/incidents/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, comment }),
    });
    return handleResponse(res);
  },

  // Notifications
  async getNotifications(): Promise<NotificationItem[]> {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/notifications/mark-all-read`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Audit and Emails
  async getAuditLogs(): Promise<AuditLogItem[]> {
    const res = await fetch(`${API_BASE}/audit`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getSentEmails(): Promise<Array<{ id: string; to: string; subject: string; body: string; date: string }>> {
    const res = await fetch(`${API_BASE}/emails`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Settings
  async getSettings(): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings),
    });
    return handleResponse(res);
  },

  // Backups
  async getBackups(): Promise<Array<{ filename: string; size: number; createdAt: string }>> {
    const res = await fetch(`${API_BASE}/backups`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createBackup(notes?: string): Promise<{ success: boolean; filename: string }> {
    const res = await fetch(`${API_BASE}/backups/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ notes }),
    });
    return handleResponse(res);
  },

  async restoreBackup(filename?: string, backupData?: any): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/backups/restore`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ filename, backupData }),
    });
    return handleResponse(res);
  },

  // Demo Data
  async seedDemoData(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/demo/seed`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async clearDemoData(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/demo/clear`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};
