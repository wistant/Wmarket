import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import dotenv from "dotenv";

dotenv.config();

/** Firebase Admin Auth, or null when the service account isn't configured. */
let firebaseAuth: Auth | null = null;

try {
  // Reuse the existing app on hot reload instead of initialising twice
  const app: App =
    getApps()[0] ??
    (process.env.FIREBASE_SERVICE_ACCOUNT
      ? initializeApp({
          credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
        })
      : initializeApp());
  firebaseAuth = getAuth(app);
} catch (error: unknown) {
  console.error("Firebase Admin initialization error:", error);
  firebaseAuth = null;
}

export { firebaseAuth };
