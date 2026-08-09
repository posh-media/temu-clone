import { Minus, Plus } from "lucide-react";
import { clamp } from "../../lib/utils";
import { cn } from "../../lib/utils";

/** `- 1 +` stepper used on the PDP and in cart lines. */
export function QuantityStepper({
  value,
  onChange,
  max = 99,
  min = 1,
  size = "md",
  label = "Quantity",
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  min?: number;
  size?: "sm" | "md";
  label?: string;
  disabled?: boolean;
}) {
  const height = size === "sm" ? "h-8" : "h-10";
  const button = size === "sm" ? "w-8" : "w-10";

  return (
    <div
      className={cn("inline-flex items-center overflow-hidden rounded-pill border border-line bg-white", height)}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1, min, max))}
        className={cn("grid h-full place-items-center text-ink disabled:text-ink-4", button)}
      >
        <Minus className="h-4 w-4" strokeWidth={2.4} />
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        aria-label={label}
        disabled={disabled}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(clamp(Math.round(next), min, max));
        }}
        className="h-full w-11 border-x border-line bg-white text-center text-md font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + 1, min, max))}
        className={cn("grid h-full place-items-center text-ink disabled:text-ink-4", button)}
      >
        <Plus className="h-4 w-4" strokeWidth={2.4} />
      </button>
    </div>
  );
}
