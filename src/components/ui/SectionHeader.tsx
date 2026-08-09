import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

/**
 * The heading Temu puts above every homepage rail: bold title on the left,
 * optional subtitle, and a "See all >" link on the right.
 */
export function SectionHeader({
  title,
  subtitle,
  to,
  linkLabel = "See all",
  accessory,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  to?: string;
  linkLabel?: string;
  accessory?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-3 pb-2.5", className)}>
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-xl font-bold leading-tight text-ink md:text-2xl">{title}</h2>
        {subtitle && <p className="mt-0.5 truncate text-sm text-ink-3">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {accessory}
        {to && (
          <Link
            to={to}
            className="inline-flex items-center gap-0.5 text-md font-medium text-ink-2 hover:text-brand"
          >
            {linkLabel}
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
