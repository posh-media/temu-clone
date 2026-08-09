import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../layout/Logo";
import { TRUST_ITEMS } from "../layout/TrustBar";

/** Centred card layout shared by the sign-in and register pages. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface-muted">
      <header className="border-b border-line bg-white">
        <div className="shell flex h-14 items-center justify-between">
          <Logo height={22} />
          <Link to="/" className="text-md font-medium text-ink-2 hover:text-brand">
            Continue shopping
          </Link>
        </div>
      </header>

      <main id="main" className="flex flex-1 items-start justify-center px-3 py-6 md:py-10">
        <div className="w-full max-w-[420px]">
          <div className="rounded-card bg-white px-4 py-6 md:px-6">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="mt-1 text-md text-ink-3">{subtitle}</p>
            <div className="mt-5">{children}</div>
            <div className="mt-5 border-t border-line-2 pt-4 text-center text-md text-ink-2">{footer}</div>
          </div>

          <ul className="mt-4 space-y-1.5 px-1">
            {TRUST_ITEMS.slice(0, 3).map(({ icon: Icon, label, detail }) => (
              <li key={label} className="flex items-center gap-2 text-sm text-ink-3">
                <Icon className="h-4 w-4 shrink-0 text-trust" strokeWidth={2} />
                <span className="font-medium text-ink-2">{label}</span> &middot; {detail}
              </li>
            ))}
            <li className="flex items-center gap-2 text-sm text-ink-3">
              <ShieldCheck className="h-4 w-4 shrink-0 text-trust" strokeWidth={2} />
              Accounts are handled by Firebase Authentication
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
