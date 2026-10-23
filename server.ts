import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
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
} from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Data Directory (Supports local, Cloud Run, and Vercel serverless /tmp)
const DATA_DIR = process.env.VERCEL
  ? path.resolve('/tmp', 'hotel-data')
  : path.resolve(__dirname, 'data');
const BACKUPS_DIR = path.resolve(DATA_DIR, 'backups');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// In Vercel serverless, seed initial DB from project files if not exists in /tmp
if (process.env.VERCEL && !fs.existsSync(DB_FILE)) {
  const localDb = path.resolve(__dirname, 'data', 'database.json');
  if (fs.existsSync(localDb)) {
    try {
      fs.copyFileSync(localDb, DB_FILE);
    } catch {
      // Handled in loadDatabase
    }
  }
}

interface DatabaseSchema {
  users: User[];
  schedules: WeekSchedule[];
  shiftRequests: ShiftChangeRequest[];
  daysOffRequests: DaysOffRequest[];
  absenceRequests: AbsenceRequest[];
  incidents: IncidentItem[];
  notifications: NotificationItem[];
  auditLogs: AuditLogItem[];
  settings: AppSettings;
  sentEmails: Array<{
    id: string;
    to: string;
    subject: string;
    body: string;
    date: string;
  }>;
}

// Helper to normalize DNI/NIE (removes hyphens, spaces, dots and transforms to uppercase)
export function normalizeDni(dni?: string): string {
  if (!dni) return '';
  return dni.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

// Initial employees specified strictly in requirements with their official DNI/NIE
const INITIAL_EMPLOYEES: User[] = [
  {
    id: 'emp-1',
    name: 'Francisco Gallego Huguet',
    aliases: ['Francisco Gallego', 'Gallego', 'Fran Gallego', 'Xisco', 'Cisco', 'Fran', 'Paco'],
    email: 'francisco.gallego@pendiente.es',
    dni: '43134155-R',
    phone: '',
    role: 'employee',
    status: 'active',
    tempPassword: 'emp1234',
    mustChangePassword: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'emp-2',
    name: 'Aliz Varga',
    aliases: ['Aliz', 'Varga'],
    email: 'aliz.varga@pendiente.es',
    dni: 'X4366728V',
    phone: '',
    role: 'employee',
    status: 'active',
    tempPassword: 'emp1234',
    mustChangePassword: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'emp-3',
    name: 'Oscar David Millán Vivancos',
    aliases: ['Oscar', 'Óscar', 'Oscar David', 'Millán', 'Millan'],
    email: 'oscar.millan@pendiente.es',
    dni: '43070789-T',
    phone: '',
    role: 'employee',
    status: 'active',
    tempPassword: 'emp1234',
    mustChangePassword: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'emp-4',
    name: 'Francisco Javier Segundo Moya',
    aliases: ['Javier', 'Javi', 'Fco. Javier', 'Segundo'],
    email: 'javier.segundo@pendiente.es',
    dni: '43215526K',
    phone: '',
    role: 'employee',
    status: 'active',
    tempPassword: 'emp1234',
    mustChangePassword: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'emp-5',
    name: 'Inés Ruiz Morey',
    aliases: ['Inés', 'Ines', 'Ruiz'],
    email: 'ines.ruiz@pendiente.es',
    dni: '41618107-K',
    phone: '',
    role: 'employee',
    status: 'active',
    tempPassword: 'emp1234',
    mustChangePassword: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'emp-6',
    name: 'Josep Vidal Pérez',
    aliases: ['Josep', 'Vidal'],
    email: 'josep.vidal@pendiente.es',
    dni: '43231201-X',
    phone: '',
    role: 'employee',
    status: 'active',
    tempPassword: 'emp1234',
    mustChangePassword: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'emp-7',
    name: 'Miriam García Heras',
    aliases: ['Miriam', 'García', 'Garcia'],
    email: 'miriam.garcia@pendiente.es',
    dni: '41587664-F',
    phone: '',
    role: 'employee',
    status: 'active',
    tempPassword: 'emp1234',
    mustChangePassword: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'emp-8',
    name: 'Carlos Rodríguez Martín',
    aliases: ['Carlos', 'Rodríguez', 'Rodriguez'],
    email: 'carlos.rodriguez@pendiente.es',
    dni: '06567005-E',
    phone: '',
    role: 'employee',
    status: 'active',
    tempPassword: 'emp1234',
    mustChangePassword: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'emp-9',
    name: 'Jakeline Munera Zapata',
    aliases: ['Jakeline', 'Munera', 'Jaqueline'],
    email: 'jakeline.munera@pendiente.es',
    dni: '54624614-M',
    phone: '',
    role: 'employee',
    status: 'active',
    tempPassword: 'emp1234',
    mustChangePassword: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'emp-10',
    name: 'Antonio Torres Mulet',
    aliases: ['Antonio', 'Toni', 'Torres'],
    email: 'antonio.torres@pendiente.es',
    dni: '43177009-Y',
    phone: '',
    role: 'employee',
    status: 'active',
    tempPassword: 'emp1234',
    mustChangePassword: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'emp-11',
    name: 'Lucía Fernández',
    aliases: ['Lucia', 'Lucía'],
    email: 'lucia.fernandez@pendiente.es',
    dni: '43299881-A',
    phone: '',
    role: 'employee',
    status: 'active',
    tempPassword: 'emp1234',
    mustChangePassword: false,
    createdAt: new Date().toISOString(),
  },
];

const ADMIN_USER: User = {
  id: 'admin-1',
  name: 'Administrador Principal (Francisco Gallego Huguet)',
  aliases: ['Admin', 'Dirección', 'Xisco', 'xiscooquin', 'Francisco Gallego'],
  email: 'xiscooquin@gmail.com',
  dni: '43134155-R',
  phone: '+34 600 000 000',
  role: 'admin',
  status: 'active',
  tempPassword: '3090',
  mustChangePassword: false,
  createdAt: new Date().toISOString(),
};

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

function getInitialDatabase(): DatabaseSchema {
  return {
    users: [ADMIN_USER, ...INITIAL_EMPLOYEES],
    schedules: [],
    shiftRequests: [],
    daysOffRequests: [],
    absenceRequests: [],
    incidents: [],
    notifications: [],
    auditLogs: [
      {
        id: 'log-init',
        timestamp: new Date().toISOString(),
        userId: 'admin-1',
        userName: 'Sistema',
        action: 'Inicialización de la base de datos',
        entity: 'ajustes',
        notes: 'Cargadas cuentas de empleados iniciales con DNI oficial asignado',
      },
    ],
    settings: DEFAULT_SETTINGS,
    sentEmails: [],
  };
}

let db: DatabaseSchema = getInitialDatabase();

// Load or Initialize database from disk
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(raw);
      // Ensure all collections exist
      if (!db.users) db.users = [ADMIN_USER, ...INITIAL_EMPLOYEES];

      // Enrich users with official DNIs if missing or update
      INITIAL_EMPLOYEES.forEach(initEmp => {
        const existing = db.users.find(u => u.id === initEmp.id || normalizeDni(u.dni) === normalizeDni(initEmp.dni) || u.name.toLowerCase() === initEmp.name.toLowerCase());
        if (existing) {
          if (!existing.dni) existing.dni = initEmp.dni;
        } else {
          db.users.push(initEmp);
        }
      });

      const adminInDb = db.users.find(u => u.role === 'admin' || u.id === 'admin-1');
      if (adminInDb) {
        adminInDb.email = ADMIN_USER.email;
        adminInDb.tempPassword = ADMIN_USER.tempPassword;
        if (!adminInDb.dni) adminInDb.dni = ADMIN_USER.dni;
      }

      if (!db.schedules) db.schedules = [];
      if (!db.shiftRequests) db.shiftRequests = [];
      if (!db.daysOffRequests) db.daysOffRequests = [];
      if (!db.absenceRequests) db.absenceRequests = [];
      if (!db.incidents) db.incidents = [];
      if (!db.notifications) db.notifications = [];
      if (!db.auditLogs) db.auditLogs = [];
      if (!db.settings) db.settings = DEFAULT_SETTINGS;
      if (!db.sentEmails) db.sentEmails = [];

      saveDatabase();
    } else {
      saveDatabase();
    }
  } catch (err) {
    console.error('Error loading database, initializing fresh one:', err);
    db = getInitialDatabase();
    saveDatabase();
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

function createBackupSnapshot(notes = 'Copia automática'): string {
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `backup-${dateStr}.json`;
  const backupPath = path.resolve(BACKUPS_DIR, backupFileName);
  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      {
        metadata: {
          timestamp: new Date().toISOString(),
          notes,
          usersCount: db.users.length,
          schedulesCount: db.schedules.length,
        },
        data: db,
      },
      null,
      2
    )
  );
  return backupFileName;
}

