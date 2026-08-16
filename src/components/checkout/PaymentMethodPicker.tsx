import { Banknote, CreditCard, Landmark, Smartphone, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import type { PaymentMethodId } from "../../types/commerce";

export interface PaymentMethodOption {
  id: PaymentMethodId;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Normalized gateway channel (e.g. "card", "bank_transfer"). */
  orderValue: string;
}

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: "card",
    label: "Debit or credit card",
    description: "Visa, Mastercard and Verve",
    icon: CreditCard,
    orderValue: "card",
  },
  {
    id: "bank-transfer",
    label: "Bank transfer",
    description: "Pay from your bank app or via instant bank login",
    icon: Landmark,
    orderValue: "bank_transfer",
  },
  {
    id: "ussd",
    label: "USSD",
    description: "Dial a short code on your phone to authorise the payment",
    icon: Smartphone,
    orderValue: "ussd",
  },
  {
    id: "mobile-money",
    label: "Mobile money",
    description: "Pay with your mobile money wallet",
    icon: Wallet,
    orderValue: "mobile_money",
  },
  {
    id: "pay-on-delivery",
    label: "Pay on delivery",
    description: "Pay with cash or card when your parcel arrives",
    icon: Banknote,
    orderValue: "pay_on_delivery",
  },
];

export const paymentMethod = (id: PaymentMethodId) =>
  PAYMENT_METHODS.find((method) => method.id === id) ?? PAYMENT_METHODS[0];

/** Radio list of payment methods, styled like Temu's checkout selector. */
export function PaymentMethodPicker({
  value,
  onChange,
  methods = PAYMENT_METHODS,
}: {
  value: PaymentMethodId;
  onChange: (id: PaymentMethodId) => void;
  methods?: PaymentMethodOption[];
}) {
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
