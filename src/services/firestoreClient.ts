import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, firebaseConfig } from './firebase';
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
import { INITIAL_OFFICIAL_EMPLOYEES } from '../constants/initialEmployees';


const LOCAL_STORAGE_USER_KEY = 'hm_gran_fiesta_user';
const LOCAL_STORAGE_TOKEN_KEY = 'hm_gran_fiesta_auth_token';

const DEFAULT_SETTINGS: AppSettings = {
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



function normalizeDni(dni?: string): string {
  if (!dni) return '';
  return dni.toUpperCase().replace(/[\s\-_.]/g, '').trim();
}

/**
 * 1. AUTO-SEED INITIAL USERS AND SCHEDULES IN FIRESTORE IF EMPTY
 */
export async function ensureFirestoreInitialized(): Promise<User[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    if (!snap.empty) {
      return snap.docs.map(d => d.data() as User);
    }

    // Seed official census
    for (const user of INITIAL_OFFICIAL_EMPLOYEES) {
      await setDoc(doc(db, 'users', user.id), {
        ...user,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    // Seed default settings
    await setDoc(doc(db, 'settings', 'global'), DEFAULT_SETTINGS, { merge: true });

    return INITIAL_OFFICIAL_EMPLOYEES;
  } catch (e) {
    console.warn('Firestore initialization notice:', e);
    return INITIAL_OFFICIAL_EMPLOYEES;
  }
}

/**
 * 2. AUTHENTICATION: LOGIN BY EMAIL OR DNI CONTRASTED DIRECTLY IN FIRESTORE
 */
export async function firestoreLogin(identifier: string, password: string): Promise<{ user: User; token: string }> {
  if (!identifier || !identifier.trim()) {
    throw new Error('Introduce tu correo electrónico o tu DNI/NIE');
  }
  if (!password || !password.trim()) {
    throw new Error('Introduce tu contraseña');
  }

  const cleanId = identifier.trim();
  const cleanEmail = cleanId.toLowerCase();
  const cleanDni = normalizeDni(cleanId);
  const cleanPass = password.trim();

  // Try fetching all users from Firestore
  let users: User[] = [];
  try {
    const snap = await getDocs(collection(db, 'users'));
    if (!snap.empty) {
      users = snap.docs.map(d => d.data() as User);
    } else {
      users = await ensureFirestoreInitialized();
    }
  } catch {
    // If network or initial load issues, use fallback census
    users = INITIAL_OFFICIAL_EMPLOYEES;
  }

  // Find user by email OR by DNI/NIE
  const matchedUser = users.find(u => {
    const uEmail = (u.email || '').toLowerCase().trim();
    const uDni = normalizeDni(u.dni);
    const uAliases = (u.aliases || []).map(a => a.toLowerCase().trim());

    return (
      uEmail === cleanEmail ||
      (cleanDni && uDni === cleanDni) ||
      (cleanEmail === 'xiscoquin@gmail.com' && (uEmail === 'xiscooquin@gmail.com' || u.role === 'admin')) ||
      (cleanEmail === 'xiscooquin@gmail.com' && (uEmail === 'xiscoquin@gmail.com' || u.role === 'admin')) ||
      uAliases.includes(cleanEmail)
    );
  });

  if (!matchedUser) {
    throw new Error('No se encontró ningún usuario con ese correo o DNI/NIE');
  }

  if (matchedUser.status === 'deactivated' || matchedUser.status === 'deleted') {
    throw new Error('Esta cuenta se encuentra desactivada. Contacta con dirección.');
  }

  // Verify Password:
  // 1. Admin master password is 3090 for xiscoquin@gmail.com / xiscooquin@gmail.com
  const isAdminUser =
    matchedUser.role === 'admin' ||
    matchedUser.email.toLowerCase().includes('xisco') ||
    matchedUser.email.toLowerCase() === 'hmgfiesta@gmail.com';

  const matchesAdminMaster = isAdminUser && cleanPass === '3090';
  const matchesTemp = matchedUser.tempPassword && matchedUser.tempPassword.trim() === cleanPass;
  const matchesStored = (matchedUser as any).password && (matchedUser as any).password.trim() === cleanPass;

  if (!matchesAdminMaster && !matchesTemp && !matchesStored) {
    throw new Error('Contraseña incorrecta');
  }

  // Save session to localStorage for immediate persistence
  try {
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, matchedUser.id);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(matchedUser));
  } catch {}

  // Record audit log
  firestoreAddAuditLog(matchedUser.id, matchedUser.name, 'Inicio de sesión exitoso (Directo Firestore)', 'empleado').catch(() => {});

  return { user: matchedUser, token: matchedUser.id };
}

/**
 * 3. GET CURRENT USER WITH PERSISTENCE
 */
export async function firestoreGetMe(userId: string): Promise<User | null> {
  // 1. Try local cache first for instant hydration
  let cachedUser: User | null = null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (raw) cachedUser = JSON.parse(raw);
  } catch {}

  // 2. Fetch fresh document from Firestore
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) {
      const freshUser = snap.data() as User;
      try {
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(freshUser));
      } catch {}
      return freshUser;
    }
  } catch (e) {
    console.warn('Could not refresh user from Firestore, using cache:', e);
  }

  if (cachedUser && cachedUser.id === userId) {
    return cachedUser;
  }

  // Fallback to initial employees
  const found = INITIAL_OFFICIAL_EMPLOYEES.find(u => u.id === userId);
  return found || null;
}

