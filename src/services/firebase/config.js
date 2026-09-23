// Firebase client configuration is public by design, but production builds must
// receive the correct project values from environment variables. Do not ship a
// test Firebase project as a production fallback.
const env = import.meta.env ?? {};

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || '',
};

export const firebaseEnabled = env.VITE_FIREBASE_ENABLED !== 'false' &&
  Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);

export default firebaseConfig;
