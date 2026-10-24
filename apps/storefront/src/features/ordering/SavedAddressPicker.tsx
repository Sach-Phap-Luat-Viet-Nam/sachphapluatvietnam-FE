import { addressLine } from "@/lib/account-api";
import type { Address } from "@/lib/account-api";

/** `other` = khách tự nhập địa chỉ khác. */
export type AddressChoice = number | "other";

export interface SavedAddressPickerProps {
  addresses: Address[];
  value: AddressChoice;
  onChange: (choice: AddressChoice) => void;
}

const OPTION =
  "border-border has-checked:border-gold has-checked:bg-gold/8 has-focus-visible:outline-gold flex cursor-pointer gap-4 border px-4 py-3 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-4";

/** Chọn nhanh một địa chỉ trong sổ địa chỉ để điền vào form đặt hàng, hoặc nhập địa chỉ khác. */
export function SavedAddressPicker({ addresses, value, onChange }: SavedAddressPickerProps) {
  return (
    <div role="radiogroup" aria-label="Địa chỉ đã lưu" className="flex flex-col gap-2.5">
      {addresses.map((address) => (
        <label key={address.id} className={OPTION}>
          <input
            type="radio"
            name="saved-address"
            checked={value === address.id}
            onChange={() => onChange(address.id)}
            className="accent-gold mt-1 size-4.5 shrink-0"
          />
          <span className="min-w-0 text-sm leading-6">
            <span className="text-ivory font-medium">{address.recipientName}</span>
            <span className="text-mist"> · {address.phone}</span>
            {address.isDefault && <span className="text-gold ml-2 text-xs">Mặc định</span>}
            <span className="text-sand block">{addressLine(address)}</span>
          </span>
        </label>
      ))}
      <label className={OPTION}>
        <input
          type="radio"
          name="saved-address"
          checked={value === "other"}
          onChange={() => onChange("other")}
          className="accent-gold mt-1 size-4.5 shrink-0"
        />
        <span className="text-sm leading-6 font-medium">Giao đến địa chỉ khác</span>
      </label>
    </div>
  );
}
