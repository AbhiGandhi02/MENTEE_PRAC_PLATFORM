import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only if API key is available (not during build time)
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

if (typeof window !== 'undefined') {
  // Check if API key is available
  if (!firebaseConfig.apiKey) {
    console.error('Firebase configuration error: NEXT_PUBLIC_FIREBASE_API_KEY is missing');
    console.error('Please check your .env.local file');
  } else {
    try {
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
        console.log('✅ Firebase initialized successfully');
      } else {
        app = getApps()[0];
        console.log('✅ Firebase already initialized');
      }
      auth = getAuth(app);
      db = getFirestore(app);
    } catch (error) {
      console.error('Firebase initialization error:', error);
    }
  }
}

// Export with type assertion for build compatibility
// At runtime, these will be properly initialized in the browser
export { app, auth };
export const dbInstance = db as Firestore;
export { dbInstance as db };
