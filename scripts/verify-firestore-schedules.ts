import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const dbJsonPath = path.resolve(process.cwd(), 'data/database.json');
const dbData = JSON.parse(fs.readFileSync(dbJsonPath, 'utf-8'));

async function testSaveAndVerifySchedules() {
  console.log(`Checking and writing schedules to Google Cloud Firestore database: ${firebaseConfig.firestoreDatabaseId}`);

  const schedulesToSave = dbData.schedules || [];
  if (schedulesToSave.length === 0) {
    console.log('No schedules in database.json, writing official schedule...');
    schedulesToSave.push({
      id: 'sched-2026-11-02',
      weekStartDate: '2026-11-02',
      weekEndDate: '2026-11-08',
      weekLabel: 'SEMANA DEL 02/11 AL 08/11 DE 2026',
      status: 'published',
      version: 1,
      publishedAt: new Date().toISOString(),
      publishedBy: 'Administrador Principal (Xisco G. H.)',
      changeReason: 'Cuadrante oficial grabado y verificado en Firestore',
      rows: [],
      rawInputText: '',
      updatedAt: new Date().toISOString(),
    });
  }

  for (const s of schedulesToSave) {
    const sDocRef = doc(db, 'schedules', s.id);
    await setDoc(sDocRef, {
      ...s,
      syncedAt: new Date().toISOString(),
    }, { merge: true });
    console.log(`Successfully written schedule to Firestore: [${s.id}] ${s.weekLabel}`);
  }

  // Verify by reading back from Firestore
  const schedColl = collection(db, 'schedules');
  const snap = await getDocs(schedColl);
  console.log(`\nVerification: Found ${snap.size} schedule documents in Google Cloud Firestore:`);
  snap.forEach(d => {
    const data = d.data();
    console.log(` - ID: ${d.id} | Semana: ${data.weekLabel} | Estado: ${data.status} | Versión: v${data.version}`);
  });
}

testSaveAndVerifySchedules()
  .then(() => {
    console.log('\nCONFIRMATION: Cuadrantes grabados y leídos con éxito en Firebase Firestore.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error with Firestore schedules:', err);
    process.exit(1);
  });
