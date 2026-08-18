import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { COLLECTIONS, db } from "../lib/firebase";
import { useAuth } from "../store/AuthProvider";
import type { UserRole } from "../services/users";

export interface AdminState {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: UserRole;
  loading: boolean;
  error: Error | null;
}

export function useAdmin(): AdminState {
  const { user, initialising: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = doc(db, COLLECTIONS.users, user.uid);

    // Optimistically check a one-time fetch first, then subscribe for updates.
    getDoc(ref)
      .then((snap) => {
        setRole((snap.data()?.role as UserRole) ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err : new Error(String(err))))
      .finally(() => setLoading(false));

    const unsub = onSnapshot(
      ref,
      (snap) => setRole((snap.data()?.role as UserRole) ?? null),
      (err) => setError(err),
    );

    return () => unsub();
  }, [user, authLoading]);

  const isAdmin = role === "admin" || role === "super_admin";
  const isSuperAdmin = role === "super_admin";

  return { isAdmin, isSuperAdmin, role, loading: authLoading || loading, error };
}
