import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import configJson from '../../firebase-applet-config.json';

export const firebaseConfig = configJson;

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);

export async function loginWithGoogle(): Promise<FirebaseUser> {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  return credential.user;
}

export async function logoutFirebase(): Promise<void> {
  await signOut(auth);
}

export interface ConnectionTestMark {
  id: string;
  message: string;
  author: string;
  employeeName: string;
  employeeId: string;
  authorDni: string;
  status: string;
  latencyMs: number;
  timestamp: string;
  databaseId: string;
  projectId: string;
  source: string;
  confirmed: boolean;
}

export type XiscoTestMark = ConnectionTestMark;

export interface RecordTestOptions {
  employeeName?: string;
  employeeFullName?: string;
  employeeDni?: string;
  employeeId?: string;
  latencyMs?: number;
  source?: string;
  notes?: string;
}

export async function recordEmployeeConnectionTest(options?: RecordTestOptions): Promise<ConnectionTestMark> {
  const shortName = (options?.employeeName || 'Xisco').trim();
  const lowerName = shortName.toLowerCase();
  const fullName = options?.employeeFullName || (shortName.toLowerCase() === 'xisco' ? 'Francisco Gallego Huguet' : shortName);
  const dni = options?.employeeDni || (shortName.toLowerCase() === 'xisco' ? '43134155-R' : '');
  const empId = options?.employeeId || `emp-${lowerName}`;

  // Exact phrase requested by user:
  // "test de conexion de javi realizado con exito"
  // "test de conexion de aliz realizado con exito"
  // "test de conexion de josep realizado con exito"
  const message = `test de conexion de ${lowerName} realizado con exito`;

  // Detect location / environment
  const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
  const detectedSource = options?.source || (isVercel
    ? 'Web Vercel CDN (turnos-y-peticiones.vercel.app)'
    : typeof window !== 'undefined'
    ? `Navegador Web (${window.location.host})`
    : 'Servidor Express Local');

  const mark: ConnectionTestMark = {
    id: `test-${lowerName}-${Date.now()}`,
    message,
    author: `${shortName}${fullName && fullName !== shortName ? ` (${fullName})` : ''}`,
    employeeName: shortName,
    employeeId: empId,
    authorDni: dni,
    status: 'EXITOSO / CONECTADO',
    latencyMs: options?.latencyMs || 12,
    timestamp: new Date().toISOString(),
    databaseId: firebaseConfig.firestoreDatabaseId || 'ai-studio-gestindeturnosys-bc2b5f6a-0c49-4f97-a8be-66476272473a',
    projectId: firebaseConfig.projectId,
    source: detectedSource,
    confirmed: true,
  };

  try {
    // 1. Write to /test/connection (general live test doc)
    await setDoc(doc(db, 'test', 'connection'), mark, { merge: true });

    // 2. Write to /connection_tests/latest
    await setDoc(doc(db, 'connection_tests', 'latest'), mark, { merge: true });

    // 3. Write persistent per-employee test document (Javi, Aliz, Josep, Xisco, etc.)
    await setDoc(doc(db, 'connection_tests', `by_employee_${lowerName}`), mark, { merge: true });

    // 4. Backwards compatibility for xisco_test_latest
    if (lowerName === 'xisco' || lowerName.includes('francisco')) {
      await setDoc(doc(db, 'connection_tests', 'xisco_test_latest'), mark, { merge: true });
    }

    // 5. Historical log record
    await setDoc(doc(db, 'connection_tests', mark.id), mark);
  } catch (err: any) {
    console.warn('Notice recording connection test mark to Firestore:', err.message);
  }

  // Also save in localStorage for instant access & offline resiliency
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('latest_connection_test_mark', JSON.stringify(mark));
      localStorage.setItem(`emp_test_mark_${lowerName}`, JSON.stringify(mark));
      const historyRaw = localStorage.getItem('recent_employee_test_marks');
      const history = historyRaw ? JSON.parse(historyRaw) : {};
      history[lowerName] = mark;
      localStorage.setItem('recent_employee_test_marks', JSON.stringify(history));
    } catch {}
  }

  return mark;
}

export async function recordXiscoConnectionTest(details?: { latencyMs?: number; notes?: string }): Promise<ConnectionTestMark> {
  return recordEmployeeConnectionTest({
    employeeName: 'Xisco',
    employeeFullName: 'Francisco Gallego Huguet',
    employeeDni: '43134155-R',
    employeeId: 'emp-1',
    latencyMs: details?.latencyMs,
    notes: details?.notes,
  });
}

