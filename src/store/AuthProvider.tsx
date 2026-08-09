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

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error("[auth] raw error:", error);
  }

  const code = (error as { code?: string }).code ?? "";
  switch (code) {
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/missing-email":
      return "Please enter your email address.";
    case "auth/missing-password":
      return "Please enter your password.";
    case "auth/weak-password":
      return "Passwords need to be at least 6 characters.";
    case "auth/email-already-in-use":
      return "An account already exists for this email. Try signing in.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network problem. Check your connection and retry.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled for this Firebase project yet.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/popup-closed-by-user":
      return "The sign-in popup was closed before finishing.";
    case "auth/popup-blocked":
      return "The popup was blocked. Please allow popups for this site or use email.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email. Sign in with the same method you used before.";
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled.";
    case "auth/unauthorized-domain":
      return "This domain is not authorised for Firebase sign-in.";
    default:
      return "Something went wrong. Please try again.";
  }
}
