import { useState } from "react";
import {
  COUNTRIES, DEFAULT_COUNTRY, LGA_SUGGESTIONS, NIGERIAN_STATES, POSTAL_CODE_COUNTRIES,
} from "../../lib/regions";
import { newAddressId } from "../../services/addresses";
import type { Address } from "../../types/commerce";
import { Button } from "../ui/Button";
import { Checkbox, Input, Select } from "../ui/Field";

type Errors = Partial<Record<keyof Address, string>>;

function emptyAddress(): Address {
  return {
    id: newAddressId(),
    customerName: "",
    phone: "",
    email: "",
    country: DEFAULT_COUNTRY,
    state: "",
    lga: "",
    fullAddress: "",
    postalCode: "",
    isDefault: false,
  };
}

/** Field-level validation. Kept in the component so errors can be shown inline. */
function validate(address: Address): Errors {
  const errors: Errors = {};
  if (address.customerName.trim().length < 2) errors.customerName = "Enter the recipient's full name.";
  // Accepts local (0803...) and international (+234...) formats.
  if (!/^\+?[\d\s-]{7,18}$/.test(address.phone.trim())) errors.phone = "Enter a valid phone number.";
  if (address.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email.trim()))
    errors.email = "Enter a valid email address.";
  if (!address.country) errors.country = "Select a country.";
  if (!address.state.trim()) errors.state = "Select or enter a state.";
  if (!address.lga.trim()) errors.lga = "Enter a city or LGA.";
  if (address.fullAddress.trim().length < 6) errors.fullAddress = "Enter the street address.";
  if (POSTAL_CODE_COUNTRIES.has(address.country) && !address.postalCode?.trim())
    errors.postalCode = "Postal code is required for this country.";
  return errors;
}

/**
 * Add / edit address form. Nigeria gets a state dropdown plus LGA suggestions;
 * other countries fall back to free-text so the form never blocks an entry.
 */
export function AddressForm({
  initial,
  saving,
  onSubmit,
  onCancel,
}: {
  initial?: Address;
  saving?: boolean;
  onSubmit: (address: Address) => void;
  onCancel: () => void;
}) {
  const [address, setAddress] = useState<Address>(initial ?? emptyAddress());
  const [errors, setErrors] = useState<Errors>({});

  const set = <K extends keyof Address>(key: K, value: Address[K]) => {
    setAddress((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const isNigeria = address.country === DEFAULT_COUNTRY;
  const lgaOptions = LGA_SUGGESTIONS[address.state] ?? [];

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const nextErrors = validate(address);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;
        onSubmit({
          ...address,
          customerName: address.customerName.trim(),
          phone: address.phone.trim(),
          email: address.email?.trim() || undefined,
          state: address.state.trim(),
          lga: address.lga.trim(),
          fullAddress: address.fullAddress.trim(),
          postalCode: address.postalCode?.trim() || undefined,
        });
      }}
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Recipient's full name"
          required
          autoComplete="name"
          value={address.customerName}
          error={errors.customerName}
          onChange={(e) => set("customerName", e.target.value)}
        />
        <Input
          label="Phone number"
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+234 800 000 0000"
          value={address.phone}
          error={errors.phone}
          onChange={(e) => set("phone", e.target.value)}
        />
      </div>

      <Input
        label="Email (for delivery updates)"
        type="email"
        autoComplete="email"
        value={address.email ?? ""}
        error={errors.email}
        onChange={(e) => set("email", e.target.value)}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Country / region"
          required
          autoComplete="country-name"
          value={address.country}
          error={errors.country}
          onChange={(e) => {
            set("country", e.target.value);
            set("state", "");
            set("lga", "");
          }}
        >
          {COUNTRIES.map((country) => (
            <option key={country} value={country}>{country}</option>
          ))}
        </Select>

        {isNigeria ? (
          <Select
            label="State"
            required
            value={address.state}
            error={errors.state}
            onChange={(e) => {
              set("state", e.target.value);
              set("lga", "");
            }}
          >
            <option value="">Select a state</option>
            {NIGERIAN_STATES.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </Select>
        ) : (
          <Input
            label="State / province"
            required
            autoComplete="address-level1"
            value={address.state}
            error={errors.state}
            onChange={(e) => set("state", e.target.value)}
          />
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Input
            label={isNigeria ? "City / LGA" : "City"}
            required
            list={lgaOptions.length ? "lga-options" : undefined}
            autoComplete="address-level2"
            value={address.lga}
            error={errors.lga}
            hint={isNigeria && !address.state ? "Pick a state first for suggestions" : undefined}
            onChange={(e) => set("lga", e.target.value)}
          />
          {lgaOptions.length > 0 && (
            <datalist id="lga-options">
              {lgaOptions.map((lga) => (
                <option key={lga} value={lga} />
              ))}
            </datalist>
          )}
        </div>
        <Input
          label="Postal code"
          required={POSTAL_CODE_COUNTRIES.has(address.country)}
          autoComplete="postal-code"
          value={address.postalCode ?? ""}
          error={errors.postalCode}
          onChange={(e) => set("postalCode", e.target.value)}
        />
      </div>

      <Input
        label="Street address"
        required
        autoComplete="street-address"
        placeholder="House number, street, landmark"
        value={address.fullAddress}
        error={errors.fullAddress}
        onChange={(e) => set("fullAddress", e.target.value)}
      />

      <Checkbox
        checked={address.isDefault}
        onChange={(checked) => set("isDefault", checked)}
        label="Set as my default shipping address"
      />

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" block onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" block loading={saving}>
          Save address
        </Button>
      </div>
    </form>
  );
}
