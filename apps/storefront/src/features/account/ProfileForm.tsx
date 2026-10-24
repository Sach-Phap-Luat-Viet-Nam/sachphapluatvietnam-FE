"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { authErrorMessage, fieldErrors } from "@slvn/auth";
import { cn } from "@slvn/ui";
import { FORM_ERROR, INPUT, LABEL, SUBMIT } from "@/components/form-styles";
import { TextField } from "@/components/TextField";
import { OCCUPATIONS } from "@/lib/account-api";
import type { Profile } from "@/lib/account-api";
import { useUpdateProfile } from "@/lib/use-account";
import {
  OCCUPATION_LABELS,
  PROFILE_FIELDS,
  profileFormSchema,
  profileFormValues,
  toUpdateProfileBody,
} from "./schemas";
import type { ProfileFormValues } from "./schemas";

/** Thông tin cá nhân (`/me`): họ tên, số điện thoại dùng để tự điền khi đặt hàng; ngày sinh, nghề nghiệp. */
export function ProfileForm({ profile }: { profile: Profile }) {
  const update = useUpdateProfile();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: profileFormValues(profile),
  });

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      const saved = await update.mutateAsync(toUpdateProfileBody(values));
      // Đưa form về trạng thái "chưa sửa" với dữ liệu backend vừa lưu (đã chuẩn hóa số điện thoại).
      reset(profileFormValues(saved));
    } catch (error) {
      const invalidFields = fieldErrors(error, PROFILE_FIELDS);
      invalidFields.forEach(({ field, message }) => setError(field, { message }));
      if (invalidFields.length === 0) {
        setError("root.server", { message: authErrorMessage(error) });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <span className={LABEL}>Email đăng nhập</span>
        <span className="text-sand">{profile.email}</span>
      </div>
      <TextField
        id="fullName"
        label="Họ và tên"
        autoComplete="name"
        registration={register("fullName")}
        error={errors.fullName?.message}
      />
      <TextField
        id="phoneNumber"
        label="Số điện thoại"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="0901234567"
        registration={register("phoneNumber")}
        error={errors.phoneNumber?.message}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="birthDate"
          label="Ngày sinh"
          type="date"
          autoComplete="bday"
          registration={register("birthDate")}
          error={errors.birthDate?.message}
        />
        <div className="flex flex-col gap-2">
          <label htmlFor="occupation" className={LABEL}>
            Nghề nghiệp
          </label>
          <select
            id="occupation"
            {...register("occupation")}
            aria-invalid={Boolean(errors.occupation)}
            className={cn(INPUT, "border-border")}
          >
            <option value="">Chưa chọn</option>
            {OCCUPATIONS.map((occupation) => (
              <option key={occupation} value={occupation}>
                {OCCUPATION_LABELS[occupation]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-mist text-sm">Họ tên và số điện thoại được điền sẵn khi bạn đặt hàng.</p>
      <button type="submit" disabled={isSubmitting} className={cn(SUBMIT, "sm:w-fit sm:px-10")}>
        {isSubmitting ? "Đang lưu…" : "Lưu thông tin"}
      </button>
      <p aria-live="polite" className="min-h-6 text-sm">
        {update.isSuccess && !isDirty && (
          <span className="text-ok flex items-center gap-2">
            <Check size={16} /> Đã lưu thông tin.
          </span>
        )}
      </p>
      {errors.root?.server && (
        <p role="alert" className={FORM_ERROR}>
          {errors.root.server.message}
        </p>
      )}
    </form>
  );
}