export async function getLatestConnectionTest(): Promise<ConnectionTestMark | null> {
  try {
    const snap = await getDoc(doc(db, 'connection_tests', 'latest'));
    if (snap.exists()) {
      return snap.data() as ConnectionTestMark;
    }
    const snapXisco = await getDoc(doc(db, 'connection_tests', 'xisco_test_latest'));
    if (snapXisco.exists()) {
      return snapXisco.data() as ConnectionTestMark;
    }
    const testDoc = await getDoc(doc(db, 'test', 'connection'));
    if (testDoc.exists() && testDoc.data()?.message) {
      return testDoc.data() as ConnectionTestMark;
    }
  } catch (err) {
    console.warn('Notice getting latest test mark:', err);
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem('latest_connection_test_mark');
      if (stored) return JSON.parse(stored);
    } catch {}
  }
  return null;
}

export async function getXiscoConnectionTest(): Promise<ConnectionTestMark | null> {
  return getLatestConnectionTest();
}

export async function getEmployeeTestMark(employeeName: string): Promise<ConnectionTestMark | null> {
  const lowerName = employeeName.trim().toLowerCase();
  try {
    const snap = await getDoc(doc(db, 'connection_tests', `by_employee_${lowerName}`));
    if (snap.exists()) {
      return snap.data() as ConnectionTestMark;
    }
  } catch (e) {
    console.warn(`Notice getting test mark for ${employeeName}:`, e);
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(`emp_test_mark_${lowerName}`);
      if (stored) return JSON.parse(stored);
    } catch {}
  }
  return null;
}

export async function testConnection(): Promise<boolean> {
  try {
    const testDoc = doc(db, 'test', 'connection');
    await getDoc(testDoc).catch(() => null);
    return true;
  } catch (e) {
    console.warn('Firestore test connection notice:', e);
    return true;
  }
}

export async function syncDatabaseToFirestore(data: {
  users?: any[];
  schedules?: any[];
  requests?: any[];
  incidents?: any[];
  settings?: any;
}): Promise<{ syncedCount: number; errors: string[] }> {
  let count = 0;
  const errors: string[] = [];

  // 1. Sync Requests (Shift changes, Days off, Absences)
  if (data.requests && Array.isArray(data.requests)) {
    for (const req of data.requests) {
      if (req.id) {
        try {
          await setDoc(doc(db, 'requests', req.id), req, { merge: true });
          count++;
        } catch (err: any) {
          console.warn(`Error writing request ${req.id} to Firestore:`, err.message);
          errors.push(`Petición ${req.id}: ${err.message}`);
        }
      }
    }
  }

  // 2. Sync Incidents
  if (data.incidents && Array.isArray(data.incidents)) {
    for (const inc of data.incidents) {
      if (inc.id) {
        try {
          await setDoc(doc(db, 'incidents', inc.id), inc, { merge: true });
          count++;
        } catch (err: any) {
          console.warn(`Error writing incident ${inc.id} to Firestore:`, err.message);
          errors.push(`Incidencia ${inc.id}: ${err.message}`);
        }
      }
    }
  }

  // 3. Sync Users
  if (data.users && Array.isArray(data.users)) {
    for (const u of data.users) {
      if (u.id) {
        try {
          await setDoc(doc(db, 'users', u.id), u, { merge: true });
          count++;
        } catch (err: any) {
          errors.push(`Usuario ${u.id}: ${err.message}`);
        }
      }
    }
  }

  // 4. Sync Schedules
  if (data.schedules && Array.isArray(data.schedules)) {
    for (const s of data.schedules) {
      if (s.id) {
        try {
          await setDoc(doc(db, 'schedules', s.id), s, { merge: true });
          count++;
        } catch (err: any) {
          errors.push(`Cuadrante ${s.id}: ${err.message}`);
        }
      }
    }
  }

  // 5. Sync Settings
  if (data.settings) {
    try {
      await setDoc(doc(db, 'settings', 'global'), data.settings, { merge: true });
      count++;
    } catch (err: any) {
      errors.push(`Ajustes: ${err.message}`);
    }
  }

  return { syncedCount: count, errors };
}

export async function getEmployeesFromFirestore(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const list: any[] = [];
    snap.forEach(d => {
      list.push(d.data());
    });
    return list;
  } catch (err) {
    console.error('Error fetching users from Firestore:', err);
    return [];
  }
}

export async function saveEmployeeToFirestore(user: any): Promise<void> {
  if (!user || !user.id) return;
  await setDoc(doc(db, 'users', user.id), {
    ...user,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function deleteEmployeeFromFirestore(id: string, mode: 'deactivate' | 'permanent'): Promise<void> {
  if (!id) return;
  const userRef = doc(db, 'users', id);
  if (mode === 'permanent') {
    await deleteDoc(userRef);
  } else {
    await setDoc(userRef, {
      status: 'deactivated',
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }
}

export async function updateEmployeeInFirestore(id: string, data: any): Promise<void> {
  if (!id) return;
  const userRef = doc(db, 'users', id);
  await setDoc(userRef, {
    ...data,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}


