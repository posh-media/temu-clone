import { useEffect, useState } from "react";
import { X } from "lucide-react";

/**
 * The thin rotating promo strip Temu pins above the header. Messages cycle on a
 * timer; dismissal is remembered for the session only.
 */
const MESSAGES = [
  "Free shipping on all orders \u00B7 Limited time offer",
  "\u23F1 Lightning deals refresh every hour",
  "Delivery guarantee: refund if your parcel is late",
  "Price adjustment within 30 days of purchase",
];

export function TopBanner() {
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem("temu-clone:banner") === "off");

  useEffect(() => {
    if (dismissed) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), 4500);
    return () => window.clearInterval(id);
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <div className="relative bg-ink text-white">
      <div className="shell flex h-8 items-center justify-center">
        <p key={index} className="animate-fade-in truncate text-center text-sm font-medium">
          {MESSAGES[index]}
        </p>
      </div>
      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={() => {
          sessionStorage.setItem("temu-clone:banner", "off");
          setDismissed(true);
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/70 hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
