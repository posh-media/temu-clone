import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { auth } from "../lib/firebase";
import { migrateGuestAddresses } from "../services/addresses";
import { ensureUserProfile } from "../services/users";

interface AuthApi {
  user: User | null;
  /** True until Firebase has restored the persisted session. */
  initialising: boolean;
  displayName: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthApi | null>(null);

/** Wraps Firebase Auth so components never import the SDK directly. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initialising, setInitialising] = useState(true);

  useEffect(() => {
    // Explicit local persistence so the session survives refresh.
    setPersistence(auth, browserLocalPersistence).catch(() => undefined);

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setInitialising(false);
      if (nextUser) {
        void ensureUserProfile({
          uid: nextUser.uid,
          email: nextUser.email,
          displayName: nextUser.displayName,
          photoURL: nextUser.photoURL,
        }).catch(() => undefined);
        void migrateGuestAddresses(nextUser.uid).catch(() => undefined);
      }
    });
  }, []);

  const api = useMemo<AuthApi>(
    () => ({
      user,
      initialising,
      displayName: user?.displayName || user?.email?.split("@")[0] || "",
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      signUp: async (name, email, password) => {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) await updateProfile(credential.user, { displayName: name.trim() });
        setUser({ ...credential.user, displayName: name.trim() } as User);
      },
      signInWithGoogle: async () => {
        const provider = new GoogleAuthProvider();
        provider.addScope("email");
        provider.addScope("profile");
        await signInWithPopup(auth, provider);
      },
      logOut: () => signOut(auth),
    }),
    [user, initialising],
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Human readable messages for the Firebase auth error codes we surface. */
export function authErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Something went wrong. Please try again.";

  const code = (error as { code?: string }).code ?? "";
  const message = error.message;

  // Log the code and message in all builds for debugging; the full error is
  // only logged in development to avoid leaking extra detail in production.
  // eslint-disable-next-line no-console
  console.error("[auth] error:", { code, message });
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error("[auth] raw error:", error);
  }

  switch (code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/missing-email":
      return "Please enter your email address.";
    case "auth/missing-password":
    case "auth/invalid-password":
      return "Please enter a valid password.";
    case "auth/weak-password":
      return "Your password is too weak. Use at least 6 characters.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Please check your internet connection and try again.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled for this Firebase project yet.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Google sign-in was cancelled.";
    case "auth/popup-blocked":
      return "The popup was blocked. Please allow popups for this site or use email.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email. Sign in with the same method you used before.";
    case "auth/unauthorized-domain":
      return "This domain is not authorised for Firebase sign-in.";
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid":
      return "Firebase configuration is invalid. Please contact support.";
    case "auth/web-storage-unsupported":
      return "Your browser does not support the storage needed to stay signed in.";
    case "auth/internal-error":
      return "Authentication service error. Please try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}
