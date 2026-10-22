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

const TOKEN_KEY = 'hm_gran_fiesta_auth_token';

class ApiService {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  public getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  public setToken(token: string | null): void {
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // Storage might not be available
    }
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      let errorMsg = 'Error en la solicitud';
      try {
        const body = await res.json();
        if (body && body.error) {
          errorMsg = body.error;
        }
      } catch {
        errorMsg = `Error ${res.status}: ${res.statusText}`;
      }
      throw new Error(errorMsg);
    }
    return res.json();
  }

  // Auth
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await this.handleResponse<{ user: User; token: string }>(res);
    this.setToken(data.token);
    return data;
  }

  async getMe(): Promise<{ user: User }> {
    const res = await fetch('/api/auth/me', {
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ user: User }>(res);
  }

  async changePassword(newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ newPassword }),
    });
    return this.handleResponse(res);
  }

  async getQuickUsers(): Promise<User[]> {
    const res = await fetch('/api/auth/quick-users');
    return this.handleResponse<User[]>(res);
  }

  // Users
  async getUsers(): Promise<User[]> {
    const res = await fetch('/api/users', {
      headers: this.getHeaders(),
    });
    return this.handleResponse<User[]>(res);
  }

  async createUser(userData: {
    name: string;
    aliases?: string[];
    email?: string;
    phone?: string;
    role?: 'admin' | 'employee';
    status?: 'active' | 'deactivated';
  }): Promise<User> {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });
    return this.handleResponse<User>(res);
  }

  async updateUser(id: string, updates: Partial<User> & { resetPassword?: boolean }): Promise<User> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });
    return this.handleResponse<User>(res);
  }

  async deleteUser(id: string, mode: 'deactivate' | 'permanent'): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/users/${id}?mode=${mode}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  // Schedules
  async getSchedules(): Promise<WeekSchedule[]> {
    const res = await fetch('/api/schedules', {
      headers: this.getHeaders(),
    });
    return this.handleResponse<WeekSchedule[]>(res);
  }

  async getSchedule(id: string): Promise<WeekSchedule> {
    const res = await fetch(`/api/schedules/${id}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<WeekSchedule>(res);
  }

  async saveDraft(data: Partial<WeekSchedule>): Promise<WeekSchedule> {
    const res = await fetch('/api/schedules/draft', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<WeekSchedule>(res);
  }

  async publishSchedule(data: {
    id?: string;
    weekStartDate: string;
    weekEndDate: string;
    weekLabel: string;
    rows: any[];
    rawInputText?: string;
    changeReason?: string;
  }): Promise<WeekSchedule> {
    const res = await fetch('/api/schedules/publish', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<WeekSchedule>(res);
  }

  // Requests
  async getRequests(): Promise<{
    shiftRequests: ShiftChangeRequest[];
    daysOffRequests: DaysOffRequest[];
    absenceRequests: AbsenceRequest[];
  }> {
    const res = await fetch('/api/requests', {
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async createShiftChangeRequest(data: {
    date: string;
    currentShift: string;
    proposedShift: string;
    coworkerId?: string;
    comments?: string;
  }): Promise<ShiftChangeRequest> {
    const res = await fetch('/api/requests/shift-change', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<ShiftChangeRequest>(res);
  }

  async respondCoworkerShiftChange(id: string, response: 'accepted' | 'rejected', comment?: string): Promise<ShiftChangeRequest> {
    const res = await fetch(`/api/requests/shift-change/${id}/coworker-response`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ response, comment }),
    });
    return this.handleResponse<ShiftChangeRequest>(res);
  }

  async createDaysOffRequest(data: {
    startDate: string;
    endDate: string;
    comment?: string;
  }): Promise<DaysOffRequest> {
    const res = await fetch('/api/requests/days-off', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<DaysOffRequest>(res);
  }

  async createAbsenceRequest(data: {
    subType: 'communication' | 'leave_request';
    category: string;
    startDate: string;
    endDate: string;
    hasCertificate: boolean;
    comment?: string;
  }): Promise<AbsenceRequest> {
    const res = await fetch('/api/requests/absence', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<AbsenceRequest>(res);
  }

  async updateRequestStatus(
    type: 'shift-change' | 'days-off' | 'absence',
    id: string,
    status: string,
    comment?: string,
    applyToSchedule?: boolean
  ): Promise<any> {
    const res = await fetch(`/api/requests/${type}/${id}/status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ status, comment, applyToSchedule }),
    });
    return this.handleResponse(res);
  }

  async addRequestComment(type: 'shift-change' | 'days-off' | 'absence', id: string, text: string): Promise<any> {
    const res = await fetch(`/api/requests/${type}/${id}/comments`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ text }),
    });
    return this.handleResponse(res);
  }

  // Incidents
  async getIncidents(): Promise<IncidentItem[]> {
    const res = await fetch('/api/incidents', {
      headers: this.getHeaders(),
    });
    return this.handleResponse<IncidentItem[]>(res);
  }

  async createIncident(data: {
    category: string;
    date: string;
    description: string;
  }): Promise<IncidentItem> {
    const res = await fetch('/api/incidents', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<IncidentItem>(res);
  }

  async updateIncidentStatus(id: string, status: string, comment?: string): Promise<IncidentItem> {
    const res = await fetch(`/api/incidents/${id}/status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ status, comment }),
    });
    return this.handleResponse<IncidentItem>(res);
  }

  // Notifications
  async getNotifications(): Promise<NotificationItem[]> {
    const res = await fetch('/api/notifications', {
      headers: this.getHeaders(),
    });
    return this.handleResponse<NotificationItem[]>(res);
  }

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/notifications/${id}/read`, {
      method: 'PUT',
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    const res = await fetch('/api/notifications/mark-all-read', {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  // Audit & Emails
  async getAuditLogs(): Promise<AuditLogItem[]> {
    const res = await fetch('/api/audit', {
      headers: this.getHeaders(),
    });
    return this.handleResponse<AuditLogItem[]>(res);
  }

  async getSentEmails(): Promise<Array<{ id: string; to: string; subject: string; body: string; date: string }>> {
    const res = await fetch('/api/emails', {
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  // Backups
  async getBackups(): Promise<Array<{ filename: string; size: number; createdAt: string }>> {
    const res = await fetch('/api/backups', {
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async createBackup(notes?: string): Promise<{ success: boolean; filename: string }> {
    const res = await fetch('/api/backups/create', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ notes }),
    });
    return this.handleResponse(res);
  }

  async restoreBackup(filename?: string, backupData?: any): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/backups/restore', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ filename, backupData }),
    });
    return this.handleResponse(res);
  }

  // Settings
  async getSettings(): Promise<AppSettings> {
    const res = await fetch('/api/settings', {
      headers: this.getHeaders(),
    });
    return this.handleResponse<AppSettings>(res);
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(settings),
    });
    return this.handleResponse<AppSettings>(res);
  }

  // Demo Data
  async seedDemoData(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/demo/seed', {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async clearDemoData(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/demo/clear', {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }
}

export const api = new ApiService();