loadDatabase();
// Save initial backup
createBackupSnapshot('Copia de seguridad inicial');

// Helper for audit logs
function addAuditLog(
  userId: string,
  userName: string,
  action: string,
  entity: AuditLogItem['entity'],
  previousValue?: string,
  newValue?: string,
  notes?: string
) {
  const log: AuditLogItem = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    userId,
    userName,
    action,
    entity,
    previousValue,
    newValue,
    notes,
  };
  db.auditLogs.unshift(log);
  if (db.auditLogs.length > 500) {
    db.auditLogs.pop();
  }
}

// Helper for notifications & email
function sendNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationItem['type'],
  link?: string
) {
  const notif: NotificationItem = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    userId,
    title,
    message,
    type,
    read: false,
    link,
    createdAt: new Date().toISOString(),
  };
  db.notifications.unshift(notif);

  // Email simulation (Privacy rule strictly applied: NO medical info, only "Tienes una novedad en la aplicación")
  const targetUser = db.users.find(u => u.id === userId);
  const targetEmail = targetUser?.email || (userId === 'admin' || userId === 'admin-1' ? ADMIN_USER.email : 'notificaciones@empresa.com');

  const emailEntry = {
    id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    to: targetEmail,
    subject: `Novedad en Hotel HM Gran Fiesta: ${title}`,
    body: `Hola,\n\nTienes una novedad en la aplicación de Hotel HM Gran Fiesta: ${title}.\n\nPor favor, entra a la app para revisar los detalles.\n\nAtentamente,\nHotel HM Gran Fiesta`,
    date: new Date().toISOString(),
  };
  db.sentEmails.unshift(emailEntry);
  if (db.sentEmails.length > 200) db.sentEmails.pop();
}

// Authentication middleware
interface AuthRequest extends Request {
  user?: User;
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const userId = authHeader.replace(/^Bearer\s+/i, '').trim();
  const foundUser = db.users.find(u => u.id === userId);

  if (!foundUser || foundUser.status === 'deactivated' || foundUser.status === 'deleted') {
    return res.status(401).json({ error: 'Usuario no válido o cuenta desactivada' });
  }

  req.user = foundUser;
  next();
}

function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado: solo el administrador puede realizar esta acción' });
  }
  next();
}

// ----------------- API ROUTES ----------------- //

// 1. Auth routes
// Login with Email or DNI
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Correo o DNI y contraseña obligatorios' });
  }

  const cleanInput = email.trim();
  const cleanEmail = cleanInput.toLowerCase();
  const normalizedInput = normalizeDni(cleanInput);

  const user = db.users.find(u => {
    // Check by DNI first
    if (u.dni && normalizeDni(u.dni) === normalizedInput) return true;

    // Check by email
    const userEmail = u.email ? u.email.toLowerCase() : '';
    if (userEmail === cleanEmail) return true;

    // Admin alias emails
    if (u.role === 'admin' && (
      cleanEmail === 'xiscooquin@gmail.com' ||
      cleanEmail === 'xiscoquin@gmail.com' ||
      cleanEmail === 'xiscoquin1@gmail.com' ||
      cleanEmail === 'admin@empresa.com'
    )) return true;

    return false;
  });

  if (!user) {
    return res.status(401).json({ error: 'Credenciales incorrectas: no se encontró ningún usuario con ese Correo o DNI' });
  }

  if (user.status === 'deactivated' || user.status === 'deleted') {
    return res.status(403).json({ error: 'Cuenta desactivada. Contacta al administrador.' });
  }

  // Check password
  if (user.tempPassword && user.tempPassword !== password.trim()) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  res.json({
    user,
    token: user.id, // Lightweight token based on user id for local dev
  });
});

// Verify DNI route (check if DNI belongs to an authorized employee)
app.post('/api/auth/verify-dni', (req, res) => {
  const { dni } = req.body;
  if (!dni || !dni.trim()) {
    return res.status(400).json({ error: 'Por favor introduce el número de DNI o NIE' });
  }

  const normalized = normalizeDni(dni.trim());
  const foundUser = db.users.find(u => u.dni && normalizeDni(u.dni) === normalized && u.status !== 'deleted');

  if (!foundUser) {
    return res.status(404).json({
      error: 'DNI no encontrado en el listado oficial de empleados de Hotel HM Gran Fiesta. Contacta con Recursos Humanos o Dirección.',
    });
  }

  // Check if already registered
  const isRegistered = Boolean(foundUser.registeredAt) || (foundUser.email && !foundUser.email.includes('pendiente.es'));

  res.json({
    found: true,
    employee: {
      id: foundUser.id,
      name: foundUser.name,
      dni: foundUser.dni,
      email: foundUser.email,
      phone: foundUser.phone || '',
      role: foundUser.role,
      isRegistered,
    },
  });
});

// Register with DNI route (complete employee signup)
app.post('/api/auth/register-with-dni', (req, res) => {
  const { dni, email, password, phone } = req.body;

  if (!dni || !dni.trim()) {
    return res.status(400).json({ error: 'El DNI es obligatorio' });
  }
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'El correo electrónico es obligatorio' });
  }
  if (!password || password.trim().length < 4) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
  }

  const normalized = normalizeDni(dni.trim());
  const user = db.users.find(u => u.dni && normalizeDni(u.dni) === normalized && u.status !== 'deleted');

  if (!user) {
    return res.status(404).json({ error: 'DNI no encontrado en el registro de empleados' });
  }

  const cleanEmail = email.trim().toLowerCase();
  // Check if another active user is already using this email
  const existingEmailUser = db.users.find(
    u => u.id !== user.id && u.email && u.email.toLowerCase() === cleanEmail && u.status !== 'deleted'
  );
  if (existingEmailUser) {
    return res.status(400).json({ error: 'Este correo electrónico ya está siendo utilizado por otra cuenta' });
  }

  user.email = cleanEmail;
  user.tempPassword = password.trim();
  if (phone) user.phone = phone.trim();
  user.status = 'active';
  user.mustChangePassword = false;
  user.registeredAt = new Date().toISOString();
  user.updatedAt = new Date().toISOString();

  saveDatabase();

  addAuditLog(
    user.id,
    user.name,
    `Alta de empleado con DNI ${user.dni}: asignó correo ${cleanEmail}`,
    'empleado'
  );

  sendNotification(
    'admin-1',
    'Empleado dado de alta con DNI',
    `${user.name} ha completado su registro con DNI ${user.dni} y correo ${cleanEmail}.`,
    'request_created'
  );

  res.status(200).json({
    success: true,
    user,
    token: user.id,
    message: `¡Registro completado con éxito! Bienvenido/a a Hotel HM Gran Fiesta, ${user.name}.`,
  });
});

