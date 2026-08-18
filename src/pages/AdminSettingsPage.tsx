import { AlertTriangle, Package, Shield, Truck } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Settings</h1>

      <div className="rounded-card bg-white p-5 shadow-card">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><Truck className="h-5 w-5 text-brand" /> Shipping</h2>
        <ul className="list-disc space-y-1 pl-5 text-md text-ink-2">
          <li>Free standard shipping on orders above ₦30,000.</li>
          <li>Standard shipping fee: ₦2,500 for orders below ₦30,000.</li>
          <li>Express shipping: ₦3,500.</li>
        </ul>
        <p className="mt-3 text-sm text-ink-3">Shipping rules are currently controlled by the checkout logic. Changing them here requires a future settings-backed implementation.</p>
      </div>

      <div className="rounded-card bg-white p-5 shadow-card">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><Package className="h-5 w-5 text-brand" /> Payment providers</h2>
        <p className="text-md text-ink-2">Paystack and KoraPay are configured via environment variables. Secret keys are never stored in Firestore or exposed to the client.</p>
      </div>

      <div className="rounded-card bg-white p-5 shadow-card">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><Shield className="h-5 w-5 text-brand" /> Security</h2>
        <p className="text-md text-ink-2">Admin access is enforced by Firestore security rules and the role field on each user document. Only users with role <code className="rounded bg-surface-sunken px-1 text-sm">admin</code> or <code className="rounded bg-surface-sunken px-1 text-sm">super_admin</code> can access admin data.</p>
      </div>

      <div className="rounded-card bg-deal/5 p-4 text-md text-deal">
        <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> Store configuration via the Admin Panel is planned. Business-critical values remain in environment variables until a safe settings backend is designed.</p>
      </div>
    </div>
  );
}
