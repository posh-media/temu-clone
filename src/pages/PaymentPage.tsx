import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle, CheckCircle2, Clock3, Loader2, Lock, ReceiptText,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PAYMENT_METHODS, paymentMethod } from "../components/checkout/PaymentMethodPicker";
import { CheckoutHeader } from "../components/layout/Header";
import { FocusLayout } from "../components/layout/Layout";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Field";
import { Skeleton } from "../components/ui/Skeleton";
import { queryKeys } from "../hooks/useCatalogue";
import { formatPrice } from "../lib/format";
import { cn } from "../lib/utils";
import { fetchOrderById } from "../services/orders";
import { paymentProvider, initializePaystack, verifyPaystack } from "../services/payments";
import { isPaystackEnabled } from "../services/paystack";
import { useAuth } from "../store/AuthProvider";
import { useCart } from "../store/CartProvider";
import { useCheckout } from "../store/CheckoutProvider";
import { useFlashSale } from "../store/FlashSaleProvider";
import { useToast } from "../store/ToastProvider";
import type { PaymentMethodId } from "../types/commerce";

type Phase = "collect" | "initializing" | "redirecting" | "verifying" | "result";
type Outcome = "paid" | "pending" | "failed" | "abandoned" | null;

/** Method-specific instruction panel. */
function MethodPanel({ method, reference }: { method: PaymentMethodId; reference: string }) {

  if (method === "pay-on-delivery") {
    return (
      <div className="rounded-card border border-line bg-surface-muted px-3 py-2.5 text-md text-ink-2">
        Pay with cash or card when the courier arrives. Your order is confirmed now and marked as pending payment.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="rounded-card bg-brand-50 px-3 py-2 text-sm text-ink-2">
        You&apos;ll be redirected to Paystack to complete this payment securely. No card or bank details are collected
        on this page.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Name on card" placeholder="Collected on Paystack" disabled />
        <Input label="Card number" placeholder="Collected on Paystack" disabled />
      </div>
      <p className="text-sm text-ink-3">
        Payment reference: <span className="font-mono font-medium text-ink-2">{reference}</span>
      </p>
    </div>
  );
}

const RESULT_UI = {
  paid: {
    icon: CheckCircle2,
    tone: "text-trust",
    title: "Payment successful",
  },
  pending: {
    icon: Clock3,
    tone: "text-brand",
    title: "Payment pending",
  },
  failed: {
    icon: AlertCircle,
    tone: "text-deal",
    title: "Payment failed",
  },
  abandoned: {
    icon: AlertCircle,
    tone: "text-ink-3",
    title: "Payment not completed",
  },
  processing: {
    icon: Loader2,
    tone: "text-brand",
    title: "Processing",
  },
} as const;

export default function PaymentPage() {
  const [params] = useSearchParams();
  const orderIdFromQuery = params.get("ref");
  const paymentReference = params.get("reference") || params.get("trxref");

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { draft, setPaymentMethod, setOrderReference, reset } = useCheckout();
  const { clearSelected } = useCart();
  const flashSale = useFlashSale();
  const { user } = useAuth();
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>(paymentReference ? "verifying" : "collect");
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [message, setMessage] = useState<string>("");

  const reference = useMemo(
    () => orderIdFromQuery || paymentReference || "",
    [orderIdFromQuery, paymentReference],
  );

  const orderQuery = useQuery({
    queryKey: queryKeys.order(reference),
    queryFn: () => fetchOrderById(reference),
    enabled: Boolean(reference),
  });

  const order = orderQuery.data;

  // Keep the selected method in step with what was written to the order.
  useEffect(() => {
    if (!order) return;
    const match = PAYMENT_METHODS.find((m) => m.orderValue === order.paymentMethod);
    if (match && match.id !== draft.paymentMethod) setPaymentMethod(match.id);
  }, [order, draft.paymentMethod, setPaymentMethod]);

  // Verify a payment when the user returns from Paystack.
  useEffect(() => {
    if (!paymentReference || orderQuery.isLoading || !order) return;
    if (phase !== "verifying") return;

    const doVerify = async () => {
      try {
        const result = await verifyPaystack(paymentReference);
        if (result.status === "paid") {
          setOutcome("paid");
          setMessage("Payment successful");
          clearSelected();
          flashSale.markCompleted();
          setOrderReference(undefined);
        } else if (result.status === "failed") {
          setOutcome("failed");
          setMessage(result.message || "Payment could not be completed.");
        } else {
          setOutcome("pending");
          setMessage(result.message || "We're waiting for Paystack to confirm your payment.");
        }
        await queryClient.invalidateQueries({ queryKey: queryKeys.order(reference) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.orders(user?.uid ?? "guest") });
      } catch (error) {
        console.error("Verification failed", error);
        setOutcome("failed");
        setMessage("We couldn't confirm the payment. Please try again.");
      } finally {
        setPhase("result");
      }
    };

    void doVerify();
  }, [paymentReference, orderQuery.isLoading, order, phase, reference, queryClient, clearSelected, setOrderReference, user?.uid, flashSale]);

  const startPaystack = useMutation({
    mutationFn: async () => {
      if (!order) throw new Error("No order");
      const callbackUrl = `${window.location.origin}/payment?ref=${encodeURIComponent(order.id)}`;
      const result = await initializePaystack(order.id, callbackUrl);
      return result;
    },
    onMutate: () => setPhase("initializing"),
    onSuccess: (result) => {
      setPhase("redirecting");
      // Give the UI a tick to render the redirecting state, then leave for Paystack.
      window.setTimeout(() => {
        window.location.href = result.authorizationUrl;
      }, 400);
    },
    onError: (error) => {
      console.error("Paystack initialize failed", error);
      setOutcome("failed");
      setMessage("We couldn't reach Paystack. Please check your connection and try again.");
      setPhase("result");
    },
  });

  const pay = useMutation({
    mutationFn: () =>
      paymentProvider.authorize({
        reference,
        amount: order?.totalPrice ?? 0,
        method: draft.paymentMethod,
        email: order?.address.email || user?.email || "",
      }),
    onMutate: () => setPhase("result"),
    onSuccess: async (paymentResult) => {
      setOutcome(paymentResult.status === "paid" ? "paid" : paymentResult.status === "pending" ? "pending" : "failed");
      setMessage(paymentResult.message);
      if (paymentResult.status === "paid" || paymentResult.status === "pending") {
        clearSelected();
        flashSale.markCompleted();
      }
      setOrderReference(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.order(reference) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders(user?.uid ?? "guest") });
    },
    onError: (error) => {
      console.error("Payment failed", error);
      setOutcome("failed");
      setMessage("We couldn't reach the payment service. No money has left your account.");
    },
  });

  const handlePay = () => {
    if (draft.paymentMethod === "pay-on-delivery" || !isPaystackEnabled) {
      pay.mutate();
      return;
    }
    startPaystack.mutate();
  };

  const handleRetry = () => {
    setOutcome(null);
    setMessage("");
    setPhase("collect");
  };

  const handleContinue = () => {
    reset();
    toast("Happy shopping!", "info");
    navigate("/");
  };

  const handleViewOrder = () => {
    if (order) navigate(`/orders/${order.paymentReference}`);
  };

  if (!reference) {
    return (
      <FocusLayout>
        <CheckoutHeader title="Payment" />
        <div className="shell py-6">
          <div className="rounded-card bg-white">
            <EmptyState
              icon={ReceiptText}
              title="No order to pay for"
              description="Start at your cart and place an order to reach the payment step."
              action={
                <Link to="/cart">
                  <Button>Go to cart</Button>
                </Link>
              }
            />
          </div>
        </div>
      </FocusLayout>
    );
  }

  if (orderQuery.isLoading || (phase === "verifying" && !order)) {
    return (
      <FocusLayout>
        <CheckoutHeader title="Payment" />
        <div className="shell space-y-3 py-4">
          <Skeleton className="h-24 w-full rounded-card" />
          <Skeleton className="h-64 w-full rounded-card" />
        </div>
      </FocusLayout>
    );
  }

  if (!order) {
    return (
      <FocusLayout>
        <CheckoutHeader title="Payment" />
        <div className="shell py-6">
          <div className="rounded-card bg-white">
            <EmptyState
              icon={ReceiptText}
              title="Order not found"
              description={`We couldn't find order ${reference}.`}
              action={
                <Link to="/orders">
                  <Button>View your orders</Button>
                </Link>
              }
            />
          </div>
        </div>
      </FocusLayout>
    );
  }

  const method = paymentMethod(draft.paymentMethod);
  const resultUi = outcome ? RESULT_UI[outcome] : RESULT_UI.processing;
  const ResultIcon = resultUi.icon;

  if (outcome === "abandoned") {
    return (
      <FocusLayout>
        <CheckoutHeader title="Payment" />
        <div className="shell py-3">
          <div className="mx-auto max-w-2xl space-y-3">
            <section className="rounded-card bg-white px-4 py-10 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-ink-3" strokeWidth={1.8} />
              <h2 className="mt-4 text-2xl font-bold">Payment not completed</h2>
              <p className="mx-auto mt-1.5 max-w-sm text-md text-ink-2">{message}</p>
            </section>
            <div className="space-y-2 px-1">
              <Button block size="xl" onClick={handleRetry}>
                Try again
              </Button>
              <Button block variant="outline" onClick={() => navigate("/cart")}>
                Back to cart
              </Button>
            </div>
          </div>
        </div>
      </FocusLayout>
    );
  }

  if (phase === "result" && outcome) {
    return (
      <FocusLayout>
        <CheckoutHeader title="Payment" />
        <div className="shell py-3">
          <div className="mx-auto max-w-2xl space-y-3">
            <section className="rounded-card bg-white px-4 py-10 text-center">
              <ResultIcon className={cn("mx-auto h-12 w-12", resultUi.tone)} strokeWidth={1.8} />
              <h2 className="mt-4 text-2xl font-bold">{resultUi.title}</h2>
              <p className="mx-auto mt-1.5 max-w-sm text-md text-ink-2">{message}</p>
              <p className="mt-3 text-sm text-ink-3">
                Order reference <span className="font-mono font-medium text-ink-2">{order.paymentReference}</span>
              </p>
            </section>

            <div className="space-y-2 px-1">
              {outcome === "failed" ? (
                <>
                  <Button block size="xl" onClick={handleRetry}>
                    Try again
                  </Button>
                  <Button block variant="outline" onClick={() => navigate("/cart")}>
                    Back to cart
                  </Button>
                </>
              ) : (
                <>
                  <Button block size="xl" onClick={handleViewOrder}>
                    View order details
                  </Button>
                  <Button block variant="outline" onClick={handleContinue}>
                    Continue shopping
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </FocusLayout>
    );
  }

  return (
    <FocusLayout>
      <CheckoutHeader title="Payment" />

      <div className="shell py-3">
        <div className="mx-auto max-w-2xl space-y-3">
          {/* Amount summary */}
          <section className="rounded-card bg-white px-4 py-4 text-center">
            <p className="text-sm text-ink-3">Amount due</p>
            <p className="mt-0.5 text-4xl font-extrabold text-brand">{formatPrice(order.totalPrice)}</p>
            <p className="mt-1.5 text-sm text-ink-3">
              Order <span className="font-mono font-medium text-ink-2">{order.paymentReference}</span> &middot;{" "}
              {order.orderItems.length} item{order.orderItems.length === 1 ? "" : "s"}
            </p>
            <p className="mt-0.5 text-sm text-ink-3">
              Shipping to {order.address.customerName}, {order.address.LGA}, {order.address.state}
            </p>
          </section>

          {phase === "collect" && (
            <>
              <section className="rounded-card bg-white px-3 py-3.5 md:px-4">
                <h2 className="pb-2.5 text-lg font-bold">Pay with {method.label.toLowerCase()}</h2>
                <MethodPanel method={draft.paymentMethod} reference={order.paymentReference} />
              </section>

              <div className="space-y-2 px-1">
                <Button
                  block
                  size="xl"
                  loading={startPaystack.isPending || pay.isPending}
                  onClick={handlePay}
                >
                  {draft.paymentMethod === "pay-on-delivery"
                    ? "Confirm order"
                    : `Pay ${formatPrice(order.totalPrice)}`}
                </Button>
                <p className="flex items-center justify-center gap-1.5 text-xs text-ink-3">
                  <Lock className="h-3.5 w-3.5" />
                  {draft.paymentMethod === "pay-on-delivery"
                    ? "Pay on delivery"
                    : "Processed securely by Paystack"}
                </p>
                <Button block variant="ghost" onClick={() => navigate("/checkout")}>
                  Change payment method
                </Button>
              </div>
            </>
          )}

          {phase === "initializing" && (
            <section className="rounded-card bg-white px-4 py-12 text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand" />
              <h2 className="mt-4 text-xl font-bold">Preparing Paystack checkout</h2>
              <p className="mt-1.5 text-md text-ink-3">Please wait while we set up your secure payment.</p>
            </section>
          )}

          {phase === "redirecting" && (
            <section className="rounded-card bg-white px-4 py-12 text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand" />
              <h2 className="mt-4 text-xl font-bold">Redirecting to Paystack</h2>
              <p className="mt-1.5 text-md text-ink-3">You&apos;ll complete the payment on Paystack&apos;s secure page.</p>
            </section>
          )}

          {phase === "verifying" && (
            <section className="rounded-card bg-white px-4 py-12 text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand" />
              <h2 className="mt-4 text-xl font-bold">Verifying payment</h2>
              <p className="mt-1.5 text-md text-ink-3">Please don&apos;t close or refresh this page.</p>
            </section>
          )}
        </div>
      </div>
    </FocusLayout>
  );
}
