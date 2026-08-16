import { useEffect, useMemo } from "react";
import {
  getEnabledPaymentMethods,
  PAYMENT_METHODS,
  paymentMethod,
  type PaymentMethodOption,
} from "../../config/paymentMethods";
import { cn } from "../../lib/utils";
import type { PaymentMethodId } from "../../types/commerce";

export { PAYMENT_METHODS, paymentMethod, type PaymentMethodOption };

/** Radio list of payment methods, styled like Temu's checkout selector. */
export function PaymentMethodPicker({
  value,
  onChange,
  methods: methodsProp,
}: {
  value: PaymentMethodId;
  onChange: (id: PaymentMethodId) => void;
  methods?: PaymentMethodOption[];
}) {
  const enabledMethods = useMemo(() => getEnabledPaymentMethods(), []);
  const methods = methodsProp ?? PAYMENT_METHODS.filter((method) => enabledMethods.includes(method.id));

  // If the current value is no longer enabled/available, fall back to the first method.
  useEffect(() => {
    if (methods.some((method) => method.id === value)) return;
    const first = methods[0]?.id;
    if (first) onChange(first);
  }, [methods, value, onChange]);

  return (
    <fieldset>
      <legend className="sr-only">Payment method</legend>
      <ul className="space-y-2">
        {methods.map(({ id, label, description, icon: Icon }) => {
          const selected = value === id;
          return (
            <li key={id}>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-card border bg-white p-3 transition-colors",
                  selected ? "border-brand ring-1 ring-brand" : "border-line hover:border-ink/30",
                )}
              >
                <input
                  type="radio"
                  name="payment-method"
                  value={id}
                  checked={selected}
                  onChange={() => onChange(id)}
                  className="h-[18px] w-[18px] shrink-0 cursor-pointer accent-brand"
                />
                <Icon className={cn("h-5 w-5 shrink-0", selected ? "text-brand" : "text-ink-3")} strokeWidth={1.9} />
                <span className="min-w-0">
                  <span className="block text-md font-semibold text-ink">{label}</span>
                  <span className="block text-sm text-ink-3">{description}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
