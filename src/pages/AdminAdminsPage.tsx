import { Loader2, Shield, UserCheck, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Field";
import { fetchAdmins, fetchCustomers, updateUserRole, type AdminUser } from "../services/admin";
import { logAdminAction } from "../services/audit";
import { formatDate } from "../lib/format";
import { useAuth } from "../store/AuthProvider";

export default function AdminAdminsPage() {
  const { user: currentUser } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [customers, setCustomers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchAdmins(100), fetchCustomers(200)])
      .then(([a, c]) => {
        setAdmins(a);
        setCustomers(c);
      })
      .catch(() => setMessage("Failed to load users."))
      .finally(() => setLoading(false));
  }, []);

  async function setRole(target: AdminUser, role: "admin" | null) {
    setBusy(target.id);
    setMessage(null);
    try {
      await updateUserRole(target.uid, role);
      await logAdminAction({
        adminUid: currentUser!.uid,
        adminEmail: currentUser!.email,
        action: "ADMIN_ROLE_CHANGED",
        targetType: "user",
        targetId: target.uid,
        before: { role: target.role },
        after: { role },
      });
      setAdmins((prev) => (role ? [...prev, { ...target, role }] : prev.filter((u) => u.id !== target.id)));
      if (!role) setCustomers((prev) => [...prev, { ...target, role: null }]);
      else setCustomers((prev) => prev.filter((u) => u.id !== target.id));
      setMessage(role ? `Promoted ${target.email ?? target.displayName} to admin.` : `Removed admin role from ${target.email ?? target.displayName}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update role.");
    } finally {
      setBusy(null);
    }
  }

  const availableCustomers = customers.filter(
    (u) =>
      (u.email?.toLowerCase().includes(search.toLowerCase()) || u.displayName?.toLowerCase().includes(search.toLowerCase())) &&
      u.id !== currentUser?.uid,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Admins</h1>
        <p className="text-sm text-ink-3">Manage admin privileges</p>
      </div>

      {message && (
        <div className="rounded-card bg-brand-50 px-4 py-3 text-md text-brand-700">{message}</div>
      )}

      <section className="rounded-card bg-white p-4 shadow-card">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <Shield className="h-5 w-5 text-brand" /> Current admins
        </h2>
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
        ) : admins.length === 0 ? (
          <p className="text-ink-3">No admins found. Set role=&quot;admin&quot; on a user document in Firestore to bootstrap.</p>
        ) : (
          <table className="w-full text-left text-md">
            <thead className="bg-surface-muted text-ink-3">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-2">
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td className="px-4 py-3 font-medium text-ink">{admin.displayName || "—"}</td>
                  <td className="px-4 py-3 text-ink-2">{admin.email || "—"}</td>
                  <td className="px-4 py-3 capitalize text-ink-2">{admin.role ?? "admin"}</td>
                  <td className="px-4 py-3 text-ink-3">{formatDate(admin.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      loading={busy === admin.id}
                      disabled={admin.uid === currentUser?.uid}
                      leadingIcon={<UserX className="h-4 w-4" />}
                      onClick={() => setRole(admin, null)}
                    >
                      Remove admin
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-card bg-white p-4 shadow-card">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <UserCheck className="h-5 w-5 text-trust" /> Promote customer
        </h2>
        <div className="mb-3 max-w-md">
          <Input
            placeholder="Search by email or name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
        ) : availableCustomers.length === 0 ? (
          <p className="text-ink-3">No matching customers.</p>
        ) : (
          <ul className="divide-y divide-line-2">
            {availableCustomers.slice(0, 10).map((customer) => (
              <li key={customer.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-ink">{customer.displayName || "—"}</p>
                  <p className="text-sm text-ink-3">{customer.email}</p>
                </div>
                <Button
                  size="sm"
                  loading={busy === customer.id}
                  onClick={() => setRole(customer, "admin")}
                >
                  Make admin
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
