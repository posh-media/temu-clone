import { Menu } from "lucide-react";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Button } from "../ui/Button";
import { AdminSidebar } from "./AdminSidebar";
import { RequireAdmin } from "./RequireAdmin";

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <RequireAdmin>
      <div className="flex min-h-dvh bg-surface-muted">
        <AdminSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white px-4 md:hidden">
            <Button variant="ghost" size="sm" square onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
            <span className="text-lg font-bold text-brand">Temu Admin</span>
          </header>
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </RequireAdmin>
  );
}
