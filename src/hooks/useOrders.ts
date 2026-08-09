import { useQuery } from "@tanstack/react-query";
import { fetchOrderById, fetchOrders } from "../services/orders";
import { useAuth } from "../store/AuthProvider";
import { queryKeys } from "./useCatalogue";

/** Orders belonging to the signed-in shopper (by `userId` or `orderBy`). */
export function useOrders() {
  const { user, displayName } = useAuth();
  const scope = user?.uid ?? "guest";

  return useQuery({
    queryKey: queryKeys.orders(scope),
    queryFn: () => fetchOrders({ userId: user?.uid, customerName: displayName || undefined }),
    enabled: Boolean(user),
    staleTime: 30_000,
  });
}

/** A single order, looked up by its reference (the document id). */
export function useOrder(reference: string | undefined) {
  return useQuery({
    queryKey: queryKeys.order(reference ?? ""),
    queryFn: () => fetchOrderById(reference!),
    enabled: Boolean(reference),
    staleTime: 30_000,
  });
}
