import { Flame, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useCountdown } from "../../hooks/useCountdown";
import { formatPrice, splitPrice } from "../../lib/format";
import { cn } from "../../lib/utils";
import { Button } from "../ui/Button";
import { SmartImage } from "../ui/SmartImage";

interface FlashSaleModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  image: string;
  promoPrice: number;
  originalPrice: number;
  expiresAt: number;
  onClaim: () => void;
  loading?: boolean;
}

function useLockBodyScroll(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
}

/** Backdrop + centred flash-sale promotional modal. */
export function FlashSaleModal({
  open,
  onClose,
  productName,
  image,
  promoPrice,
  originalPrice,
  expiresAt,
  onClaim,
  loading,
}: FlashSaleModalProps) {
  const { whole, fraction } = splitPrice(promoPrice);
  const target = useMemo(() => new Date(expiresAt), [expiresAt]);
  const { hours, minutes, seconds, finished } = useCountdown(target);
  const disabled = finished || loading;

  useLockBodyScroll(open);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const panel = panelRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    panel.focus();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 md:p-6">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="relative flex w-full max-w-[420px] max-h-[85vh] flex-col overflow-hidden rounded-3xl bg-white shadow-pop"
      >
        {/* Hero image with close button */}
        <div className="relative aspect-[4/3] w-full shrink-0 bg-surface-sunken">
          <SmartImage
            src={image}
            alt={productName}
            wrapperClassName="h-full w-full bg-surface-sunken"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink shadow"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-deal px-3 py-1 text-xs font-bold text-white">
            <Flame className="h-3.5 w-3.5" fill="currentColor" />
            LIMITED TIME
          </div>
          <div className="absolute bottom-0 left-0 w-full px-5 pb-5 text-white">
            <p className="clamp-2 text-lg font-semibold leading-snug drop-shadow">
              {productName}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4 text-center">
          <p className="text-sm font-semibold text-deal">Flash sale price</p>
          <p className={cn("mt-1 text-5xl font-extrabold leading-none", disabled ? "text-ink-3" : "text-deal")}>
            <span className="text-2xl">{formatPrice(promoPrice).charAt(0)}</span>
            {whole}
            <span className="text-2xl">.{fraction}</span>
          </p>
          <p className="mt-1 text-sm text-ink-3 line-through">
            {formatPrice(originalPrice)}
          </p>

          <div className="mt-5 rounded-2xl bg-surface-muted px-4 py-4">
            <p className="text-sm font-medium text-ink-2">Limited time offer ends in</p>
            <div className="mt-2 flex items-center justify-center gap-1.5">
              {[
                { label: "hrs", value: hours },
                { label: "min", value: minutes },
                { label: "sec", value: seconds },
              ].map((part, i) => (
                <div key={part.label} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-lg font-bold text-deal">:</span>}
                  <div className="rounded-xl bg-ink px-3 py-2 text-white">
                    <p className="text-xl font-bold tabular-nums leading-none">{part.value}</p>
                    <p className="mt-0.5 text-[10px] font-medium uppercase text-white/80">{part.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {finished ? (
              <p className="rounded-card bg-ink-2/10 px-4 py-3 text-md font-medium text-ink-2">
                This flash sale has expired.
              </p>
            ) : (
              <Button
                block
                size="xl"
                variant="deal"
                loading={loading}
                disabled={disabled}
                onClick={onClaim}
                leadingIcon={<Flame className="h-5 w-5" fill="currentColor" />}
              >
                CLAIM NOW
              </Button>
            )}
            <Button block variant="ghost" onClick={onClose} disabled={loading}>
              Continue browsing
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
