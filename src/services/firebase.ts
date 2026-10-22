import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// CRITICAL: Must use firestoreDatabaseId from firebase-applet-config.json
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Auth instance
export const auth = getAuth(app);

// Error Handling conforming to FirestoreErrorInfo
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test as required by skill
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase Firestore connection verified.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection: client appears offline or configuring.');
    }
    return false;
  }
}

// Initial test run
testConnection();

export { firebaseConfig };

export async function syncDatabaseToFirestore(data: {
  users?: any[];
  schedules?: any[];
  requests?: any[];
  incidents?: any[];
  auditLogs?: any[];
  settings?: any;
}): Promise<{ syncedCount: number; errors: string[] }> {
  let syncedCount = 0;
  const errors: string[] = [];

  if (data.users) {
    for (const u of data.users) {
      try {
        await setDoc(doc(db, 'users', u.id), u);
        syncedCount++;
      } catch (e: any) {
        errors.push(`Usuario ${u.name || u.id}: ${e.message}`);
      }
    }
  }

  if (data.schedules) {
    for (const s of data.schedules) {
      try {
        await setDoc(doc(db, 'schedules', s.id), s);
        syncedCount++;
      } catch (e: any) {
        errors.push(`Cuadrante ${s.weekLabel || s.id}: ${e.message}`);
      }
    }
  }

  if (data.settings) {
    try {
      await setDoc(doc(db, 'settings', 'global'), data.settings);
      syncedCount++;
    } catch (e: any) {
      errors.push(`Ajustes globales: ${e.message}`);
    }
  }

  return { syncedCount, errors };
}

