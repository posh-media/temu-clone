import { ChevronDown } from "lucide-react";
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const CONTROL =
  "w-full rounded-lg border bg-white px-3 text-md text-ink placeholder:text-ink-4 transition-colors " +
  "focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-surface-muted";

function FieldShell({
  id, label, error, hint, required, children,
}: {
  id: string; label?: string; error?: string; hint?: string; required?: boolean; children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-ink-2">
          {label}
          {required && <span className="ml-0.5 text-deal">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-deal">{error}</p>
      ) : hint ? (
        <p className="text-sm text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, id, required, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint} required={required}>
      <input
        ref={ref}
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={cn(CONTROL, "h-11", error ? "border-deal" : "border-line", className)}
        {...rest}
      />
    </FieldShell>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, className, id, required, children, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint} required={required}>
      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          className={cn(CONTROL, "h-11 appearance-none pr-9", error ? "border-deal" : "border-line", className)}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
      </div>
    </FieldShell>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className, id, required, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint} required={required}>
      <textarea
        ref={ref}
        id={fieldId}
        required={required}
        className={cn(CONTROL, "min-h-[84px] py-2.5", error ? "border-deal" : "border-line", className)}
        {...rest}
      />
    </FieldShell>
  );
});

/** Square orange checkbox used across cart selection and filters. */
export function Checkbox({
  checked, onChange, label, className, disabled, indeterminate,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  className?: string;
  disabled?: boolean;
  indeterminate?: boolean;
}) {
  return (
    <label className={cn("flex cursor-pointer select-none items-center gap-2", disabled && "cursor-not-allowed opacity-50", className)}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        ref={(el) => { if (el) el.indeterminate = Boolean(indeterminate) && !checked; }}
        onChange={(e) => onChange(e.target.checked)}
        className="h-[18px] w-[18px] shrink-0 cursor-pointer rounded-[4px] border-line accent-brand"
      />
      <span className="text-md text-ink">{label}</span>
    </label>
  );
}
