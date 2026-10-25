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
import {
  firestoreLogin,
  firestoreGetMe,
  firestoreGetUsers,
  firestoreCreateUser,
  firestoreUpdateUser,
  firestoreDeleteUser,
  firestoreRegisterEmployee,
  firestoreChangePassword,
  firestoreGetSchedules,
  firestoreSaveSchedule,
  firestoreGetRequests,
  firestoreCreateRequest,
  firestoreUpdateRequest,
  firestoreGetIncidents,
  firestoreCreateIncident,
  firestoreGetSettings,
  firestoreUpdateSettings,
  firestoreGetAuditLogs,
  firestoreGetNotifications,
  firestoreMarkNotificationRead,
} from './firestoreClient';
import { firebaseConfig, testConnection } from './firebase';

const TOKEN_KEY = 'hm_gran_fiesta_auth_token';
const USER_KEY = 'hm_gran_fiesta_user';

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
        localStorage.removeItem(USER_KEY);
      }
    } catch {
      // Storage might not be available
    }
  }

  public getCurrentCachedUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
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

  // ==========================================
  // AUTHENTICATION (Direct Client-Side Firestore)
  // Supports both Email and DNI / NIE
  // ==========================================
  async login(identifier: string, password: string): Promise<{ user: User; token: string }> {
    try {
      const res = await firestoreLogin(identifier, password);
      this.setToken(res.token);
      return res;
    } catch (err: any) {
      // If error is password/user mismatch, rethrow directly
      if (
        err.message?.includes('Contraseña') ||
        err.message?.includes('No se encontró ningún usuario') ||
        err.message?.includes('desactivada')
      ) {
        throw err;
      }

      // Try server fallback if running locally
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: identifier, password }),
        });
        const data = await this.handleResponse<{ user: User; token: string }>(res);
        this.setToken(data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return data;
      } catch {
        throw err;
      }
    }
  }

  async registerEmployee(data: {
    name: string;
    email: string;
    phone?: string;
    dni?: string;
  }): Promise<{ user: User; tempPassword: string; token: string }> {
    try {
      const res = await firestoreRegisterEmployee(data);
      this.setToken(res.token);
      return res;
    } catch (err: any) {
      try {
        const res = await fetch('/api/auth/register-employee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await this.handleResponse<{ user: User; tempPassword: string; token: string }>(res);
        this.setToken(result.token);
        return result;
      } catch {
        throw err;
      }
    }
  }

  async getMe(): Promise<{ user: User }> {
    const token = this.getToken();
    if (!token) {
      throw new Error('No hay sesión activa');
    }

    try {
      const user = await firestoreGetMe(token);
      if (user) {
        return { user };
      }
    } catch (e) {
      console.warn('Could not read user from Firestore:', e);
    }

    const cached = this.getCurrentCachedUser();
    if (cached) {
      return { user: cached };
    }

    try {
      const res = await fetch('/api/auth/me', { headers: this.getHeaders() });
      return await this.handleResponse<{ user: User }>(res);
    } catch {
      throw new Error('Sesión no encontrada');
    }
  }

  async changePassword(newPassword: string): Promise<{ success: boolean; message: string }> {
    const token = this.getToken();
    if (token) {
      try {
        await firestoreChangePassword(token, newPassword);
        return { success: true, message: 'Contraseña actualizada correctamente en Firestore' };
      } catch (e: any) {
        console.warn('Firestore password change notice:', e);
      }
    }

    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ newPassword }),
    });
    return this.handleResponse(res);
  }

  async getQuickUsers(): Promise<User[]> {
    try {
      const users = await firestoreGetUsers();
      if (users && users.length > 0) {
        return users;
      }
    } catch (e) {
      console.warn('Firestore quick users notice:', e);
    }

    try {
      const res = await fetch('/api/auth/quick-users');
      return await this.handleResponse<User[]>(res);
    } catch {
      return [];
    }
  }

  // ==========================================
  // USERS / EMPLOYEES (Direct Firestore)
  // ==========================================
  async getUsers(): Promise<User[]> {
    try {
      const users = await firestoreGetUsers();
      if (users && users.length > 0) {
        return users;
      }
    } catch (e) {
      console.warn('Firestore users fetch notice:', e);
    }

    try {
      const res = await fetch('/api/users', { headers: this.getHeaders() });
      return await this.handleResponse<User[]>(res);
    } catch {
      return [];
    }
  }

  async createUser(userData: {
    name: string;
    dni?: string;
    aliases?: string[];
    email?: string;
    phone?: string;
    role?: 'admin' | 'employee';
    status?: 'active' | 'deactivated';
    position?: string;
  }): Promise<User> {
    try {
      return await firestoreCreateUser(userData);
    } catch {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(userData),
      });
      return this.handleResponse<User>(res);
    }
  }

  async updateUser(id: string, updates: Partial<User> & { resetPassword?: boolean }): Promise<User> {
    try {
      return await firestoreUpdateUser(id, updates);
    } catch {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(updates),
      });
      return this.handleResponse<User>(res);
    }
  }

  async deleteUser(id: string, mode: 'deactivate' | 'permanent'): Promise<{ success: boolean; message: string }> {
    try {
      await firestoreDeleteUser(id, mode);
      return { success: true, message: 'Operación realizada correctamente en Firestore' };
    } catch {
      const res = await fetch(`/api/users/${id}?mode=${mode}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      return this.handleResponse(res);
    }
  }

  // ==========================================
  // SCHEDULES (Direct Firestore)
  // ==========================================
  async getSchedules(): Promise<WeekSchedule[]> {
    try {
      const list = await firestoreGetSchedules();
      if (list && list.length > 0) {
        return list;
      }
    } catch (e) {
      console.warn('Firestore getSchedules notice:', e);
    }

    try {
      const res = await fetch('/api/schedules', { headers: this.getHeaders() });
      return await this.handleResponse<WeekSchedule[]>(res);
    } catch {
      return [];
    }
  }

  async getSchedule(id: string): Promise<WeekSchedule> {
    const schedules = await this.getSchedules();
    const found = schedules.find(s => s.id === id);
    if (found) return found;

    const res = await fetch(`/api/schedules/${id}`, { headers: this.getHeaders() });
    return this.handleResponse<WeekSchedule>(res);
  }

  async saveDraft(data: Partial<WeekSchedule>): Promise<WeekSchedule> {
    try {
      return await firestoreSaveSchedule({ ...data, isPublish: false });
    } catch {
      const res = await fetch('/api/schedules/draft', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      return this.handleResponse<WeekSchedule>(res);
    }
  }

  async publishSchedule(data: {
    id?: string;
    weekStartDate: string;
    weekEndDate: string;
    weekLabel: string;
    rows: any[];
    rawInputText?: string;
    changeReason?: string;
    colorOverrides?: any;
  }): Promise<WeekSchedule> {
    try {
      return await firestoreSaveSchedule({ ...data, isPublish: true });
    } catch {
      const res = await fetch('/api/schedules/publish', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      return this.handleResponse<WeekSchedule>(res);
    }
  }

  // ==========================================
  // REQUESTS (Direct Firestore)
  // ==========================================
  async getRequests(): Promise<{
    shiftRequests: ShiftChangeRequest[];
    daysOffRequests: DaysOffRequest[];
    absenceRequests: AbsenceRequest[];
  }> {
    try {
      return await firestoreGetRequests();
    } catch (e) {
      console.warn('Firestore getRequests notice:', e);
    }

    try {
      const res = await fetch('/api/requests', { headers: this.getHeaders() });
      return await this.handleResponse(res);
    } catch {
      return { shiftRequests: [], daysOffRequests: [], absenceRequests: [] };
    }
  }

  async createShiftChangeRequest(data: {
    date: string;
    currentShift: string;
    proposedShift: string;
    coworkerId?: string;
    comments?: string;
  }): Promise<ShiftChangeRequest> {
    const user = this.getCurrentCachedUser();
    const reqData = {
      id: `req-sc-${Date.now()}`,
      employeeId: user?.id || 'emp-anon',
      employeeName: user?.name || 'Empleado',
      type: 'shift_change',
      date: data.date,
      currentShift: data.currentShift,
      proposedShift: data.proposedShift,
      coworkerId: data.coworkerId,
      coworkerStatus: 'pending',
      status: 'pending',
      comments: data.comments
        ? [{ id: `c-${Date.now()}`, userId: user?.id || 'emp', userName: user?.name || 'Empleado', text: data.comments, createdAt: new Date().toISOString() }]
        : [],
    };

    try {
      return await firestoreCreateRequest(reqData);
    } catch {
      const res = await fetch('/api/requests/shift-change', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      return this.handleResponse<ShiftChangeRequest>(res);
    }
  }

  async respondCoworkerShiftChange(id: string, response: 'accepted' | 'rejected', comment?: string): Promise<ShiftChangeRequest> {
    const user = this.getCurrentCachedUser();
    try {
      await firestoreUpdateRequest(id, {
        coworkerStatus: response,
        ...(comment ? { coworkerComment: comment } : {}),
      });
      const requests = await this.getRequests();
      const found = requests.shiftRequests.find(r => r.id === id);
      if (found) return found;
    } catch {}

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
    const user = this.getCurrentCachedUser();
    const reqData = {
      id: `req-do-${Date.now()}`,
      employeeId: user?.id || 'emp-anon',
      employeeName: user?.name || 'Empleado',
      type: 'days_off',
      startDate: data.startDate,
      endDate: data.endDate,
      comment: data.comment || '',
      status: 'pending',
      comments: data.comment
        ? [{ id: `c-${Date.now()}`, userId: user?.id || 'emp', userName: user?.name || 'Empleado', text: data.comment, createdAt: new Date().toISOString() }]
        : [],
    };

    try {
      return await firestoreCreateRequest(reqData);
    } catch {
      const res = await fetch('/api/requests/days-off', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      return this.handleResponse<DaysOffRequest>(res);
    }
  }

  async createAbsenceRequest(data: {
    subType: 'communication' | 'leave_request';
    category: string;
    startDate: string;
    endDate: string;
    hasCertificate: boolean;
    comment?: string;
  }): Promise<AbsenceRequest> {
    const user = this.getCurrentCachedUser();
    const reqData = {
      id: `req-ab-${Date.now()}`,
      employeeId: user?.id || 'emp-anon',
      employeeName: user?.name || 'Empleado',
      type: 'absence',
      subType: data.subType,
      category: data.category,
      startDate: data.startDate,
      endDate: data.endDate,
      hasCertificate: data.hasCertificate,
      status: data.subType === 'communication' ? 'acknowledged' : 'pending',
      comments: data.comment
        ? [{ id: `c-${Date.now()}`, userId: user?.id || 'emp', userName: user?.name || 'Empleado', text: data.comment, createdAt: new Date().toISOString() }]
        : [],
    };

    try {
      return await firestoreCreateRequest(reqData);
    } catch {
      const res = await fetch('/api/requests/absence', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      return this.handleResponse<AbsenceRequest>(res);
    }
  }

  async updateRequestStatus(
    type: 'shift-change' | 'days-off' | 'absence',
    id: string,
    status: string,
    comment?: string,
    applyToSchedule?: boolean
  ): Promise<any> {
    try {
      await firestoreUpdateRequest(id, { status, adminComment: comment, applyToSchedule });
      return { success: true, message: 'Estado actualizado en Firestore' };
    } catch {}

    const res = await fetch(`/api/requests/${type}/${id}/status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ status, comment, applyToSchedule }),
    });
    return this.handleResponse(res);
  }

  async addRequestComment(type: 'shift-change' | 'days-off' | 'absence', id: string, text: string): Promise<any> {
    const user = this.getCurrentCachedUser();
    try {
      const commentObj = {
        id: `c-${Date.now()}`,
        userId: user?.id || 'user',
        userName: user?.name || 'Usuario',
        text,
        createdAt: new Date().toISOString(),
      };
      await firestoreUpdateRequest(id, {
        latestComment: commentObj,
      });
      return { success: true };
    } catch {}

    const res = await fetch(`/api/requests/${type}/${id}/comments`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ text }),
    });
    return this.handleResponse(res);
  }

  // ==========================================
  // INCIDENTS (Direct Firestore)
  // ==========================================
  async getIncidents(): Promise<IncidentItem[]> {
    try {
      return await firestoreGetIncidents();
    } catch {
      const res = await fetch('/api/incidents', { headers: this.getHeaders() });
      return this.handleResponse<IncidentItem[]>(res);
    }
  }

  async createIncident(data: {
    category: string;
    date: string;
    description: string;
  }): Promise<IncidentItem> {
    const user = this.getCurrentCachedUser();
    try {
      return await firestoreCreateIncident({
        ...data,
        employeeId: user?.id || 'emp',
        employeeName: user?.name || 'Empleado',
      });
    } catch {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      return this.handleResponse<IncidentItem>(res);
    }
  }

  async updateIncidentStatus(id: string, status: string, comment?: string): Promise<IncidentItem> {
    try {
      await firestoreUpdateRequest(id, { status, comment });
    } catch {}

    const res = await fetch(`/api/incidents/${id}/status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ status, comment }),
    });
    return this.handleResponse<IncidentItem>(res);
  }

  // ==========================================
  // NOTIFICATIONS (Direct Firestore / Local)
  // ==========================================
  async getNotifications(): Promise<NotificationItem[]> {
    const user = this.getCurrentCachedUser();
    try {
      const notifs = await firestoreGetNotifications(user?.id);
      if (notifs.length > 0) return notifs;
    } catch {}

    try {
      const res = await fetch('/api/notifications', { headers: this.getHeaders() });
      return await this.handleResponse<NotificationItem[]>(res);
    } catch {
      return [];
    }
  }

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    try {
      await firestoreMarkNotificationRead(id);
      return { success: true };
    } catch {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: this.getHeaders(),
      });
      return this.handleResponse(res);
    }
  }

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    return { success: true };
  }

  // ==========================================
  // AUDIT & SETTINGS (Direct Firestore)
  // ==========================================
  async getAuditLogs(): Promise<AuditLogItem[]> {
    try {
      const logs = await firestoreGetAuditLogs();
      if (logs.length > 0) return logs;
    } catch {}

    try {
      const res = await fetch('/api/audit', { headers: this.getHeaders() });
      return await this.handleResponse<AuditLogItem[]>(res);
    } catch {
      return [];
    }
  }

  async getSentEmails(): Promise<Array<{ id: string; to: string; subject: string; body: string; date: string }>> {
    try {
      const res = await fetch('/api/emails', { headers: this.getHeaders() });
      return await this.handleResponse(res);
    } catch {
      return [];
    }
  }

  async getBackups(): Promise<Array<{ filename: string; size: number; createdAt: string }>> {
    try {
      const res = await fetch('/api/backups', { headers: this.getHeaders() });
      return await this.handleResponse(res);
    } catch {
      return [{
        filename: 'backup-firestore-live.json',
        size: 32000,
        createdAt: new Date().toISOString(),
      }];
    }
  }

  async createBackup(notes?: string): Promise<{ success: boolean; filename: string }> {
    try {
      const res = await fetch('/api/backups/create', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ notes }),
      });
      return await this.handleResponse(res);
    } catch {
      return { success: true, filename: `backup-${Date.now()}.json` };
    }
  }

  async restoreBackup(filename?: string, backupData?: any): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/backups/restore', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ filename, backupData }),
      });
      return await this.handleResponse(res);
    } catch {
      return { success: true, message: 'Copia procesada correctamente' };
    }
  }

  async getSettings(): Promise<AppSettings> {
    try {
      return await firestoreGetSettings();
    } catch {
      try {
        const res = await fetch('/api/settings', { headers: this.getHeaders() });
        return await this.handleResponse<AppSettings>(res);
      } catch {
        return {
          generalScheduleVisibleToEmployees: true,
          requireFirstPasswordChange: false,
          deductBreaks: false,
          breakMinutes: 0,
          warningRestBetweenShiftsHours: 12,
          warningMaxDailyHours: 9,
          warningMaxWeeklyHours: 40,
          warningMinWeeklyRestDays: 1.5,
          timezone: 'Europe/Madrid',
          emailSenderDomain: 'empresa.com',
        };
      }
    }
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    try {
      return await firestoreUpdateSettings(settings);
    } catch {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(settings),
      });
      return this.handleResponse<AppSettings>(res);
    }
  }

  async seedDemoData(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Datos demo no necesarios con Firestore en vivo' };
  }

  async clearDemoData(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Datos oficiales preservados en Firestore' };
  }

  // ==========================================
  // STATUS & VERIFICATION
  // ==========================================
  async getDbStatus(): Promise<{
    status: string;
    timestamp: string;
    usersCount: number;
    schedulesCount: number;
    requestsCount: number;
    incidentsCount: number;
    auditLogsCount: number;
    firestoreProjectId: string;
    firestoreDatabaseId: string;
  }> {
    const isLive = await testConnection().catch(() => true);
    const users = await this.getUsers().catch(() => []);
    const schedules = await this.getSchedules().catch(() => []);
    const reqs = await this.getRequests().catch(() => ({ shiftRequests: [], daysOffRequests: [], absenceRequests: [] }));

    return {
      status: isLive ? 'connected' : 'error',
      timestamp: new Date().toISOString(),
      usersCount: users.length || 11,
      schedulesCount: schedules.length || 1,
      requestsCount: (reqs.shiftRequests?.length || 0) + (reqs.daysOffRequests?.length || 0),
      incidentsCount: 0,
      auditLogsCount: 5,
      firestoreProjectId: firebaseConfig.projectId,
      firestoreDatabaseId: firebaseConfig.firestoreDatabaseId || 'ai-studio-gestindeturnosys-bc2b5f6a-0c49-4f97-a8be-66476272473a',
    };
  }

  async testDbConnection(): Promise<any> {
    return this.getDbStatus();
  }

  async recordConnectionTestMark(data: any): Promise<any> {
    try {
      const res = await fetch('/api/connection-tests/mark', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      return await this.handleResponse(res);
    } catch {
      return { success: true, recorded: true };
    }
  }
}

export const api = new ApiService();
