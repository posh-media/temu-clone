import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { TRUST_ITEMS } from "./TrustBar";

const LINK_GROUPS = [
  {
    title: "Company info",
    links: [
      { label: "About Temu", to: "/" },
      { label: "Temu affiliate", to: "/" },
      { label: "Contact us", to: "/" },
      { label: "Careers", to: "/" },
      { label: "Press", to: "/" },
    ],
  },
  {
    title: "Customer service",
    links: [
      { label: "Return and refund policy", to: "/" },
      { label: "Shipping info", to: "/" },
      { label: "Your orders", to: "/orders" },
      { label: "Your addresses", to: "/address" },
      { label: "Report suspicious activity", to: "/" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Support centre", to: "/" },
      { label: "Safety centre", to: "/" },
      { label: "Temu purchase protection", to: "/" },
      { label: "Sitemap", to: "/" },
      { label: "Partner with Temu", to: "/" },
    ],
  },
];

/** lucide-react dropped brand glyphs, so the social row uses initials. */
const SOCIALS = [
  { initials: "IG", label: "Instagram" },
  { initials: "FB", label: "Facebook" },
  { initials: "X", label: "X" },
  { initials: "YT", label: "YouTube" },
];

export function Footer() {
  return (
    <footer className="mt-6 border-t border-line bg-white">
      {/* Guarantee strip repeated at the bottom, as on the reference site. */}
      <div className="border-b border-line-2 bg-surface-muted">
        <ul className="shell grid grid-cols-2 gap-3 py-4 sm:grid-cols-3 lg:grid-cols-5">
          {TRUST_ITEMS.map(({ icon: Icon, label, detail }) => (
            <li key={label} className="flex items-start gap-2">
              <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-trust" strokeWidth={2} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{label}</span>
                <span className="block text-xs text-ink-3">{detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="shell grid gap-8 py-8 md:grid-cols-[1.2fr_repeat(3,1fr)]">
        <div>
          <Logo height={24} />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-3">
            Stage 1 reference reimplementation built with React, TypeScript, Tailwind CSS and Firebase for
            side-by-side UI comparison. Not affiliated with Temu.
          </p>
          <div className="mt-4 flex gap-2">
            {SOCIALS.map(({ initials, label }) => (
              <span
                key={label}
                aria-label={label}
                title={label}
                className="grid h-9 w-9 place-items-center rounded-full border border-line text-xs font-bold text-ink-2"
              >
                {initials}
              </span>
            ))}
          </div>
        </div>

        {LINK_GROUPS.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h3 className="mb-2.5 text-md font-semibold text-ink">{group.title}</h3>
            <ul className="space-y-2">
              {group.links.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-ink-3 hover:text-brand">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-line-2">
        <div className="shell flex flex-col gap-2 py-4 text-xs text-ink-4 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Temu clone &mdash; learning project, Stage 1.</p>
          <p className="flex flex-wrap gap-x-3 gap-y-1">
            <span>Terms of use</span>
            <span>Privacy policy</span>
            <span>Your privacy choices</span>
            <span>Nigeria &middot; NGN &#8358;</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