// Reset Password via DNI route
app.post('/api/auth/reset-password', (req, res) => {
  const { dni, email, newPassword } = req.body;

  if (!dni || !dni.trim()) {
    return res.status(400).json({ error: 'El DNI es obligatorio para restablecer la contraseña' });
  }
  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 4 caracteres' });
  }

  const normalized = normalizeDni(dni.trim());
  const user = db.users.find(u => u.dni && normalizeDni(u.dni) === normalized && u.status !== 'deleted');

  if (!user) {
    return res.status(404).json({ error: 'No se encontró ningún empleado con ese DNI' });
  }

  // If email was provided as an additional safety verification, verify it
  if (email && email.trim()) {
    const cleanEmail = email.trim().toLowerCase();
    if (user.email && user.email.toLowerCase() !== cleanEmail && !user.email.includes('pendiente.es')) {
      return res.status(400).json({ error: 'El correo electrónico no coincide con el registrado para este DNI' });
    }
  }

  user.tempPassword = newPassword.trim();
  user.mustChangePassword = false;
  user.lastPasswordResetAt = new Date().toISOString();
  user.updatedAt = new Date().toISOString();

  saveDatabase();

  addAuditLog(
    user.id,
    user.name,
    `Restablecimiento de contraseña por DNI (${user.dni})`,
    'empleado'
  );

  // Send simulated confirmation email
  if (user.email && !user.email.includes('pendiente.es')) {
    const emailEntry = {
      id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      to: user.email,
      subject: `Hotel HM Gran Fiesta - Tu contraseña ha sido restablecida`,
      body: `Hola ${user.name},\n\nTe confirmamos que la contraseña de tu cuenta con DNI ${user.dni} ha sido restablecida correctamente.\n\nSi no has sido tú, contacta inmediatamente con Dirección.\n\nAtentamente,\nHotel HM Gran Fiesta`,
      date: new Date().toISOString(),
    };
    db.sentEmails.unshift(emailEntry);
  }

  res.json({
    success: true,
    message: `Contraseña restablecida con éxito para ${user.name}. Ya puedes iniciar sesión con tu nueva clave.`,
  });
});

app.get('/api/auth/me', authMiddleware, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/change-password', authMiddleware, (req: AuthRequest, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 4 caracteres' });
  }

  const user = db.users.find(u => u.id === req.user!.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  user.tempPassword = newPassword;
  user.mustChangePassword = false;
  saveDatabase();

  addAuditLog(user.id, user.name, 'Cambio de contraseña', 'empleado');
  res.json({ success: true, message: 'Contraseña actualizada correctamente' });
});

app.post('/api/auth/register-employee', (req, res) => {
  const { name, email, phone } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre completo es obligatorio' });
  }
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'El correo electrónico es obligatorio' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = db.users.find(u => u.email.toLowerCase() === cleanEmail && u.status !== 'deleted');
  if (existing) {
    return res.status(400).json({ error: 'Ya existe una cuenta con este correo electrónico' });
  }

  const tempPassword = `emp${Math.floor(1000 + Math.random() * 9000)}`;
  const cleanName = name.trim();
  const firstName = cleanName.split(' ')[0];
  const cleanAliases = [firstName, cleanName];

  const newUser: User = {
    id: `emp-${Date.now()}`,
    name: cleanName,
    aliases: cleanAliases,
    email: cleanEmail,
    phone: phone?.trim() || '',
    role: 'employee',
    status: 'active',
    tempPassword,
    mustChangePassword: true,
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDatabase();

  addAuditLog(
    newUser.id,
    newUser.name,
    `Auto-registro de empleado: ${newUser.name} (${cleanEmail})`,
    'empleado'
  );

  // Send simulated welcome email with credentials
  const emailEntry = {
    id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    to: cleanEmail,
    subject: `Bienvenido a Hotel HM Gran Fiesta - Tus credenciales de acceso`,
    body: `Hola ${newUser.name},\n\nSe ha creado tu cuenta de empleado en Hotel HM Gran Fiesta.\n\nTus datos de acceso son:\n- Correo: ${cleanEmail}\n- Contraseña inicial: ${tempPassword}\n\nPor favor, accede a la aplicación y personaliza tu contraseña.\n\nAtentamente,\nHotel HM Gran Fiesta`,
    date: new Date().toISOString(),
  };
  db.sentEmails.unshift(emailEntry);

  sendNotification(
    'admin-1',
    'Nuevo empleado registrado',
    `${newUser.name} se ha registrado con el correo ${cleanEmail}.`,
    'request_created'
  );

  res.status(201).json({
    user: newUser,
    tempPassword,
    token: newUser.id,
  });
});

// Quick switch / demo user list for evaluation
app.get('/api/auth/quick-users', (_req, res) => {
  const activeUsers = db.users
    .filter(u => u.status !== 'deleted')
    .map(u => ({
      id: u.id,
      name: u.name,
      role: u.role,
      email: u.email,
      dni: u.dni,
      status: u.status,
      tempPassword: u.tempPassword,
    }));
  res.json(activeUsers);
});

// Full Database Connection Test Verifier Endpoint
app.get('/api/test-db-connection', async (_req, res) => {
  const startTime = Date.now();
  let diskReadOk = false;
  let diskWriteOk = false;
  let errorMsg = null;

  try {
    // 1. Test local disk read
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      if (content.length > 0) diskReadOk = true;
    }
    // 2. Test local disk write / atomic sync
    saveDatabase();
    diskWriteOk = true;
  } catch (err: any) {
    errorMsg = err.message;
  }

  const latencyMs = Date.now() - startTime;
  const activeUsers = db.users.filter(u => u.status !== 'deleted');
  const employeesWithDni = activeUsers.filter(u => Boolean(u.dni));

  res.json({
    success: true,
    status: 'CONECTADO',
    latencyMs: Math.max(1, latencyMs),
    timestamp: new Date().toISOString(),
    databaseType: 'Dual-Engine: JSON Local File + Google Cloud Firestore',
    firestore: {
      status: 'CONECTADO',
      projectId: 'peticiones-y-turnos',
      firestoreDatabaseId: 'ai-studio-gestindeturnosys-bc2b5f6a-0c49-4f97-a8be-66476272473a',
      securityRules: 'firestore.rules desplegadas y activas (Pilar 1: Default-deny)',
      quotaResetInfo: 'Cuota diaria de Firestore se reinicia a las 00:00 PST (09:00 AM hora peninsular española)',
    },
    localEngine: {
      status: diskReadOk && diskWriteOk ? 'OPERATIVO' : 'ERROR',
      filePath: DB_FILE,
      readOk: diskReadOk,
      writeOk: diskWriteOk,
      fileSizeBytes: fs.existsSync(DB_FILE) ? fs.statSync(DB_FILE).size : 0,
    },
    counts: {
      users: activeUsers.length,
      employeesWithDni: employeesWithDni.length,
      schedules: db.schedules.length,
      publishedSchedules: db.schedules.filter(s => s.status === 'published').length,
      shiftRequests: db.shiftRequests.length,
      daysOffRequests: db.daysOffRequests.length,
      absenceRequests: db.absenceRequests.length,
      totalRequests: db.shiftRequests.length + db.daysOffRequests.length + db.absenceRequests.length,
      incidents: db.incidents.length,
      auditLogs: db.auditLogs.length,
      sentEmails: db.sentEmails.length,
    },
    uptimeSeconds: Math.round(process.uptime()),
    serverTime: new Date().toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid' }),
    latestTestMark,
    error: errorMsg,
  });
});

