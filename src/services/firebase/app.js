import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

import { firebaseConfig, firebaseEnabled } from './config';

export const firebaseApp = firebaseEnabled
  ? (getApps()[0] ?? initializeApp(firebaseConfig))
  : null;

export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const db = firebaseApp ? getFirestore(firebaseApp) : null;
export const storage = firebaseApp ? getStorage(firebaseApp) : null;

export function assertFirebase() {
  if (!firebaseApp || !auth || !db) {
    throw new Error('Firebase is not configured for this environment.');
  }
}
