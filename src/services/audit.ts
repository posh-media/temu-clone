import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { COLLECTIONS, db } from "../lib/firebase";

export type AuditAction =
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "PRODUCT_DELETED"
  | "PRODUCT_VISIBILITY_CHANGED"
  | "ORDER_UPDATED"
  | "ORDER_DELETED"
  | "ADMIN_ROLE_CHANGED";

export interface AuditLogEntry {
  adminUid: string;
  adminEmail?: string | null;
  action: AuditAction;
  targetType: "product" | "order" | "user";
  targetId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  timestamp?: ReturnType<typeof serverTimestamp>;
}

/** Writes an audit log entry. Ignores failures so the admin action itself never stalls. */
export async function logAdminAction(entry: Omit<AuditLogEntry, "timestamp">): Promise<void> {
  try {
    await addDoc(collection(db, COLLECTIONS.auditLogs), {
      ...entry,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[audit] failed to write log:", err);
  }
}