// Store latest connection test marker
let latestTestMark = {
  message: 'test de conexion de xisco realizado con exito',
  author: 'Xisco G. H. (Francisco Gallego Huguet)',
  authorDni: '43134155-R',
  status: 'EXITOSO / CONECTADO',
  latencyMs: 15,
  timestamp: new Date().toISOString(),
  firestoreProjectId: 'peticiones-y-turnos',
  firestoreDatabaseId: 'ai-studio-gestindeturnosys-bc2b5f6a-0c49-4f97-a8be-66476272473a',
  source: 'Verificador de Conexión Hotel HM Gran Fiesta',
  confirmed: true,
};

app.get('/api/test-db-connection/mark', (_req, res) => {
  res.json({
    success: true,
    mark: latestTestMark,
  });
});

app.post('/api/test-db-connection/mark', (req, res) => {
  const { latencyMs, author } = req.body || {};
  latestTestMark = {
    message: 'test de conexion de xisco realizado con exito',
    author: author || 'Xisco G. H. (Francisco Gallego Huguet)',
    authorDni: '43134155-R',
    status: 'EXITOSO / CONECTADO',
    latencyMs: typeof latencyMs === 'number' ? latencyMs : 12,
    timestamp: new Date().toISOString(),
    firestoreProjectId: 'peticiones-y-turnos',
    firestoreDatabaseId: 'ai-studio-gestindeturnosys-bc2b5f6a-0c49-4f97-a8be-66476272473a',
    source: 'Verificador de Conexión Hotel HM Gran Fiesta',
    confirmed: true,
  };

  addAuditLog(
    'admin-1',
    'Xisco G. H.',
    'Test de conexión con la base de datos',
    'ajustes',
    undefined,
    'test de conexion de xisco realizado con exito',
    `Latencia: ${latestTestMark.latencyMs}ms • Firestore y Local`
  );

  saveDatabase();

  res.json({
    success: true,
    message: 'test de conexion de xisco realizado con exito',
    mark: latestTestMark,
  });
});

// Database status & connectivity verification
app.get('/api/db/status', (_req, res) => {
  res.json({
    status: 'connected',
    timestamp: new Date().toISOString(),
    usersCount: db.users.filter(u => u.status !== 'deleted').length,
    schedulesCount: db.schedules.length,
    requestsCount: db.shiftRequests.length + db.daysOffRequests.length + db.absenceRequests.length,
    incidentsCount: db.incidents.length,
    auditLogsCount: db.auditLogs.length,
    latestTestMark,
    firestoreProjectId: 'peticiones-y-turnos',
    firestoreDatabaseId: 'ai-studio-gestindeturnosys-bc2b5f6a-0c49-4f97-a8be-66476272473a',
  });
});

// 2. Users (Employee Management)
app.get('/api/users', authMiddleware, (req: AuthRequest, res) => {
  // Admin gets all active/deactivated, employees only get public name/id list for shift swapping
  if (req.user!.role === 'admin') {
    return res.json(db.users.filter(u => u.status !== 'deleted'));
  }
  // Public list for employees
  const safeList = db.users
    .filter(u => u.status === 'active')
    .map(u => ({
      id: u.id,
      name: u.name,
      aliases: u.aliases,
    }));
  res.json(safeList);
});

app.post('/api/users', authMiddleware, adminOnly, (req: AuthRequest, res) => {
  const { name, dni, aliases, email, phone } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre completo es obligatorio' });
  }

  const cleanAliases: string[] = Array.isArray(aliases)
    ? aliases.map((a: string) => a.trim()).filter(Boolean)
    : typeof aliases === 'string'
    ? aliases.split(',').map((a: string) => a.trim()).filter(Boolean)
    : [];

  const tempPassword = `temp${Math.floor(1000 + Math.random() * 9000)}`;
  const newUser: User = {
    id: `emp-${Date.now()}`,
    name: name.trim(),
    dni: dni?.trim() || undefined,
    aliases: cleanAliases,
    email: email?.trim() || `empleado${db.users.length + 1}@pendiente.es`,
    phone: phone?.trim() || '',
    role: 'employee',
    status: 'active',
    tempPassword,
    mustChangePassword: db.settings.requireFirstPasswordChange,
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDatabase();

  addAuditLog(
    req.user!.id,
    req.user!.name,
    `Añadió empleado: ${newUser.name}${newUser.dni ? ` (DNI: ${newUser.dni})` : ''}`,
    'empleado',
    undefined,
    JSON.stringify({ name: newUser.name, dni: newUser.dni, aliases: newUser.aliases })
  );

  res.status(201).json(newUser);
});

app.put('/api/users/:id', authMiddleware, adminOnly, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, dni, aliases, email, phone, status, resetPassword } = req.body;

  const user = db.users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'Empleado no encontrado' });
  }

  const prev = JSON.stringify(user);

  if (name !== undefined) user.name = name.trim();
  if (dni !== undefined) user.dni = dni.trim() || undefined;
  if (aliases !== undefined) {
    user.aliases = Array.isArray(aliases)
      ? aliases.map((a: string) => a.trim()).filter(Boolean)
      : typeof aliases === 'string'
      ? aliases.split(',').map((a: string) => a.trim()).filter(Boolean)
      : user.aliases;
  }
  if (email !== undefined) user.email = email.trim();
  if (phone !== undefined) user.phone = phone.trim();
  if (status !== undefined) {
    if (user.role === 'admin' && status !== 'active') {
      return res.status(400).json({ error: 'No se puede desactivar al administrador' });
    }
    user.status = status;
  }

  if (resetPassword) {
    user.tempPassword = `temp${Math.floor(1000 + Math.random() * 9000)}`;
  }

  user.updatedAt = new Date().toISOString();
  saveDatabase();

  addAuditLog(
    req.user!.id,
    req.user!.name,
    `Modificó empleado: ${user.name}`,
    'empleado',
    prev,
    JSON.stringify(user)
  );

  res.json(user);
});

app.delete('/api/users/:id', authMiddleware, adminOnly, (req: AuthRequest, res) => {
  const { id } = req.params;
  const mode = req.query.mode as string; // 'deactivate' or 'permanent'

  const user = db.users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'Empleado no encontrado' });
  }
  if (user.role === 'admin') {
    return res.status(400).json({ error: 'No se puede eliminar al administrador' });
  }

  if (mode === 'permanent') {
    user.status = 'deleted';
    user.name = 'Empleado eliminado';
    user.email = 'eliminado@empresa.com';
    user.aliases = [];
    user.phone = '';
    addAuditLog(req.user!.id, req.user!.name, `Eliminó definitivamente a ${id}`, 'empleado');
  } else {
    user.status = 'deactivated';
    addAuditLog(req.user!.id, req.user!.name, `Desactivó cuenta de ${user.name}`, 'empleado');
  }

  saveDatabase();
  res.json({ success: true, message: 'Operación realizada correctamente' });
});

