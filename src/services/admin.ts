import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { COLLECTIONS, db } from "../lib/firebase";
import type { UserProfile, UserRole } from "./users";

/** Reads the role field from a user's profile document. */
export async function fetchUserRole(uid: string): Promise<UserRole> {
  const snap = await getDoc(doc(db, COLLECTIONS.users, uid));
  return (snap.data()?.role as UserRole) ?? null;
}

export interface AdminUser extends UserProfile {
  id: string;
  orderCount?: number;
  lastActivity?: Date;
}

/** Lists non-admin users ordered by creation date. */
export async function fetchCustomers(count = 100): Promise<AdminUser[]> {
  const snap = await getDocs(query(collection(db, COLLECTIONS.users), orderBy("createdAt", "desc"), limit(count)));
  return snap.docs
    .map((d) => mapUser(d.id, d.data()))
    .filter((u) => u.role !== "admin" && u.role !== "super_admin");
}

/** Lists users with an admin role. */
export async function fetchAdmins(count = 100): Promise<AdminUser[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.users),
      where("role", "in", ["admin", "super_admin"]),
      limit(count),
    ),
  );
  return snap.docs
    .map((d) => mapUser(d.id, d.data()))
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

function mapUser(id: string, data: Record<string, unknown>): AdminUser {
  return {
    id,
    uid: (data.uid as string) ?? id,
    email: (data.email as string) ?? null,
    displayName: (data.displayName as string) ?? null,
    photoURL: (data.photoURL as string) ?? null,
    role: (data.role as UserRole) ?? null,
    orderCount: typeof data.orderCount === "number" ? data.orderCount : undefined,
    lastActivity: data.lastActivity ? new Date(data.lastActivity as string) : undefined,
  };
}

/** Promotes or demotes a user. Only super-admins can set the super_admin role. */
export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.users, uid), {
    role,
    updatedAt: serverTimestamp(),
  });
}
