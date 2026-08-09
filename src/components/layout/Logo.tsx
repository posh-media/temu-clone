import { Link } from "react-router-dom";
import logoUrl from "../../assets/temu-logo.png";
import { cn } from "../../lib/utils";

/**
 * Stage 1 reference wordmark. The supplied PNG is a 2000x2000 square with the
 * wordmark centred in a narrow band, so it is cropped with `clip-path` and
 * scaled up rather than being re-encoded.
 */
export function Logo({ className, height = 28 }: { className?: string; height?: number }) {
  return (
    <Link to="/" aria-label="Temu home" className={cn("inline-flex shrink-0 items-center", className)}>
      <span className="relative block overflow-hidden" style={{ height, width: height * 2.9 }}>
        <img
          src={logoUrl}
          alt="Temu"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ height: height * 4.1, clipPath: "inset(37.5% 0 38.5% 0)" }}
        />
      </span>
    </Link>
  );
}