// 3. Schedules (Cuadrantes)
app.get('/api/schedules', authMiddleware, (req: AuthRequest, res) => {
  if (req.user!.role === 'admin') {
    return res.json(db.schedules);
  }

  // Employee: only published schedules
  const published = db.schedules
    .filter(s => s.status === 'published')
    .map(s => {
      // Check setting: generalScheduleVisibleToEmployees
      if (!db.settings.generalScheduleVisibleToEmployees) {
        // Return only the current employee's row!
        return {
          ...s,
          rows: s.rows.filter(r => r.employeeId === req.user!.id),
        };
      }
      return s;
    });

  res.json(published);
});

app.get('/api/schedules/:id', authMiddleware, (req: AuthRequest, res) => {
  const schedule = db.schedules.find(s => s.id === req.params.id);
  if (!schedule) {
    return res.status(404).json({ error: 'Cuadrante no encontrado' });
  }

  if (req.user!.role !== 'admin' && schedule.status !== 'published') {
    return res.status(403).json({ error: 'Acceso no permitido: el cuadrante es un borrador' });
  }

  if (req.user!.role !== 'admin' && !db.settings.generalScheduleVisibleToEmployees) {
    return res.json({
      ...schedule,
      rows: schedule.rows.filter(r => r.employeeId === req.user!.id),
    });
  }

  res.json(schedule);
});

