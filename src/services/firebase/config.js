// Firebase client configuration is intentionally non-secret. Security is enforced
// by Firebase Auth claims, Firestore/Storage rules and trusted server functions.

const fallbackConfig = {
  apiKey: 'AIzaSyBpoDnbWKvWQdvcZnhUZwFr24iox2fWJto',
  authDomain: 'test-bot-49f99.firebaseapp.com',
  projectId: 'test-bot-49f99',
  storageBucket: 'test-bot-49f99.firebasestorage.app',
  messagingSenderId: '522231357803',
  appId: '1:522231357803:web:bf65a73d1df7269615ac2e',
  databaseURL: 'https://test-bot-49f99-default-rtdb.firebaseio.com'
};

const env = import.meta.env ?? {};

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || fallbackConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || fallbackConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || fallbackConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || fallbackConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || fallbackConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || fallbackConfig.appId,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || fallbackConfig.databaseURL
};

export const firebaseEnabled = env.VITE_FIREBASE_ENABLED !== 'false';

export default firebaseConfig;
