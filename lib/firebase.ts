import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Suppress non-fatal Firestore network transition info/warnings (e.g. 10s offline mode transition)
try {
  setLogLevel('error');
} catch {}

const isNewApp = !getApps().length;
const app = isNewApp ? initializeApp(firebaseConfig) : getApp();

/* CRITICAL: Must pass firebaseConfig.firestoreDatabaseId */
export const db = isNewApp
  ? initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
      },
      firebaseConfig.firestoreDatabaseId
    )
  : getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);

