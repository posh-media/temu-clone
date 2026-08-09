import { MapPin, Pencil, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";
import type { Address } from "../../types/commerce";
import { Badge } from "../ui/Badge";

/** Formats an address into the single line used in summaries. */
export function formatAddressLine(address: Address) {
  return [address.fullAddress, address.lga, address.state, address.postalCode, address.country]
    .filter(Boolean)
    .join(", ");
}

export function AddressCard({
  address,
  selectable,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  address: Address;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSetDefault?: () => void;
}) {
  return (
    <div
      className={cn(
        "relative rounded-card border bg-white p-3 transition-colors",
        selected ? "border-brand ring-1 ring-brand" : "border-line",
      )}
    >
      <div className="flex gap-2.5">
        {selectable && (
          <label className="flex shrink-0 items-start pt-0.5">
            <span className="sr-only">Deliver to {address.customerName}</span>
            <input
              type="radio"
              name="shipping-address"
              checked={Boolean(selected)}
              onChange={() => onSelect?.()}
              className="h-[18px] w-[18px] cursor-pointer accent-brand"
            />
          </label>
        )}

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-md font-semibold text-ink">{address.customerName}</span>
            <span className="text-md text-ink-2">{address.phone}</span>
            {address.isDefault && <Badge tone="brand">Default</Badge>}
          </p>
          <p className="mt-1 flex items-start gap-1.5 text-md leading-relaxed text-ink-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" strokeWidth={1.8} />
            <span>{formatAddressLine(address)}</span>
          </p>
          {address.email && <p className="mt-1 pl-[22px] text-sm text-ink-3">{address.email}</p>}

          <div className="mt-2 flex flex-wrap items-center gap-3">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1 text-sm font-medium text-ink-2 hover:text-brand"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-1 text-sm font-medium text-ink-2 hover:text-deal"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            )}
            {onSetDefault && !address.isDefault && (
              <button
                type="button"
                onClick={onSetDefault}
                className="text-sm font-medium text-brand hover:underline"
              >
                Set as default
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
