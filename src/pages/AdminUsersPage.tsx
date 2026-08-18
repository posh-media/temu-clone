import { Loader2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchCustomers, type AdminUser } from "../services/admin";
import { formatDate } from "../lib/format";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers(200)
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Customers</h1>
        <p className="text-sm text-ink-3">{users.length} customer{users.length !== 1 ? "s" : ""}</p>
      </div>

      {loading ? (
        <div className="grid min-h-[200px] place-items-center rounded-card bg-white">
          <Loader2 className="h-7 w-7 animate-spin text-brand" />
        </div>
      ) : error ? (
        <div className="rounded-card bg-white p-6 text-center text-deal">Failed to load customers.</div>
      ) : users.length === 0 ? (
        <div className="rounded-card bg-white p-8 text-center text-ink-3">
          <Users className="mx-auto mb-2 h-8 w-8" />
          No customers found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card bg-white shadow-card">
          <table className="w-full min-w-[700px] text-left text-md">
            <thead className="bg-surface-muted text-ink-3">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-2">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-medium text-ink">{user.displayName || "—"}</td>
                  <td className="px-4 py-3 text-ink-2">{user.email || "—"}</td>
                  <td className="px-4 py-3 capitalize text-ink-2">{user.role ?? "customer"}</td>
                  <td className="px-4 py-3 text-ink-3">{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
