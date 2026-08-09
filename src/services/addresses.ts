import { collection, deleteDoc, doc, getDocs, setDoc, writeBatch } from "firebase/firestore";
import { COLLECTIONS, db } from "../lib/firebase";
import type { Address } from "../types/commerce";

/**
 * Address storage.
 *
 * The Firebase project has no populated address structure yet, so this service
 * is the single abstraction over two interchangeable backends:
 *
 *  - signed in  -> Firestore, at `users/{uid}/addresses/{addressId}`
 *  - guest      -> localStorage, so the checkout flow still works end to end
 *
 * See /docs/FIREBASE.md for the exact document shape this writes.
 */

const GUEST_KEY = "temu-clone:addresses";

function addressCollection(userId: string) {
  return collection(db, COLLECTIONS.users, userId, "addresses");
}

function readGuest(): Address[] {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    return raw ? (JSON.parse(raw) as Address[]) : [];
  } catch {
    return [];
  }
}

function writeGuest(addresses: Address[]) {
  localStorage.setItem(GUEST_KEY, JSON.stringify(addresses));
}

export function newAddressId() {
  return `addr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export async function fetchAddresses(userId?: string): Promise<Address[]> {
  if (!userId) return sortAddresses(readGuest());
  const snap = await getDocs(addressCollection(userId));
  return sortAddresses(snap.docs.map((d) => ({ ...(d.data() as Omit<Address, "id">), id: d.id })));
}

export async function saveAddress(address: Address, userId?: string): Promise<Address> {
  const existing = await fetchAddresses(userId);
  // First address is always the default; a new default demotes the others.
  const isDefault = address.isDefault || existing.length === 0;
  const next: Address = { ...address, isDefault };

  if (!userId) {
    const others = existing
      .filter((a) => a.id !== next.id)
      .map((a) => (isDefault ? { ...a, isDefault: false } : a));
    writeGuest([...others, next]);
    return next;
  }

  const batch = writeBatch(db);
  batch.set(doc(addressCollection(userId), next.id), stripId(next));
  if (isDefault) {
    for (const other of existing) {
      if (other.id !== next.id && other.isDefault) {
        batch.set(doc(addressCollection(userId), other.id), { ...stripId(other), isDefault: false });
      }
    }
  }
  await batch.commit();
  return next;
}

export async function deleteAddress(addressId: string, userId?: string): Promise<void> {
  if (!userId) {
    const remaining = readGuest().filter((a) => a.id !== addressId);
    // Never leave the shopper without a default address.
    if (remaining.length && !remaining.some((a) => a.isDefault)) remaining[0].isDefault = true;
    writeGuest(remaining);
    return;
  }
  await deleteDoc(doc(addressCollection(userId), addressId));
  const remaining = await fetchAddresses(userId);
  if (remaining.length && !remaining.some((a) => a.isDefault)) {
    await setDoc(doc(addressCollection(userId), remaining[0].id), { ...stripId(remaining[0]), isDefault: true });
  }
}

export async function setDefaultAddress(addressId: string, userId?: string): Promise<void> {
  const all = await fetchAddresses(userId);
  const target = all.find((a) => a.id === addressId);
  if (target) await saveAddress({ ...target, isDefault: true }, userId);
}

/** Guest addresses are copied into Firestore the first time someone signs in. */
export async function migrateGuestAddresses(userId: string): Promise<void> {
  const guests = readGuest();
  if (!guests.length) return;
  const existing = await fetchAddresses(userId);
  const batch = writeBatch(db);
  guests.forEach((address, index) => {
    batch.set(doc(addressCollection(userId), address.id), {
      ...stripId(address),
      isDefault: existing.length === 0 && index === 0 ? address.isDefault : false,
    });
  });
  await batch.commit();
  localStorage.removeItem(GUEST_KEY);
}

function stripId({ id: _id, ...rest }: Address) {
  return rest;
}

function sortAddresses(addresses: Address[]) {
  return [...addresses].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}
