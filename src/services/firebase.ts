import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
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
