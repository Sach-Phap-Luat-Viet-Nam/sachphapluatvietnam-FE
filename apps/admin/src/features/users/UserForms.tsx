"use client";

import { useForm } from "react-hook-form";
import type { UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, fieldA11y } from "@/components/Field";
import { FormActions } from "@/components/FormActions";
import { CHECKBOX, HINT, INPUT, LABEL } from "@/components/form-styles";
import { showServerError } from "@/lib/admin-errors";
import { ASSIGNABLE_STAFF_ROLES, roleLabel } from "@/lib/roles";
import { createStaffFormSchema, resetPasswordFormSchema, rolesFormSchema } from "./schemas";
import type { CreateStaffFormValues, ResetPasswordFormValues, RolesFormValues, StaffUser } from "./schemas";
import { staffRolesOf } from "./user-forms";

const CREATE_FIELDS = ["email", "fullName", "password", "roles"] as const;
const PASSWORD_FIELDS = ["newPassword"] as const;
const ROLES_FIELDS = ["roles"] as const;

function RoleChecklist({
  idPrefix,
  error,
  registration,
}: {
  idPrefix: string;
  error?: string;
  /** Kết quả `register("roles")`: các ô tích cùng tên nên RHF gom thành mảng giá trị. */
  registration: UseFormRegisterReturn;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={LABEL}>Vai trò</legend>
      <div className="grid gap-x-6 sm:grid-cols-2">
        {ASSIGNABLE_STAFF_ROLES.map((role) => (
          <label key={role} className="flex min-h-11 items-center gap-3">
            <input type="checkbox" value={role} {...registration} className={CHECKBOX} id={`${idPrefix}-${role}`} />
            {roleLabel(role)}
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export interface CreateStaffFormProps {
  onSave: (values: CreateStaffFormValues) => Promise<void>;
  onCancel: () => void;
}

/** Thêm nhân viên với mật khẩu tạm; nhân viên phải tự bật 2FA ở lần đăng nhập đầu tiên mới dùng được Admin. */
export function CreateStaffForm({ onSave, onCancel }: CreateStaffFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateStaffFormValues>({
    resolver: zodResolver(createStaffFormSchema),
    defaultValues: { email: "", fullName: "", password: "", roles: [] },
  });

  return (
    <form
      noValidate
      aria-label="Thêm nhân viên"
      onSubmit={handleSubmit(async (values) => {
        try {
          await onSave(values);
        } catch (error) {
          showServerError(error, CREATE_FIELDS, setError);
        }
      })}
      className="flex flex-col gap-5"
    >
      <Field id="staff-email" label="Email đăng nhập" error={errors.email?.message}>
        <input
          type="email"
          autoComplete="off"
          {...register("email")}
          {...fieldA11y("staff-email", errors.email?.message)}
          className={INPUT}
        />
      </Field>
      <Field id="staff-name" label="Họ và tên" error={errors.fullName?.message}>
        <input
          type="text"
          autoComplete="off"
          {...register("fullName")}
          {...fieldA11y("staff-name", errors.fullName?.message)}
          className={INPUT}
        />
      </Field>
      <Field
        id="staff-password"
        label="Mật khẩu tạm"
        error={errors.password?.message}
        hint="Từ 8 ký tự. Anh/chị báo mật khẩu cho nhân viên; nhân viên cần bật xác thực 2 lớp ở lần đăng nhập đầu."
      >
        <input
          type="password"
          autoComplete="new-password"
          {...register("password")}
          {...fieldA11y("staff-password", errors.password?.message, true)}
          className={INPUT}
        />
      </Field>
      <RoleChecklist idPrefix="staff-role" error={errors.roles?.message} registration={register("roles")} />
      <FormActions
        pending={isSubmitting}
        submitLabel="Thêm nhân viên"
        onCancel={onCancel}
        error={errors.root?.server?.message}
      />
    </form>
  );
}

export interface RolesFormProps {
  user: StaffUser;
  onSave: (values: RolesFormValues) => Promise<void>;
  onCancel: () => void;
}

/** Đổi vai trò: danh sách đầy đủ thay thế vai trò cũ. */
export function RolesForm({ user, onSave, onCancel }: RolesFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RolesFormValues>({
    resolver: zodResolver(rolesFormSchema),
    defaultValues: { roles: staffRolesOf(user) },
  });

  return (
    <form
      noValidate
      aria-label={`Đổi vai trò của ${user.fullName}`}
      onSubmit={handleSubmit(async (values) => {
        try {
          await onSave(values);
        } catch (error) {
          showServerError(error, ROLES_FIELDS, setError);
        }
      })}
      className="flex flex-col gap-4"
    >
      <RoleChecklist idPrefix={`roles-${user.id}`} error={errors.roles?.message} registration={register("roles")} />
      <FormActions
        pending={isSubmitting}
        submitLabel="Lưu vai trò"
        onCancel={onCancel}
        error={errors.root?.server?.message}
      />
    </form>
  );
}

export interface PasswordFormProps {
  user: StaffUser;
  onSave: (values: ResetPasswordFormValues) => Promise<void>;
  onCancel: () => void;
}

/** Đặt mật khẩu mới cho tài khoản: mở khóa nếu đang bị khóa và đăng xuất mọi thiết bị của người đó. */
export function PasswordForm({ user, onSave, onCancel }: PasswordFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { newPassword: "" },
  });
  const id = `password-${user.id}`;

  return (
    <form
      noValidate
      aria-label={`Đặt mật khẩu mới cho ${user.fullName}`}
      onSubmit={handleSubmit(async (values) => {
        try {
          await onSave(values);
        } catch (error) {
          showServerError(error, PASSWORD_FIELDS, setError);
        }
      })}
      className="flex flex-col gap-4"
    >
      <Field id={id} label="Mật khẩu mới" error={errors.newPassword?.message}>
        <input
          type="password"
          autoComplete="new-password"
          {...register("newPassword")}
          {...fieldA11y(id, errors.newPassword?.message)}
          className={INPUT}
        />
      </Field>
      <p className={HINT}>
        Mọi phiên đăng nhập hiện tại của tài khoản này sẽ bị đăng xuất. Anh/chị báo mật khẩu mới cho người dùng qua kênh
        riêng.
      </p>
      <FormActions
        pending={isSubmitting}
        submitLabel="Đặt mật khẩu"
        onCancel={onCancel}
        error={errors.root?.server?.message}
      />
    </form>
  );
}