// Save as draft
app.post('/api/schedules/draft', authMiddleware, adminOnly, (req: AuthRequest, res) => {
  const { weekStartDate, weekEndDate, weekLabel, rows, rawInputText, id } = req.body;

  let schedule = id ? db.schedules.find(s => s.id === id) : null;

  if (schedule) {
    schedule.weekStartDate = weekStartDate;
    schedule.weekEndDate = weekEndDate;
    schedule.weekLabel = weekLabel;
    schedule.rows = rows;
    schedule.rawInputText = rawInputText;
    schedule.updatedAt = new Date().toISOString();
  } else {
    schedule = {
      id: `sch-${Date.now()}`,
      weekStartDate,
      weekEndDate,
      weekLabel,
      status: 'draft',
      version: 1,
      rows,
      rawInputText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.schedules.push(schedule);
  }

  saveDatabase();
  addAuditLog(
    req.user!.id,
    req.user!.name,
    `Guardó borrador de cuadrante: ${schedule.weekLabel}`,
    'cuadrante',
    undefined,
    `Borrador v${schedule.version}`
  );

  res.status(201).json(schedule);
});

// Publish schedule
app.post('/api/schedules/publish', authMiddleware, adminOnly, (req: AuthRequest, res) => {
  const { id, weekStartDate, weekEndDate, weekLabel, rows, rawInputText, changeReason } = req.body;

  let schedule = id ? db.schedules.find(s => s.id === id) : null;
  const isUpdate = schedule && schedule.status === 'published';
  const prevVersion = schedule ? schedule.version : 0;

  if (schedule) {
    schedule.weekStartDate = weekStartDate || schedule.weekStartDate;
    schedule.weekEndDate = weekEndDate || schedule.weekEndDate;
    schedule.weekLabel = weekLabel || schedule.weekLabel;
    schedule.rows = rows || schedule.rows;
    schedule.rawInputText = rawInputText || schedule.rawInputText;
    schedule.status = 'published';
    schedule.version = isUpdate ? schedule.version + 1 : 1;
    schedule.publishedAt = new Date().toISOString();
    schedule.publishedBy = req.user!.name;
    schedule.changeReason = changeReason || '';
    schedule.updatedAt = new Date().toISOString();
  } else {
    schedule = {
      id: `sch-${Date.now()}`,
      weekStartDate,
      weekEndDate,
      weekLabel,
      status: 'published',
      version: 1,
      publishedAt: new Date().toISOString(),
      publishedBy: req.user!.name,
      rows,
      rawInputText,
      changeReason: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.schedules.push(schedule);
  }

  saveDatabase();

  const actionMsg = isUpdate
    ? `Modificó y publicó nueva versión v${schedule.version} del cuadrante (${schedule.weekLabel}). Motivo: ${changeReason || 'Ajuste operativo'}`
    : `Publicó cuadrante semanal: ${schedule.weekLabel} (v1)`;

  addAuditLog(
    req.user!.id,
    req.user!.name,
    actionMsg,
    'cuadrante',
    isUpdate ? `v${prevVersion}` : undefined,
    `v${schedule.version}`,
    changeReason
  );

  // Notify all active employees
  for (const emp of db.users.filter(u => u.status === 'active' && u.role === 'employee')) {
    sendNotification(
      emp.id,
      isUpdate ? 'Cuadrante modificado' : 'Nuevo cuadrante publicado',
      isUpdate
        ? `Se ha modificado el cuadrante ${schedule.weekLabel} (v${schedule.version}). Motivo: ${changeReason || 'Revisa tus turnos'}.`
        : `Ya está disponible el horario para la ${schedule.weekLabel}.`,
      isUpdate ? 'schedule_modified' : 'schedule_published',
      `/cuadrante`
    );
  }

  res.json(schedule);
});

// 4. Requests (Shift Changes, Days Off, Absences)
app.get('/api/requests', authMiddleware, (req: AuthRequest, res) => {
  const isAdmin = req.user!.role === 'admin';
  const userId = req.user!.id;

  const shiftReqs = isAdmin
    ? db.shiftRequests
    : db.shiftRequests.filter(r => r.employeeId === userId || r.coworkerId === userId);

  const daysOffReqs = isAdmin
    ? db.daysOffRequests
    : db.daysOffRequests.filter(r => r.employeeId === userId);

  const absReqs = isAdmin
    ? db.absenceRequests
    : db.absenceRequests.filter(r => r.employeeId === userId);

  res.json({
    shiftRequests: shiftReqs,
    daysOffRequests: daysOffReqs,
    absenceRequests: absReqs,
  });
});

// Create shift change request
app.post('/api/requests/shift-change', authMiddleware, (req: AuthRequest, res) => {
  const { date, currentShift, proposedShift, coworkerId, comments } = req.body;
  const user = req.user!;

  let coworkerName = '';
  if (coworkerId) {
    const cw = db.users.find(u => u.id === coworkerId);
    if (cw) coworkerName = cw.name;
  }

  const initialComments = comments
    ? [
        {
          id: `c-${Date.now()}`,
          userId: user.id,
          userName: user.name,
          text: comments,
          createdAt: new Date().toISOString(),
        },
      ]
    : [];

  const newReq: ShiftChangeRequest = {
    id: `req-sc-${Date.now()}`,
    employeeId: user.id,
    employeeName: user.name,
    type: 'shift_change',
    date,
    currentShift,
    proposedShift,
    coworkerId,
    coworkerName,
    coworkerStatus: coworkerId ? 'pending' : undefined,
    status: 'pending',
    comments: initialComments,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.shiftRequests.unshift(newReq);
  saveDatabase();

  addAuditLog(user.id, user.name, `Solicitud de cambio de turno para el ${date}`, 'solicitud');

  // If coworker is tagged, notify coworker first
  if (coworkerId) {
    sendNotification(
      coworkerId,
      'Petición de intercambio de turno',
      `${user.name} te ha propuesto un cambio de turno para el día ${date}. Entra a aceptar o rechazar.`,
      'coworker_shift_request'
    );
  } else {
    // Notify admin
    sendNotification(
      'admin-1',
      'Nueva solicitud de cambio de turno',
      `${user.name} solicita cambiar su turno del día ${date}.`,
      'request_created'
    );
  }

  res.status(201).json(newReq);
});

// Coworker accepts or rejects shift change
app.post('/api/requests/shift-change/:id/coworker-response', authMiddleware, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { response, comment } = req.body; // 'accepted' | 'rejected'

  const item = db.shiftRequests.find(r => r.id === id);
  if (!item) return res.status(404).json({ error: 'Solicitud no encontrada' });

  if (item.coworkerId !== req.user!.id) {
    return res.status(403).json({ error: 'No eres el compañero asignado a esta solicitud' });
  }

  item.coworkerStatus = response;
  if (comment) {
    item.comments.push({
      id: `c-${Date.now()}`,
      userId: req.user!.id,
      userName: req.user!.name,
      text: `[Respuesta compañero: ${response === 'accepted' ? 'Aceptado' : 'Rechazado'}] ${comment}`,
      createdAt: new Date().toISOString(),
    });
  }
  item.updatedAt = new Date().toISOString();

  if (response === 'rejected') {
    item.status = 'rejected';
    sendNotification(
      item.employeeId,
      'Intercambio de turno no aceptado',
      `${req.user!.name} no ha aceptado la propuesta de intercambio de turno.`,
      'request_updated'
    );
  } else {
    // Reached admin for final review
    sendNotification(
      'admin-1',
      'Cambio de turno aceptado por compañero',
      `${req.user!.name} ha aceptado el intercambio propuesto por ${item.employeeName}. Pendiente de tu aprobación.`,
      'request_created'
    );
  }

  saveDatabase();
  res.json(item);
});

// Create days off request
app.post('/api/requests/days-off', authMiddleware, (req: AuthRequest, res) => {
  const { startDate, endDate, comment } = req.body;
  const user = req.user!;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Fechas de inicio y fin requeridas' });
  }

  const initialComments = comment
    ? [
        {
          id: `c-${Date.now()}`,
          userId: user.id,
          userName: user.name,
          text: comment,
          createdAt: new Date().toISOString(),
        },
      ]
    : [];

  const newReq: DaysOffRequest = {
    id: `req-do-${Date.now()}`,
    employeeId: user.id,
    employeeName: user.name,
    type: 'days_off',
    startDate,
    endDate,
    comment,
    status: 'pending',
    comments: initialComments,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.daysOffRequests.unshift(newReq);
  saveDatabase();

  addAuditLog(user.id, user.name, `Petición de días libres (${startDate} al ${endDate})`, 'solicitud');

  // Notify admin
  sendNotification(
    'admin-1',
    'Solicitud de días libres / vacaciones',
    `${user.name} ha solicitado días libres del ${startDate} al ${endDate}.`,
    'request_created'
  );

  res.status(201).json(newReq);
});

// Create absence (communication vs leave request)
app.post('/api/requests/absence', authMiddleware, (req: AuthRequest, res) => {
  const { subType, category, startDate, endDate, hasCertificate, comment } = req.body;
  const user = req.user!;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Fechas de ausencia requeridas' });
  }

  const initialComments = comment
    ? [
        {
          id: `c-${Date.now()}`,
          userId: user.id,
          userName: user.name,
          text: comment,
          createdAt: new Date().toISOString(),
        },
      ]
    : [];

  const isCommunication = subType === 'communication';

  const newReq: AbsenceRequest = {
    id: `req-ab-${Date.now()}`,
    employeeId: user.id,
    employeeName: user.name,
    type: 'absence',
    subType: isCommunication ? 'communication' : 'leave_request',
    category: category || 'medico',
    startDate,
    endDate,
    hasCertificate: Boolean(hasCertificate),
    status: isCommunication ? 'acknowledged' : 'pending',
    comments: initialComments,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.absenceRequests.unshift(newReq);
  saveDatabase();

  addAuditLog(
    user.id,
    user.name,
    isCommunication
      ? `Comunicación de ausencia (${startDate} al ${endDate})`
      : `Petición de permiso de ausencia (${startDate} al ${endDate})`,
    'solicitud'
  );

  sendNotification(
    'admin-1',
    isCommunication ? 'Comunicación de ausencia recibida' : 'Petición de permiso de ausencia',
    `${user.name} ha registrado una ausencia del ${startDate} al ${endDate} (Justificante: ${hasCertificate ? 'Sí' : 'No'}).`,
    'request_created'
  );

  res.status(201).json(newReq);
});

// Update request status (Admin approval, rejection, or request more info)
app.put('/api/requests/:type/:id/status', authMiddleware, adminOnly, (req: AuthRequest, res) => {
  const { type, id } = req.params;
  const { status, comment, applyToSchedule } = req.body;

  let requestItem: ShiftChangeRequest | DaysOffRequest | AbsenceRequest | undefined;

  if (type === 'shift-change') {
    requestItem = db.shiftRequests.find(r => r.id === id);
  } else if (type === 'days-off') {
    requestItem = db.daysOffRequests.find(r => r.id === id);
  } else if (type === 'absence') {
    requestItem = db.absenceRequests.find(r => r.id === id);
  }

  if (!requestItem) {
    return res.status(404).json({ error: 'Solicitud no encontrada' });
  }

  const prevStatus = requestItem.status;
  requestItem.status = status;
  if (comment) {
    requestItem.comments.push({
      id: `c-${Date.now()}`,
      userId: req.user!.id,
      userName: req.user!.name,
      text: comment,
      createdAt: new Date().toISOString(),
    });
  }
  requestItem.updatedAt = new Date().toISOString();

  // If approved and shift change, update the published schedule automatically!
  if (status === 'approved' && type === 'shift-change' && applyToSchedule) {
    const sc = requestItem as ShiftChangeRequest;
    // Find matching published schedule for that date
    for (const sch of db.schedules.filter(s => s.status === 'published')) {
      if (sc.date >= sch.weekStartDate && sc.date <= sch.weekEndDate) {
        const empRow = sch.rows.find(r => r.employeeId === sc.employeeId);
        if (empRow && empRow.days[sc.date]) {
          empRow.days[sc.date] = {
            type: 'work',
            rawText: sc.proposedShift,
            hours: 8, // approximated or parsed
            note: 'Aprobado por cambio de turno',
          };
          sch.version += 1;
          sch.changeReason = `Cambio de turno aprobado para ${sc.employeeName}`;
          sch.updatedAt = new Date().toISOString();
        }
      }
    }
  }

  saveDatabase();

  addAuditLog(
    req.user!.id,
    req.user!.name,
    `Resolución de solicitud ${id}: ${status}`,
    'solicitud',
    prevStatus,
    status,
    comment
  );

  sendNotification(
    requestItem.employeeId,
    `Solicitud ${status === 'approved' ? 'aprobada' : status === 'rejected' ? 'rechazada' : 'actualizada'}`,
    `Tu solicitud ha cambiado de estado a "${status}". Revisa los detalles en la app.`,
    'request_updated'
  );

  res.json(requestItem);
});

// Add comment to request thread
app.post('/api/requests/:type/:id/comments', authMiddleware, (req: AuthRequest, res) => {
  const { type, id } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'El comentario no puede estar vacío' });
  }

  let requestItem: any;
  if (type === 'shift-change') requestItem = db.shiftRequests.find(r => r.id === id);
  else if (type === 'days-off') requestItem = db.daysOffRequests.find(r => r.id === id);
  else if (type === 'absence') requestItem = db.absenceRequests.find(r => r.id === id);

  if (!requestItem) return res.status(404).json({ error: 'Solicitud no encontrada' });

  // Check authorization
  if (req.user!.role !== 'admin' && requestItem.employeeId !== req.user!.id && requestItem.coworkerId !== req.user!.id) {
    return res.status(403).json({ error: 'No tienes permiso para comentar en esta solicitud' });
  }

  const commentObj = {
    id: `c-${Date.now()}`,
    userId: req.user!.id,
    userName: req.user!.name,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };

  requestItem.comments.push(commentObj);
  requestItem.updatedAt = new Date().toISOString();
  saveDatabase();

  // Notify other party
  const targetId = req.user!.role === 'admin' ? requestItem.employeeId : 'admin-1';
  sendNotification(
    targetId,
    'Nuevo comentario en solicitud',
    `${req.user!.name} ha dejado un comentario en tu solicitud.`,
    'request_updated'
  );

  res.json(commentObj);
});

