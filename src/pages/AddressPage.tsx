import { MapPinOff, Plus } from "lucide-react";
import { useState } from "react";
import { AddressCard } from "../components/address/AddressCard";
import { AddressForm } from "../components/address/AddressForm";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { Skeleton } from "../components/ui/Skeleton";
import { useAddresses } from "../hooks/useAddresses";
import { useAuth } from "../store/AuthProvider";
import { useToast } from "../store/ToastProvider";
import type { Address } from "../types/commerce";

export default function AddressPage() {
  const { addresses, isLoading, save, remove, makeDefault } = useAddresses();
  const { user } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Address | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Address | null>(null);

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  const onSubmit = async (address: Address) => {
    await save.mutateAsync(address);
    toast(editing ? "Address updated" : "Address saved");
    closeForm();
  };

  return (
    <div className="shell py-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div>
          <h1 className="text-2xl font-bold">Your addresses</h1>
          <p className="mt-0.5 text-sm text-ink-3">
            {user
              ? "Saved to your account and used at checkout."
              : "Saved on this device. Sign in to sync them across devices."}
          </p>
        </div>
        <Button onClick={() => setCreating(true)} leadingIcon={<Plus className="h-4 w-4" />}>
          Add new address
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-[130px] w-full rounded-card" />
          ))}
        </div>
      ) : addresses.length === 0 ? (
        <div className="rounded-card bg-white">
          <EmptyState
            icon={MapPinOff}
            title="No saved addresses"
            description="Add a shipping address so checkout only takes a couple of taps."
            action={<Button onClick={() => setCreating(true)}>Add your first address</Button>}
          />
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {addresses.map((address) => (
            <li key={address.id}>
              <AddressCard
                address={address}
                onEdit={() => setEditing(address)}
                onDelete={() => setDeleting(address)}
                onSetDefault={() => {
                  void makeDefault.mutateAsync(address.id).then(() => toast("Default address updated"));
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={creating || editing !== null}
        onClose={closeForm}
        title={editing ? "Edit address" : "Add a new address"}
        size="lg"
      >
        <AddressForm
          key={editing?.id ?? "new"}
          initial={editing ?? undefined}
          saving={save.isPending}
          onSubmit={(address) => void onSubmit(address)}
          onCancel={closeForm}
        />
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete this address?"
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" block onClick={() => setDeleting(null)}>
              Keep it
            </Button>
            <Button
              variant="deal"
              block
              loading={remove.isPending}
              onClick={async () => {
                if (!deleting) return;
                await remove.mutateAsync(deleting.id);
                toast("Address deleted", "info");
                setDeleting(null);
              }}
            >
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-md text-ink-2">
          {deleting?.customerName} &middot; {deleting?.fullAddress}
        </p>
      </Modal>
    </div>
  );
}
