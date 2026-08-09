import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "dark" | "deal";
type Size = "sm" | "md" | "lg" | "xl";

/**
 * Temu's CTAs are fully rounded pills: solid orange for the primary action,
 * black for "Buy now", and a light outline for secondary actions.
 */
const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-600 active:bg-brand-700 disabled:bg-brand/50",
  deal: "bg-deal text-white hover:bg-deal-dark active:bg-deal-dark",
  dark: "bg-ink text-white hover:bg-black active:bg-black",
  secondary: "bg-brand-50 text-brand hover:bg-brand-100 border border-brand-200",
  outline: "border border-ink/25 bg-white text-ink hover:border-ink/60 hover:bg-surface-muted",
  ghost: "text-ink hover:bg-surface-muted",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-md",
  lg: "h-11 px-5 text-md",
  xl: "h-12 px-6 text-lg",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
  /** Square-ish corners instead of Temu's default pill shape. */
  square?: boolean;
  leadingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, block, square, leadingIcon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-60",
        square ? "rounded-lg" : "rounded-pill",
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : leadingIcon}
      {children}
    </button>
  );
});
