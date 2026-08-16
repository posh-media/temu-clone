import { Clock3, Info, MapPin, Plus, ShoppingCart, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AddressCard } from "../components/address/AddressCard";
import { AddressForm } from "../components/address/AddressForm";
import { CartSummary } from "../components/cart/CartSummary";
import { OrderLineList } from "../components/checkout/OrderSummary";
import { PaymentMethodPicker, paymentMethod } from "../components/checkout/PaymentMethodPicker";
import { CheckoutHeader } from "../components/layout/Header";
import { FocusLayout } from "../components/layout/Layout";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { Textarea } from "../components/ui/Field";
import { Skeleton } from "../components/ui/Skeleton";
import { useAddresses } from "../hooks/useAddresses";
import { addDays, formatPrice, formatShortDate } from "../lib/format";
import { cn } from "../lib/utils";
import { createOrder, generateOrderReference } from "../services/orders";
import { useAuth } from "../store/AuthProvider";
import { useCart, SHIPPING } from "../store/CartProvider";
import { useCheckout } from "../store/CheckoutProvider";
import { useToast } from "../store/ToastProvider";
import type { Address, OrderAddress } from "../types/commerce";

/** Delivery speed options. Express adds a surcharge on top of shipping. */
const DELIVERY_OPTIONS = [
  { id: "standard", label: "Standard", days: [4, 9], surcharge: 0, note: "Free with your order" },
  { id: "express", label: "Express", days: [2, 4], surcharge: 3500, note: "Prioritised handling" },
] as const;

type DeliveryId = (typeof DELIVERY_OPTIONS)[number]["id"];

/** Maps a saved Address onto the `orders.address` shape already in Firestore. */
function toOrderAddress(address: Address, fallbackEmail?: string): OrderAddress {
  return {
    customerName: address.customerName,
    phone: address.phone,
    email: address.email ?? fallbackEmail ?? "",
    country: address.country,
    state: address.state,
    LGA: address.lga,
    fullAddress: [address.fullAddress, address.postalCode].filter(Boolean).join(", "),
  };
}