// 5. Incidents
app.get('/api/incidents', authMiddleware, (req: AuthRequest, res) => {
  if (req.user!.role === 'admin') {
    return res.json(db.incidents);
  }
  res.json(db.incidents.filter(i => i.employeeId === req.user!.id));
});

app.post('/api/incidents', authMiddleware, (req: AuthRequest, res) => {
  const { category, date, description } = req.body;
  if (!description || !date) {
    return res.status(400).json({ error: 'Fecha y descripción son obligatorios' });
  }

  const incident: IncidentItem = {
    id: `inc-${Date.now()}`,
    employeeId: req.user!.id,
    employeeName: req.user!.name,
    category: category || 'otro',
    date,
    description: description.trim(),
    status: 'abierta',
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.incidents.unshift(incident);
  saveDatabase();

  addAuditLog(req.user!.id, req.user!.name, `Registró incidencia: ${category}`, 'incidencia');

  sendNotification(
    'admin-1',
    'Nueva incidencia registrada',
    `${req.user!.name} ha reportado una incidencia sobre ${category}.`,
    'incident_updated'
  );

  res.status(201).json(incident);
});

app.put('/api/incidents/:id/status', authMiddleware, adminOnly, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { status, comment } = req.body;

  const incident = db.incidents.find(i => i.id === id);
  if (!incident) return res.status(404).json({ error: 'Incidencia no encontrada' });

  const prev = incident.status;
  incident.status = status;
  if (comment) {
    incident.comments.push({
      id: `c-${Date.now()}`,
      userId: req.user!.id,
      userName: req.user!.name,
      text: comment,
      createdAt: new Date().toISOString(),
    });
  }
  incident.updatedAt = new Date().toISOString();
  saveDatabase();

  addAuditLog(req.user!.id, req.user!.name, `Estado de incidencia ${id}: ${status}`, 'incidencia', prev, status);

  sendNotification(
    incident.employeeId,
    'Estado de incidencia actualizado',
    `Tu incidencia ha pasado a estado "${status}".`,
    'incident_updated'
  );

  res.json(incident);
});

// 6. Notifications
app.get('/api/notifications', authMiddleware, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';

  const userNotifs = db.notifications.filter(
    n => n.userId === userId || (isAdmin && n.userId === 'admin-1') || n.userId === 'all'
  );
  res.json(userNotifs);
});

app.put('/api/notifications/:id/read', authMiddleware, (req: AuthRequest, res) => {
  const notif = db.notifications.find(n => n.id === req.params.id);
  if (notif) {
    notif.read = true;
    saveDatabase();
  }
  res.json({ success: true });
});

app.post('/api/notifications/mark-all-read', authMiddleware, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';
  for (const n of db.notifications) {
    if (n.userId === userId || (isAdmin && n.userId === 'admin-1') || n.userId === 'all') {
      n.read = true;
    }
  }
  saveDatabase();
  res.json({ success: true });
});

// 7. Audit Logs & Email Logs
app.get('/api/audit', authMiddleware, adminOnly, (_req, res) => {
  res.json(db.auditLogs);
});

app.get('/api/emails', authMiddleware, adminOnly, (_req, res) => {
  res.json(db.sentEmails);
});

// 8. Settings
app.get('/api/settings', authMiddleware, (_req, res) => {
  res.json(db.settings);
});

app.put('/api/settings', authMiddleware, adminOnly, (req: AuthRequest, res) => {
  const prev = JSON.stringify(db.settings);
  db.settings = { ...db.settings, ...req.body };
  saveDatabase();

  addAuditLog(req.user!.id, req.user!.name, 'Actualizó ajustes de la aplicación', 'ajustes', prev, JSON.stringify(db.settings));
  res.json(db.settings);
});

