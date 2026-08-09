import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * Single place where Firebase is configured. Every other module imports `db`
 * or `auth` from here so credentials never get scattered through the app.
 */
function readConfig(): FirebaseOptions {
  const env = import.meta.env;
  const config: FirebaseOptions = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };

  if (!config.apiKey || !config.projectId) {
    throw new Error(
      "Firebase env vars are missing. Copy .env.example to .env.local and fill it in.",
    );
  }
  return config;
}

export const firebaseApp = initializeApp(readConfig());
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);

/** Firestore collection names as they actually exist in this project. */
export const COLLECTIONS = {
  products: "products",
  categories: "categories",
  sellers: "sellers",
  orders: "orders",
  users: "users",
} as const;