/**
 * 4. GET ALL USERS / QUICK USERS
 */
export async function firestoreGetUsers(): Promise<User[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    if (!snap.empty) {
      const list = snap.docs.map(d => d.data() as User);
      return list.filter(u => u.status !== 'deleted');
    }
    return ensureFirestoreInitialized();
  } catch {
    return INITIAL_OFFICIAL_EMPLOYEES;
  }
}

/**
 * 5. CREATE USER DIRECTLY IN FIRESTORE
 */
export async function firestoreCreateUser(userData: {
  name: string;
  dni?: string;
  aliases?: string[];
  email?: string;
  phone?: string;
  role?: 'admin' | 'employee';
  status?: 'active' | 'deactivated';
  position?: string;
}): Promise<User> {
  const newId = `emp-${Date.now()}`;
  const tempPassword = `emp${Math.floor(1000 + Math.random() * 9000)}`;

  const cleanAliases = Array.isArray(userData.aliases)
    ? userData.aliases.map(a => a.trim()).filter(Boolean)
    : [userData.name.split(' ')[0], userData.name];

  const newUser: User = {
    id: newId,
    name: userData.name.trim(),
    dni: userData.dni?.trim() || '',
    aliases: cleanAliases,
    email: userData.email?.trim() || `empleado${Date.now()}@pendiente.es`,
    phone: userData.phone?.trim() || '',
    role: userData.role || 'employee',
    status: userData.status || 'active',
    position: userData.position || 'Recepcionista',
    tempPassword,
    mustChangePassword: true,
    createdAt: new Date().toISOString(),
    registeredAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'users', newId), newUser);
  firestoreAddAuditLog('admin', 'Administrador', `Alta de empleado: ${newUser.name} (${newUser.dni || 'Sin DNI'})`, 'empleado').catch(() => {});
  return newUser;
}

/**
 * 6. UPDATE USER IN FIRESTORE
 */
export async function firestoreUpdateUser(id: string, updates: Partial<User> & { resetPassword?: boolean }): Promise<User> {
  const userRef = doc(db, 'users', id);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    throw new Error('Usuario no encontrado');
  }

  const current = snap.data() as User;
  const merged: User = { ...current, ...updates };

  if (updates.resetPassword) {
    merged.tempPassword = `emp${Math.floor(1000 + Math.random() * 9000)}`;
    merged.mustChangePassword = true;
  }

  await setDoc(userRef, merged, { merge: true });

  // Update current user cache if it's the active logged-in user
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.id === id) {
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(merged));
      }
    }
  } catch {}

  firestoreAddAuditLog(id, merged.name, `Actualización de perfil / clave`, 'empleado').catch(() => {});
  return merged;
}

/**
 * 7. DELETE / DEACTIVATE USER
 */
export async function firestoreDeleteUser(id: string, mode: 'deactivate' | 'permanent'): Promise<void> {
  if (mode === 'permanent') {
    await deleteDoc(doc(db, 'users', id));
  } else {
    await updateDoc(doc(db, 'users', id), { status: 'deactivated' });
  }
  firestoreAddAuditLog('admin', 'Administrador', `${mode === 'permanent' ? 'Eliminación permanente' : 'Desactivación'} de usuario ${id}`, 'empleado').catch(() => {});
}

