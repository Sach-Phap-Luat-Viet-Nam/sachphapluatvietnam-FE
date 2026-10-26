import type { SelectHTMLAttributes } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { cn } from "@slvn/ui";
import { PROVINCES } from "@slvn/utils";
import { INPUT, LABEL } from "@/components/form-styles";

export interface ProvinceSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "value"> {
  id: string;
  label: string;
  /** Kết quả `register(...)` của React Hook Form. */
  registration: UseFormRegisterReturn;
  /** Giá trị đang chọn (theo `useWatch`), để select luôn khớp khi form được điền bằng `setValue`/`reset`. */
  value: string;
  error?: string;
}

/**
 * Chọn tỉnh/thành từ danh sách chuẩn (`PROVINCES`). Giá trị cũ không nằm trong danh sách (sổ địa chỉ lưu theo địa giới
 * trước 07/2025) vẫn được giữ làm một lựa chọn để không bị mất khi khách sửa địa chỉ; backend so khớp lỏng nên vẫn tính
 * được phí ship.
 */
export function ProvinceSelect({ id, label, registration, value, error, className, ...props }: ProvinceSelectProps) {
  const isLegacy = value !== "" && !PROVINCES.some((name) => name === value);

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
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(INPUT, "border-border")}
      >
        <option value="">Chọn tỉnh/thành phố</option>
        {isLegacy && <option value={value}>{value}</option>}
        {PROVINCES.map((name) => (
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
