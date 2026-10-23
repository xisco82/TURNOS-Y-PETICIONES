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

const TOKEN_KEY = 'hgranfiesta_auth_token';

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setStoredToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Error en la petición (${response.status})`);
  }

  return data as T;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const data = await request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.token);
    return data;
  },

  async getMe(): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/me');
  },

  async changePassword(newPassword: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },

  async registerEmployee(data: { name: string; email: string; phone?: string }): Promise<{ user: User; tempPassword: string; token: string }> {
    const res = await request<{ user: User; tempPassword: string; token: string }>('/api/auth/register-employee', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setStoredToken(res.token);
    return res;
  },

  async getQuickUsers(): Promise<User[]> {
    return request<User[]>('/api/auth/quick-users');
  },

  async verifyDni(dni: string): Promise<{
    found: boolean;
    employee: {
      id: string;
      name: string;
      dni: string;
      email: string;
      phone: string;
      role: string;
      isRegistered: boolean;
    };
  }> {
    return request('/api/auth/verify-dni', {
      method: 'POST',
      body: JSON.stringify({ dni }),
    });
  },

  async registerWithDni(data: {
    dni: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<{ success: boolean; user: User; token: string; message: string }> {
    const res = await request<{ success: boolean; user: User; token: string; message: string }>(
      '/api/auth/register-with-dni',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    setStoredToken(res.token);
    return res;
  },

  async resetPassword(data: {
    dni: string;
    email?: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getDbStatus(): Promise<any> {
    return request<any>('/api/db/status');
  },

  async testDbConnection(): Promise<{
    success: boolean;
    status: string;
    latencyMs: number;
    timestamp: string;
    databaseType: string;
    firestore: {
      status: string;
      projectId: string;
      firestoreDatabaseId: string;
      securityRules: string;
      quotaResetInfo: string;
    };
    localEngine: {
      status: string;
      filePath: string;
      readOk: boolean;
      writeOk: boolean;
      fileSizeBytes: number;
    };
    counts: {
      users: number;
      employeesWithDni: number;
      schedules: number;
      publishedSchedules: number;
      shiftRequests: number;
      daysOffRequests: number;
      absenceRequests: number;
      totalRequests: number;
      incidents: number;
      auditLogs: number;
      sentEmails: number;
    };
    uptimeSeconds: number;
    serverTime: string;
    error: string | null;
  }> {
    return request('/api/test-db-connection');
  },

  // Users
  async getUsers(): Promise<User[]> {
    return request<User[]>('/api/users');
  },

  async createUser(data: Partial<User>): Promise<User> {
    return request<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateUser(id: string, data: Partial<User> & { resetPassword?: boolean }): Promise<User> {
    return request<User>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteUser(id: string, mode: 'deactivate' | 'permanent'): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/users/${id}?mode=${mode}`, {
      method: 'DELETE',
    });
  },

  // Schedules
  async getSchedules(): Promise<WeekSchedule[]> {
    return request<WeekSchedule[]>('/api/schedules');
  },

  async getSchedule(id: string): Promise<WeekSchedule> {
    return request<WeekSchedule>(`/api/schedules/${id}`);
  },

  async saveDraft(data: Partial<WeekSchedule>): Promise<WeekSchedule> {
    return request<WeekSchedule>('/api/schedules/draft', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async publishSchedule(data: Partial<WeekSchedule>): Promise<WeekSchedule> {
    return request<WeekSchedule>('/api/schedules/publish', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Requests
  async getRequests(): Promise<{
    shiftRequests: ShiftChangeRequest[];
    daysOffRequests: DaysOffRequest[];
    absenceRequests: AbsenceRequest[];
  }> {
    return request<{
      shiftRequests: ShiftChangeRequest[];
      daysOffRequests: DaysOffRequest[];
      absenceRequests: AbsenceRequest[];
    }>('/api/requests');
  },

  async createShiftChangeRequest(data: {
    date: string;
    currentShift: string;
    proposedShift: string;
    coworkerId?: string;
    comments?: string;
  }): Promise<ShiftChangeRequest> {
    return request<ShiftChangeRequest>('/api/requests/shift-change', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async respondCoworkerShiftChange(id: string, response: 'accepted' | 'rejected', comment?: string): Promise<ShiftChangeRequest> {
    return request<ShiftChangeRequest>(`/api/requests/shift-change/${id}/coworker-response`, {
      method: 'POST',
      body: JSON.stringify({ response, comment }),
    });
  },

  async createDaysOffRequest(data: {
    startDate: string;
    endDate: string;
    comment?: string;
  }): Promise<DaysOffRequest> {
    return request<DaysOffRequest>('/api/requests/days-off', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async createAbsenceRequest(data: {
    subType: 'communication' | 'leave_request';
    category: string;
    startDate: string;
    endDate: string;
    hasCertificate: boolean;
    comment?: string;
  }): Promise<AbsenceRequest> {
    return request<AbsenceRequest>('/api/requests/absence', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateRequestStatus(
    type: 'shift-change' | 'days-off' | 'absence',
    id: string,
    data: { status: string; comment?: string; applyToSchedule?: boolean }
  ): Promise<any> {
    return request<any>(`/api/requests/${type}/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async addRequestComment(
    type: 'shift-change' | 'days-off' | 'absence',
    id: string,
    text: string
  ): Promise<any> {
    return request<any>(`/api/requests/${type}/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  async seedTestRequests(): Promise<{ success: boolean; count: number }> {
    return request<{ success: boolean; count: number }>('/api/requests/seed-test', {
      method: 'POST',
    });
  },

  // Incidents
  async getIncidents(): Promise<IncidentItem[]> {
    return request<IncidentItem[]>('/api/incidents');
  },

  async createIncident(data: { category: string; date: string; description: string }): Promise<IncidentItem> {
    return request<IncidentItem>('/api/incidents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateIncidentStatus(id: string, data: { status: string; comment?: string }): Promise<IncidentItem> {
    return request<IncidentItem>(`/api/incidents/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Notifications
  async getNotifications(): Promise<NotificationItem[]> {
    return request<NotificationItem[]>('/api/notifications');
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/notifications/${id}/read`, {
      method: 'PUT',
    });
  },

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/api/notifications/mark-all-read', {
      method: 'POST',
    });
  },

  // Audit Logs & Emails
  async getAuditLogs(): Promise<AuditLogItem[]> {
    return request<AuditLogItem[]>('/api/audit');
  },

  async getSentEmails(): Promise<Array<{ id: string; to: string; subject: string; body: string; date: string }>> {
    return request<Array<{ id: string; to: string; subject: string; body: string; date: string }>>('/api/emails');
  },

  // Settings
  async getSettings(): Promise<AppSettings> {
    return request<AppSettings>('/api/settings');
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    return request<AppSettings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  // Backups
  async getBackups(): Promise<Array<{ filename: string; size: number; createdAt: string }>> {
    return request<Array<{ filename: string; size: number; createdAt: string }>>('/api/backups');
  },

  async createBackup(notes?: string): Promise<{ success: boolean; filename: string }> {
    return request<{ success: boolean; filename: string }>('/api/backups/create', {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  async restoreBackup(filename?: string, backupData?: any): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/api/backups/restore', {
      method: 'POST',
      body: JSON.stringify({ filename, backupData }),
    });
  },

  // Demo
  async seedDemoData(): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/api/demo/seed', {
      method: 'POST',
    });
  },

  async clearDemoData(): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/api/demo/clear', {
      method: 'POST',
    });
  },
};