/**
 * 8. SELF-REGISTRATION FOR EMPLOYEES
 */
export async function firestoreRegisterEmployee(data: {
  name: string;
  email: string;
  phone?: string;
  dni?: string;
}): Promise<{ user: User; tempPassword: string; token: string }> {
  const cleanEmail = data.email.trim().toLowerCase();
  const cleanDni = normalizeDni(data.dni);

  // Check if already exists in Firestore
  const users = await firestoreGetUsers();
  const existing = users.find(u => {
    return u.email.toLowerCase() === cleanEmail || (cleanDni && normalizeDni(u.dni) === cleanDni);
  });

  if (existing) {
    throw new Error('Ya existe una cuenta con este correo electrónico o DNI/NIE');
  }

  const tempPassword = `emp${Math.floor(1000 + Math.random() * 9000)}`;
  const cleanName = data.name.trim();
  const firstName = cleanName.split(' ')[0];

  const newUser: User = {
    id: `emp-${Date.now()}`,
    name: cleanName,
    dni: data.dni?.trim() || '',
    aliases: [firstName, cleanName],
    email: cleanEmail,
    phone: data.phone?.trim() || '',
    role: 'employee',
    status: 'active',
    position: 'Recepcionista',
    tempPassword,
    mustChangePassword: true,
    createdAt: new Date().toISOString(),
    registeredAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'users', newUser.id), newUser);

  try {
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, newUser.id);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(newUser));
  } catch {}

  firestoreAddAuditLog(newUser.id, newUser.name, `Auto-registro de empleado: ${newUser.name} (${cleanEmail})`, 'empleado').catch(() => {});
  return { user: newUser, tempPassword, token: newUser.id };
}

/**
 * 9. CHANGE PASSWORD DIRECTLY IN FIRESTORE
 */
export async function firestoreChangePassword(userId: string, newPass: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, {
    tempPassword: newPass,
    mustChangePassword: false,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (raw) {
      const user = JSON.parse(raw);
      user.tempPassword = newPass;
      user.mustChangePassword = false;
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
    }
  } catch {}

  firestoreAddAuditLog(userId, userId, 'Cambio de contraseña personal', 'empleado').catch(() => {});
}

/**
 * 10. SCHEDULES (CUADRANTES) DIRECTLY IN FIRESTORE
 */
export async function firestoreGetSchedules(): Promise<WeekSchedule[]> {
  try {
    const snap = await getDocs(collection(db, 'schedules'));
    if (!snap.empty) {
      const list = snap.docs.map(d => d.data() as WeekSchedule);
      return list.sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));
    }
    return [];
  } catch (e) {
    console.warn('Could not read schedules from Firestore:', e);
    return [];
  }
}

export async function firestoreSaveSchedule(data: Partial<WeekSchedule> & { isPublish?: boolean }): Promise<WeekSchedule> {
  const id = data.id || `sched-${data.weekStartDate || Date.now()}`;
  const now = new Date().toISOString();

  const scheduleDoc: WeekSchedule = {
    id,
    weekStartDate: data.weekStartDate || '2026-11-02',
    weekEndDate: data.weekEndDate || '2026-11-08',
    weekLabel: data.weekLabel || 'Cuadrante Semanal',
    status: data.isPublish ? 'published' : (data.status || 'draft'),
    version: (data.version || 0) + 1,
    publishedAt: data.isPublish ? now : data.publishedAt,
    publishedBy: data.publishedBy || 'Administrador Principal (Xisco G. H.)',
    changeReason: data.changeReason || '',
    rows: data.rows || [],
    rawInputText: data.rawInputText || '',
    createdAt: data.createdAt || now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'schedules', id), scheduleDoc, { merge: true });

  firestoreAddAuditLog(
    'admin',
    'Administrador Principal',
    `${data.isPublish ? 'Publicación' : 'Guardado borrador'} de cuadrante: ${scheduleDoc.weekLabel}`,
    'cuadrante',
    undefined,
    scheduleDoc.changeReason
  ).catch(() => {});

  return scheduleDoc;
}

/**
 * 11. REQUESTS (PETICIONES) DIRECTLY IN FIRESTORE
 */
