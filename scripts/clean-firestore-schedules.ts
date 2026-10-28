import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

async function cleanFirestoreSchedules() {
  console.log(`Cleaning old/fictional schedules from Firestore database: ${firebaseConfig.firestoreDatabaseId}`);
  const schedColl = collection(db, 'schedules');
  const snap = await getDocs(schedColl);

  console.log(`Found ${snap.size} schedules in Firestore to delete.`);
  for (const d of snap.docs) {
    await deleteDoc(doc(db, 'schedules', d.id));
    console.log(`Deleted schedule [${d.id}] from Firestore.`);
  }

  // Also clean old test requests from requests collection
  const reqColl = collection(db, 'requests');
  const reqSnap = await getDocs(reqColl);
  for (const d of reqSnap.docs) {
    if (d.id.includes('test')) {
      await deleteDoc(doc(db, 'requests', d.id));
      console.log(`Deleted test request [${d.id}] from Firestore.`);
    }
  }

  console.log('Firestore schedules and test data cleaned successfully. Ready for real user schedules!');
}

cleanFirestoreSchedules()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error cleaning Firestore:', err);
    process.exit(1);
  });
