import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, CircleAlert, Info } from "lucide-react";
import { cn } from "../lib/utils";

type ToastTone = "success" | "error" | "info";
interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastApi {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS: Record<ToastTone, typeof Check> = { success: Check, error: CircleAlert, info: Info };

/**
 * Temu shows a small dark pill toast in the middle/bottom of the viewport after
 * cart actions. Toasts are announced politely for screen readers.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 2400);
  }, []);

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex flex-col items-center gap-2 px-4 md:bottom-10"
      >
        {toasts.map(({ id, message, tone }) => {
          const Icon = ICONS[tone];
          return (
            <div
              key={id}
              className={cn(
                "flex max-w-[86vw] animate-toast-in items-center gap-2 rounded-lg px-4 py-3 text-md font-medium text-white shadow-pop",
                tone === "error" ? "bg-deal-dark" : "bg-black/85",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={3} />
              <span className="clamp-2">{message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
