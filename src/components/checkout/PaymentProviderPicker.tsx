import { CreditCard } from "lucide-react";
import { cn } from "../../lib/utils";
import type { PaymentProviderId, PaymentProviderInfo } from "../../services/payments";

export interface PaymentProviderPickerProps {
  value: PaymentProviderId | null;
  onChange: (provider: PaymentProviderId) => void;
  providers: PaymentProviderInfo[];
}

/** Radio list for selecting the active payment gateway. */
export function PaymentProviderPicker({ value, onChange, providers }: PaymentProviderPickerProps) {
  if (providers.length <= 1) return null;

  return (
    <fieldset>
      <legend className="sr-only">Payment provider</legend>
      <ul className="grid gap-2 sm:grid-cols-2">
        {providers.map((provider) => {
          const selected = value === provider.id;
          return (
            <li key={provider.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-card border bg-white p-3 transition-colors",
                  selected ? "border-brand ring-1 ring-brand" : "border-line hover:border-ink/30",
                )}
              >
                <input
                  type="radio"
                  name="payment-provider"
                  value={provider.id}
                  checked={selected}
                  onChange={() => onChange(provider.id)}
                  className="h-[18px] w-[18px] shrink-0 cursor-pointer accent-brand"
                />
                <CreditCard className={cn("h-5 w-5 shrink-0", selected ? "text-brand" : "text-ink-3")} strokeWidth={1.9} />
                <span className="min-w-0">
                  <span className="block text-md font-semibold text-ink">{provider.label}</span>
                  <span className="block text-sm text-ink-3">
                    {provider.id === "paystack" ? "Card, bank transfer, USSD & mobile money" : "Card, bank transfer & mobile money"}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
