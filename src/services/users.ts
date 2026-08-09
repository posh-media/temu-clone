import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { COLLECTIONS, db } from "../lib/firebase";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Ensures a single `users/{uid}` profile document exists.
 * Safe to call on every auth state change — it merges and never overwrites
 * an existing profile's metadata with a `null` value.
 */
export async function ensureUserProfile(profile: UserProfile): Promise<void> {
  const ref = doc(db, COLLECTIONS.users, profile.uid);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? (snap.data() as Partial<UserProfile>) : {};

  await setDoc(
    ref,
    {
      uid: profile.uid,
      email: profile.email ?? existing.email ?? null,
      displayName: profile.displayName ?? existing.displayName ?? null,
      photoURL: profile.photoURL ?? existing.photoURL ?? null,
      createdAt: existing.createdAt ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