function Step({ index, title, children, action }: { index: number; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-card bg-white px-3 py-3.5 md:px-4">
      <div className="flex items-center justify-between gap-3 pb-2.5">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-sm font-bold text-white">
            {index}
          </span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, totals } = useCart();
  const { addresses, defaultAddress, isLoading: addressesLoading, save } = useAddresses();
  const { draft, setAddressId, setPaymentMethod, setNote, setOrderReference } = useCheckout();
  const { user } = useAuth();
  const { toast } = useToast();

  const [delivery, setDelivery] = useState<DeliveryId>("standard");
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [placing, setPlacing] = useState(false);

  const selectedLines = useMemo(() => items.filter((line) => line.selected), [items]);
  const selectedAddress =
    addresses.find((a) => a.id === draft.addressId) ?? defaultAddress;

  // Default the checkout draft to the shopper's default address.
  useEffect(() => {
    if (!draft.addressId && defaultAddress) setAddressId(defaultAddress.id);
  }, [draft.addressId, defaultAddress, setAddressId]);

  const deliveryOption = DELIVERY_OPTIONS.find((o) => o.id === delivery) ?? DELIVERY_OPTIONS[0];
  const finalTotals = {
    ...totals,
    shipping: totals.shipping + deliveryOption.surcharge,
    total: totals.subtotal + totals.shipping + deliveryOption.surcharge,
  };

  if (selectedLines.length === 0) {
    return (
      <FocusLayout>
        <CheckoutHeader title="Checkout" />
        <div className="shell py-6">
          <div className="rounded-card bg-white">
            <EmptyState
              icon={ShoppingCart}
              title="Nothing selected to check out"
              description="Go back to your cart and select the items you want to buy."
              action={
                <Link to="/cart">
                  <Button>Back to cart</Button>
                </Link>
              }
            />
          </div>
        </div>
      </FocusLayout>
    );
  }

  const placeOrder = async () => {
    if (!selectedAddress) {
      toast("Add a shipping address first", "error");
      setAddressModalOpen(true);
      return;
    }

    setPlacing(true);
    try {
      const reference = generateOrderReference();
      // Expected delivery uses the upper bound of the selected delivery window.
      const expectedDelivery = addDays(new Date(), deliveryOption.days[1]);
      await createOrder({
        reference,
        address: toOrderAddress(selectedAddress, user?.email ?? undefined),
        lines: selectedLines,
        totalPrice: finalTotals.total,
        paymentMethod: paymentMethod(draft.paymentMethod).orderValue,
        expectedDelivery,
        note: draft.note,
        userId: user?.uid,
      });
      setOrderReference(reference);
      // The cart is only emptied once payment resolves, so a failed payment
      // does not lose the basket.
      navigate(`/payment?ref=${reference}`);
    } catch (error) {
      console.error("Failed to create order", error);
      toast("We couldn't place your order. Please try again.", "error");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <FocusLayout>
      <CheckoutHeader title="Checkout" />

      <div className="shell py-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_368px]">
          <div className="space-y-3">
            {/* 1 - Shipping address */}
            <Step
              index={1}
              title="Shipping address"
              action={
                addresses.length > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAddressModalOpen(true)}
                    leadingIcon={<Plus className="h-4 w-4" />}
                  >
                    Add new
                  </Button>
                ) : undefined
              }
            >
              {addressesLoading ? (
                <Skeleton className="h-[120px] w-full rounded-card" />
              ) : addresses.length === 0 ? (
                <div className="rounded-card border border-dashed border-line px-3 py-6 text-center">
                  <MapPin className="mx-auto h-7 w-7 text-ink-4" strokeWidth={1.5} />
                  <p className="mt-2 text-md font-medium text-ink">No shipping address yet</p>
                  <p className="mt-0.5 text-sm text-ink-3">We need somewhere to send your parcel.</p>
                  <Button className="mt-3" onClick={() => setAddressModalOpen(true)}>
                    Add shipping address
                  </Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {addresses.map((address) => (
                    <li key={address.id}>
                      <AddressCard
                        address={address}
                        selectable
                        selected={selectedAddress?.id === address.id}
                        onSelect={() => setAddressId(address.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Step>

            {/* 2 - Delivery option */}
            <Step index={2} title="Delivery option">
              <fieldset>
                <legend className="sr-only">Delivery speed</legend>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {DELIVERY_OPTIONS.map((option) => {
                    const selected = delivery === option.id;
                    const from = addDays(new Date(), option.days[0]);
                    const to = addDays(new Date(), option.days[1]);
                    const isStandard = option.id === "standard";
                    const shippingCost = isStandard ? totals.shipping : option.surcharge;
                    const shippingLabel =
                      shippingCost === 0 ? "Free" : isStandard ? formatPrice(shippingCost) : `+${formatPrice(shippingCost)}`;
                    const showFreeShippingInfo = isStandard && totals.shipping > 0;
                    return (
                      <li key={option.id}>
                        <label
                          className={cn(
                            "flex cursor-pointer items-start gap-2.5 rounded-card border bg-white p-3 transition-colors",
                            selected ? "border-brand ring-1 ring-brand" : "border-line hover:border-ink/30",
                          )}
                        >
                          <input
                            type="radio"
                            name="delivery"
                            checked={selected}
                            onChange={() => setDelivery(option.id)}
                            className="mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer accent-brand"
                          />
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5 text-md font-semibold text-ink">
                              {isStandard ? (
                                <Clock3 className="h-4 w-4 text-trust" />
                              ) : (
                                <Zap className="h-4 w-4 text-deal" fill="currentColor" />
                              )}
                              {option.label}
                              <span className={cn("text-sm font-medium", shippingCost === 0 ? "text-trust" : "text-ink-2")}>
                                {shippingLabel}
                              </span>
                            </span>
                            <span className="mt-0.5 block text-sm text-ink-2">
                              {formatShortDate(from)} &ndash; {formatShortDate(to)}
                            </span>
                            {!showFreeShippingInfo && (
                              <span className="block text-xs text-ink-3">{option.note}</span>
                            )}
                            {showFreeShippingInfo && (
                              <span className="mt-1 flex items-start gap-1 text-xs text-ink-2">
                                <Info className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                                Free shipping only on orders above {formatPrice(SHIPPING.freeThreshold, { decimals: false })}
                              </span>
                            )}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            </Step>

            {/* 3 - Payment method */}
            <Step index={3} title="Payment method">
              <PaymentMethodPicker value={draft.paymentMethod} onChange={setPaymentMethod} />
            </Step>

            {/* 4 - Items + note */}
            <Step index={4} title={`Items (${selectedLines.length})`}>
              <OrderLineList lines={selectedLines} />
              <div className="mt-3 border-t border-line-2 pt-3">
                <Textarea
                  label="Delivery note (optional)"
                  placeholder="Landmark, gate code, or anything the courier should know"
                  value={draft.note}
                  maxLength={280}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>
            </Step>
          </div>

          {/* Summary aside */}
          <aside>
            <div className="space-y-3 lg:sticky lg:top-[76px]">
              <CartSummary
                totals={finalTotals}
                ctaLabel="Place order"
                ctaDisabled={!selectedAddress}
                ctaLoading={placing}
                onCta={() => void placeOrder()}
                footnote="You'll confirm payment on the next step"
              />
              <p className="px-1 text-xs leading-relaxed text-ink-4">
                By placing your order you agree to the terms of use and confirm the shipping details above. Items are
                only removed from your cart once payment succeeds.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile sticky place-order bar */}
      <div className="sticky bottom-0 z-30 border-t border-line bg-white px-3 py-2 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-ink-3">{selectedLines.length} items &middot; {deliveryOption.label}</p>
            <p className="text-lg font-extrabold text-brand">{formatPrice(finalTotals.total)}</p>
          </div>
          <Button size="lg" loading={placing} disabled={!selectedAddress} onClick={() => void placeOrder()}>
            Place order
          </Button>
        </div>
      </div>

      <Modal
        open={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        title="Add shipping address"
        size="lg"
      >
        <AddressForm
          saving={save.isPending}
          onCancel={() => setAddressModalOpen(false)}
          onSubmit={async (address) => {
            const saved = await save.mutateAsync(address);
            setAddressId(saved.id);
            setAddressModalOpen(false);
            toast("Address saved");
          }}
        />
      </Modal>
    </FocusLayout>
  );
}