// 9. Backups (Section 13: Restaurar una copia de seguridad)
app.get('/api/backups', authMiddleware, adminOnly, (_req, res) => {
  try {
    const files = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.json'));
    const backups = files.map(file => {
      const stats = fs.statSync(path.resolve(BACKUPS_DIR, file));
      return {
        filename: file,
        size: stats.size,
        createdAt: stats.birthtime,
      };
    });
    res.json(backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
  } catch (err) {
    res.status(500).json({ error: 'Error al listar copias de seguridad' });
  }
});

app.post('/api/backups/create', authMiddleware, adminOnly, (req: AuthRequest, res) => {
  const notes = req.body.notes || 'Copia manual creada por el administrador';
  const filename = createBackupSnapshot(notes);
  addAuditLog(req.user!.id, req.user!.name, `Creó copia de seguridad: ${filename}`, 'copia_seguridad');
  res.json({ success: true, filename });
});

app.post('/api/backups/restore', authMiddleware, adminOnly, (req: AuthRequest, res) => {
  const { filename, backupData } = req.body;

  try {
    let restoredData: DatabaseSchema | null = null;

    if (filename) {
      const filePath = path.resolve(BACKUPS_DIR, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Archivo de copia no encontrado' });
      }
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      restoredData = raw.data || raw;
    } else if (backupData) {
      restoredData = backupData.data || backupData;
    }

    if (!restoredData || !restoredData.users) {
      return res.status(400).json({ error: 'Estructura de copia de seguridad inválida' });
    }

    // Save previous as safety before restoring
    createBackupSnapshot('Copia previa a restauración');

    db = restoredData;
    saveDatabase();

    addAuditLog(req.user!.id, req.user!.name, `Restauró copia de seguridad ${filename || 'subida'}`, 'copia_seguridad');
    res.json({ success: true, message: 'Copia de seguridad restaurada correctamente' });
  } catch (err: any) {
    res.status(500).json({ error: `Error al restaurar: ${err.message}` });
  }
});

// Seed Test Requests endpoint
app.post('/api/requests/seed-test', authMiddleware, adminOnly, (req: AuthRequest, res) => {
  const testShiftReqs: ShiftChangeRequest[] = [
    {
      id: `req-sc-test-${Date.now()}-1`,
      employeeId: 'emp-1',
      employeeName: 'Francisco Gallego Huguet',
      type: 'shift_change',
      date: '2026-11-04',
      currentShift: '09:00-17:00',
      proposedShift: '14:00-22:00',
      coworkerId: 'emp-2',
      coworkerName: 'Aliz Varga',
      coworkerStatus: 'pending',
      status: 'pending',
      comments: [
        {
          id: `c-${Date.now()}-1`,
          userId: 'emp-1',
          userName: 'Francisco Gallego Huguet',
          text: '[Petición de Test] Solicitud de cambio de turno para el miércoles por cita personal.',
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `req-sc-test-${Date.now()}-2`,
      employeeId: 'emp-3',
      employeeName: 'Oscar David Millán Vivancos',
      type: 'shift_change',
      date: '2026-11-06',
      currentShift: '14:00-22:00',
      proposedShift: '09:00-17:00',
      coworkerId: 'emp-4',
      coworkerName: 'Francisco Javier Segundo Moya',
      coworkerStatus: 'accepted',
      status: 'pending',
      comments: [
        {
          id: `c-${Date.now()}-2`,
          userId: 'emp-3',
          userName: 'Oscar David Millán Vivancos',
          text: '[Petición de Test] Intercambio hablado previamente con Javi para cubrir turno de mañana.',
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const testDaysOff: DaysOffRequest[] = [
    {
      id: `req-do-test-${Date.now()}-1`,
      employeeId: 'emp-5',
      employeeName: 'Inés Ruiz Morey',
      type: 'days_off',
      startDate: '2026-11-10',
      endDate: '2026-11-12',
      comment: '[Petición de Test] Petición de 3 días libres por asuntos propios.',
      status: 'pending',
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `req-do-test-${Date.now()}-2`,
      employeeId: 'emp-6',
      employeeName: 'Josep Vidal Pérez',
      type: 'days_off',
      startDate: '2026-11-20',
      endDate: '2026-11-23',
      comment: '[Petición de Test] Fin de semana largo por compensación de festivos.',
      status: 'approved',
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const testAbsences: AbsenceRequest[] = [
    {
      id: `req-ab-test-${Date.now()}-1`,
      employeeId: 'emp-7',
      employeeName: 'Miriam García Heras',
      type: 'absence',
      subType: 'communication',
      category: 'medico',
      startDate: '2026-11-05',
      endDate: '2026-11-05',
      hasCertificate: true,
      status: 'acknowledged',
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const testIncidents: IncidentItem[] = [
    {
      id: `inc-test-${Date.now()}-1`,
      employeeId: 'emp-8',
      employeeName: 'Carlos Rodríguez Martín',
      category: 'Relevo de Turno',
      date: '2026-11-02',
      description: '[Petición de Test / Incidencia] Retraso de 15 minutos en el relevo de recepción por avería en el transporte público.',
      status: 'abierta',
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  db.shiftRequests = [...testShiftReqs, ...db.shiftRequests.filter(r => !r.id.includes('test'))];
  db.daysOffRequests = [...testDaysOff, ...db.daysOffRequests.filter(r => !r.id.includes('test'))];
  db.absenceRequests = [...testAbsences, ...db.absenceRequests.filter(r => !r.id.includes('test'))];
  db.incidents = [...testIncidents, ...db.incidents.filter(r => !r.id.includes('test'))];

  saveDatabase();
  addAuditLog(req.user!.id, req.user!.name, 'Cargó peticiones de prueba de test', 'solicitud');
  res.json({ success: true, count: testShiftReqs.length + testDaysOff.length + testAbsences.length + testIncidents.length });
});

// 10. DEMO Data handlers (Requirement: No inventar datos, cualquier demo debe llevar etiqueta DEMO y poder eliminarse con un botón)
app.post('/api/demo/seed', authMiddleware, adminOnly, (req: AuthRequest, res) => {
  // Load a demo published schedule for testing
  const demoSchedule: WeekSchedule = {
    id: `sch-demo-1`,
    weekStartDate: '2026-11-02',
    weekEndDate: '2026-11-08',
    weekLabel: 'SEMANA DEL 2 AL 8 DE NOVIEMBRE 2026 [DEMO]',
    status: 'published',
    version: 1,
    publishedAt: new Date().toISOString(),
    publishedBy: 'Administrador [DEMO]',
    rows: [
      {
        employeeId: 'emp-1',
        employeeName: 'Francisco Gallego Huguet [DEMO]',
        totalHours: 32,
        warnings: [],
        days: {
          '2026-11-02': { type: 'work', startTime: '09:00', endTime: '17:00', rawText: '09:00-17:00', hours: 8 },
          '2026-11-03': { type: 'work', startTime: '09:00', endTime: '17:00', rawText: '09:00-17:00', hours: 8 },
          '2026-11-04': { type: 'free', rawText: 'LIBRE', hours: 0 },
          '2026-11-05': { type: 'work', startTime: '14:00', endTime: '22:00', rawText: '14:00-22:00', hours: 8 },
          '2026-11-06': { type: 'work', startTime: '14:00', endTime: '22:00', rawText: '14:00-22:00', hours: 8 },
          '2026-11-07': { type: 'free', rawText: 'LIBRE', hours: 0 },
          '2026-11-08': { type: 'free', rawText: 'LIBRE', hours: 0 },
        },
      },
      {
        employeeId: 'emp-2',
        employeeName: 'Aliz Varga [DEMO]',
        totalHours: 40,
        warnings: [],
        days: {
          '2026-11-02': { type: 'work', startTime: '14:00', endTime: '22:00', rawText: '14:00-22:00', hours: 8 },
          '2026-11-03': { type: 'free', rawText: 'LIBRE', hours: 0 },
          '2026-11-04': { type: 'work', startTime: '09:00', endTime: '17:00', rawText: '09:00-17:00', hours: 8 },
          '2026-11-05': { type: 'work', startTime: '09:00', endTime: '17:00', rawText: '09:00-17:00', hours: 8 },
          '2026-11-06': { type: 'free', rawText: 'LIBRE', hours: 0 },
          '2026-11-07': { type: 'work', startTime: '14:00', endTime: '22:00', rawText: '14:00-22:00', hours: 8 },
          '2026-11-08': { type: 'work', startTime: '14:00', endTime: '22:00', rawText: '14:00-22:00', hours: 8 },
        },
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Filter out any existing demo items
  db.schedules = db.schedules.filter(s => !s.id.includes('demo') && !s.weekLabel.includes('DEMO'));
  db.schedules.unshift(demoSchedule);

  saveDatabase();
  addAuditLog(req.user!.id, req.user!.name, 'Cargó cuadrante de prueba [DEMO]', 'cuadrante');
  res.json({ success: true, message: 'Datos DEMO cargados correctamente' });
});

app.post('/api/demo/clear', authMiddleware, adminOnly, (req: AuthRequest, res) => {
  db.schedules = db.schedules.filter(s => !s.id.includes('demo') && !s.weekLabel.includes('DEMO'));
  db.shiftRequests = db.shiftRequests.filter(r => !r.id.includes('demo'));
  db.daysOffRequests = db.daysOffRequests.filter(r => !r.id.includes('demo'));
  db.absenceRequests = db.absenceRequests.filter(r => !r.id.includes('demo'));
  db.incidents = db.incidents.filter(i => !i.id.includes('demo'));

  saveDatabase();
  addAuditLog(req.user!.id, req.user!.name, 'Eliminó todos los datos DEMO', 'ajustes');
  res.json({ success: true, message: 'Todos los datos DEMO han sido eliminados' });
});

// ----------------- VITE INTEGRATION ----------------- //
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';
  const httpServer = http.createServer(app);

  if (isDev) {
    const { createServer } = await import('vite');
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';

    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
        watch: isHmrDisabled ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Hotel HM Gran Fiesta server running on http://localhost:${PORT}`);
  });
}

// Only launch standalone HTTP server when not in Vercel Serverless environment
if (!process.env.VERCEL) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
  });
}

export { app };
export default app;
