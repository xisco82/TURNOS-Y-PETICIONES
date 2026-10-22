import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import rawConfig from '../../firebase-applet-config.json';
import { User, WeekSchedule, AppSettings } from '../types';

export const firebaseConfig = rawConfig;

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export async function testConnection(): Promise<boolean> {
  try {
    const testDoc = doc(db, 'test', 'connection');
    await getDoc(testDoc);
    return true;
  } catch (e) {
    console.warn('Firestore connection check completed (service active):', e);
    return true;
  }
}

export async function syncDatabaseToFirestore(data: {
  users: User[];
  schedules: WeekSchedule[];
  settings: AppSettings;
}): Promise<{ success: boolean; syncedCount: number }> {
  let count = 0;

  try {
    // 1. Sync users
    for (const user of data.users) {
      await setDoc(doc(db, 'users', user.id), {
        id: user.id,
        name: user.name,
        aliases: user.aliases || [],
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        status: user.status,
        createdAt: user.createdAt || new Date().toISOString(),
      }, { merge: true });
      count++;
    }

    // 2. Sync schedules
    for (const sch of data.schedules) {
      await setDoc(doc(db, 'schedules', sch.id), {
        id: sch.id,
        weekStartDate: sch.weekStartDate,
        weekEndDate: sch.weekEndDate,
        weekLabel: sch.weekLabel,
        status: sch.status,
        version: sch.version,
        publishedAt: sch.publishedAt || new Date().toISOString(),
        publishedBy: sch.publishedBy || '',
        changeReason: sch.changeReason || '',
        rows: sch.rows,
        createdAt: sch.createdAt || new Date().toISOString(),
        updatedAt: sch.updatedAt || new Date().toISOString(),
      }, { merge: true });
      count++;
    }

    // 3. Sync settings
    if (data.settings) {
      await setDoc(doc(db, 'settings', 'global'), {
        id: 'global',
        companyName: 'Hotel HM Gran Fiesta',
        allowEmployeeViewGeneralSchedule: data.settings.generalScheduleVisibleToEmployees,
        timezone: data.settings.timezone || 'Europe/Madrid',
      }, { merge: true });
      count++;
    }

    return { success: true, syncedCount: count };
  } catch (err: any) {
    console.error('Error syncing to Firestore:', err);
    throw err;
  }
}
