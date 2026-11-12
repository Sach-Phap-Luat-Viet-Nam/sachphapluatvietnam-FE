import type { ProvinceSelectProps } from "./ProvinceSelect";
import { cn } from "@slvn/ui";
import { INPUT, LABEL } from "./form-styles";
import wards from "@/lib/wards.json";

// Snapshot: https://provinces.open-api.vn/api/v2/?depth=2 (2026-11-12).
// v2 contains the two-level administrative divisions after July 2025.
export function WardSelect({
  province,
  id,
  label,
  registration,
  value,
  error,
  className,
  ...props
}: ProvinceSelectProps & { province: string }) {
  const options = (wards as Record<string, string[]>)[province] ?? [];
  const isLegacy = value !== "" && !options.includes(value);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <select
        id={id}
        {...props}
        {...registration}
        value={value}
        disabled={!province}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(INPUT, "border-border disabled:opacity-60")}
      >
        <option value="">{province ? "Chọn phường/xã" : "Chọn tỉnh/thành phố trước"}</option>
        {isLegacy && <option value={value}>{value} (địa chỉ đã lưu)</option>}
        {options.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