export async function firestoreGetRequests(): Promise<{
  shiftRequests: ShiftChangeRequest[];
  daysOffRequests: DaysOffRequest[];
  absenceRequests: AbsenceRequest[];
}> {
  try {
    const snap = await getDocs(collection(db, 'requests'));
    const all = snap.docs.map(d => d.data() as any);

    return {
      shiftRequests: all.filter(r => r.type === 'shift_change'),
      daysOffRequests: all.filter(r => r.type === 'days_off'),
      absenceRequests: all.filter(r => r.type === 'absence'),
    };
  } catch (e) {
    console.warn('Could not fetch requests from Firestore:', e);
    return { shiftRequests: [], daysOffRequests: [], absenceRequests: [] };
  }
}

export async function firestoreCreateRequest(reqData: any): Promise<any> {
  const id = reqData.id || `req-${Date.now()}`;
  const record = {
    ...reqData,
    id,
    createdAt: reqData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'requests', id), record, { merge: true });
  firestoreAddAuditLog(record.employeeId, record.employeeName, `Nueva solicitud: ${record.type}`, 'solicitud').catch(() => {});
  return record;
}

export async function firestoreUpdateRequest(id: string, updates: any): Promise<void> {
  const reqRef = doc(db, 'requests', id);
  await setDoc(reqRef, { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
  firestoreAddAuditLog('admin', 'Administrador', `Actualización de solicitud ${id}`, 'solicitud').catch(() => {});
}

/**
 * 12. INCIDENTS DIRECTLY IN FIRESTORE
 */
export async function firestoreGetIncidents(): Promise<IncidentItem[]> {
  try {
    const snap = await getDocs(collection(db, 'incidents'));
    return snap.docs.map(d => d.data() as IncidentItem);
  } catch {
    return [];
  }
}

export async function firestoreCreateIncident(data: any): Promise<IncidentItem> {
  const id = `inc-${Date.now()}`;
  const incident: IncidentItem = {
    id,
    employeeId: data.employeeId || 'emp-anon',
    employeeName: data.employeeName || 'Empleado',
    category: data.category,
    date: data.date,
    description: data.description,
    status: 'abierta',
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'incidents', id), incident);
  firestoreAddAuditLog(incident.employeeId, incident.employeeName, `Nueva incidencia: ${incident.category}`, 'incidencia').catch(() => {});
  return incident;
}

/**
 * 13. SETTINGS DIRECTLY IN FIRESTORE
 */
export async function firestoreGetSettings(): Promise<AppSettings> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'global'));
    if (snap.exists()) {
      return snap.data() as AppSettings;
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

export async function firestoreUpdateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  await setDoc(doc(db, 'settings', 'global'), merged, { merge: true });
  firestoreAddAuditLog('admin', 'Administrador', 'Actualización de ajustes operativos', 'ajustes').catch(() => {});
  return merged;
}

/**
 * 14. AUDIT LOGS DIRECTLY IN FIRESTORE
 */
export async function firestoreGetAuditLogs(): Promise<AuditLogItem[]> {
  try {
    const snap = await getDocs(collection(db, 'audit_logs'));
    const list = snap.docs.map(d => d.data() as AuditLogItem);
    return list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch {
    return [];
  }
}

export async function firestoreAddAuditLog(
  userId: string,
  userName: string,
  action: string,
  entity: 'cuadrante' | 'solicitud' | 'empleado' | 'incidencia' | 'ajustes' | 'copia_seguridad',
  previousValue?: string,
  newValue?: string,
  notes?: string
): Promise<void> {
  try {
    const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const logItem: AuditLogItem = {
      id,
      timestamp: new Date().toISOString(),
      userId,
      userName,
      action,
      entity,
      previousValue,
      newValue,
      notes,
    };
    await setDoc(doc(db, 'audit_logs', id), logItem);
  } catch (e) {
    console.warn('Silent audit log capture:', e);
  }
}

/**
 * 15. NOTIFICATIONS
 */
export async function firestoreGetNotifications(userId?: string): Promise<NotificationItem[]> {
  try {
    const snap = await getDocs(collection(db, 'notifications'));
    const list = snap.docs.map(d => d.data() as NotificationItem);
    if (userId) {
      return list.filter(n => n.userId === userId || n.userId === 'all');
    }
    return list;
  } catch {
    return [];
  }
}

export async function firestoreMarkNotificationRead(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  } catch {}
}
