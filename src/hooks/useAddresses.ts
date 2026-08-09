import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  deleteAddress, fetchAddresses, saveAddress, setDefaultAddress,
} from "../services/addresses";
import { useAuth } from "../store/AuthProvider";
import type { Address } from "../types/commerce";
import { queryKeys } from "./useCatalogue";

/**
 * Address CRUD. The cache key includes the user id (or "guest") so switching
 * account never shows another shopper's saved addresses.
 */
export function useAddresses() {
  const { user } = useAuth();
  const userId = user?.uid;
  const scope = userId ?? "guest";
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.addresses(scope),
    queryFn: () => fetchAddresses(userId),
    staleTime: 60_000,
  });

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.addresses(scope) }),
    [queryClient, scope],
  );

  const save = useMutation({
    mutationFn: (address: Address) => saveAddress(address, userId),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (addressId: string) => deleteAddress(addressId, userId),
    onSuccess: invalidate,
  });

  const makeDefault = useMutation({
    mutationFn: (addressId: string) => setDefaultAddress(addressId, userId),
    onSuccess: invalidate,
  });

  const addresses = query.data ?? [];

  return {
    addresses,
    defaultAddress: addresses.find((a) => a.isDefault) ?? addresses[0],
    isLoading: query.isLoading,
    save,
    remove,
    makeDefault,
  };
}
