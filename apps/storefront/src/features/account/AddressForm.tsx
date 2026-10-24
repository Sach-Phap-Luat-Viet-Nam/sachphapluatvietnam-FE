"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authErrorMessage, fieldErrors } from "@slvn/auth";
import { cn } from "@slvn/ui";
import { FORM_ERROR, SUBMIT } from "@/components/form-styles";
import { TextField } from "@/components/TextField";
import type { Address } from "@/lib/account-api";
import { useSaveAddress } from "@/lib/use-account";
import { ADDRESS_FIELDS, EMPTY_ADDRESS, addressFormSchema, toAddressBody } from "./schemas";
import type { AddressFormValues } from "./schemas";

export interface AddressFormProps {
  /** Địa chỉ đang sửa; không có là thêm mới. */
  address?: Address;
  /** Giá trị điền sẵn khi thêm mới (họ tên, số điện thoại từ hồ sơ). */
  initial?: Partial<AddressFormValues>;
  /** Địa chỉ đầu tiên luôn là mặc định nên ẩn ô chọn. */
  forceDefault: boolean;
  onDone: () => void;
}

/** Thêm hoặc sửa một địa chỉ giao hàng trong sổ địa chỉ. */
export function AddressForm({ address, initial, forceDefault, onDone }: AddressFormProps) {
  const save = useSaveAddress();
  const prefix = address ? `address-${address.id}` : "address-new";
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: address ?? { ...EMPTY_ADDRESS, ...initial, isDefault: forceDefault },
  });

  const onSubmit = async (values: AddressFormValues) => {
    try {
      await save.mutateAsync({
        id: address?.id,
        ...toAddressBody({ ...values, isDefault: forceDefault || values.isDefault }),
      });
      onDone();
    } catch (error) {
      const invalidFields = fieldErrors(error, ADDRESS_FIELDS);
      invalidFields.forEach(({ field, message }) => setError(field, { message }));
      if (invalidFields.length === 0) {
        setError("root.server", { message: authErrorMessage(error) });
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-label={address ? "Sửa địa chỉ" : "Thêm địa chỉ"}
      className="border-gold/30 flex flex-col gap-4 border px-5 py-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id={`${prefix}-recipientName`}
          label="Tên người nhận"
          autoComplete="name"
          registration={register("recipientName")}
          error={errors.recipientName?.message}
        />
        <TextField
          id={`${prefix}-phone`}
          label="Số điện thoại"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          registration={register("phone")}
          error={errors.phone?.message}
        />
        <TextField
          id={`${prefix}-province`}
          label="Tỉnh/Thành phố"
          autoComplete="address-level1"
          registration={register("province")}
          error={errors.province?.message}
        />
        <TextField
          id={`${prefix}-ward`}
          label="Phường/Xã"
          autoComplete="address-level2"
          registration={register("ward")}
          error={errors.ward?.message}
        />
      </div>
      <TextField
        id={`${prefix}-streetAddress`}
        label="Số nhà, tên đường"
        autoComplete="street-address"
        registration={register("streetAddress")}
        error={errors.streetAddress?.message}
      />
      {!forceDefault && (
        <label className="text-sand flex min-h-8 w-fit items-center gap-3 text-[15px]">
          <input type="checkbox" {...register("isDefault")} className="accent-gold size-4.5" />
          Đặt làm địa chỉ mặc định
        </label>
      )}
      {errors.root?.server && (
        <p role="alert" className={FORM_ERROR}>
          {errors.root.server.message}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={isSubmitting} className={cn(SUBMIT, "px-8")}>
          {isSubmitting ? "Đang lưu…" : "Lưu địa chỉ"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="border-ivory/30 hover:border-gold min-h-13.5 border px-6 transition-colors"
        >
          Hủy
        </button>
      </div>
    </form>
  );
}
