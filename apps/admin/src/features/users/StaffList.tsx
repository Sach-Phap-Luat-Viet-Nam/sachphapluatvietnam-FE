"use client";

import { useState, useSyncExternalStore } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { getServerSessionState, getSessionState, subscribeSession } from "@slvn/auth";
import { Button } from "@slvn/ui";
import { Field, fieldA11y } from "@/components/Field";
import { FormActions } from "@/components/FormActions";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { StatusBadge } from "@/components/StatusBadge";
import { CARD, CHECKBOX, FORM_ERROR, INPUT, LABEL } from "@/components/form-styles";
import { adminErrorMessage, showServerError } from "@/lib/admin-errors";
import { STAFF_ROLES, staffRoleLabels } from "@/lib/roles";
import { AccountActions } from "./AccountActions";
import { createStaff, fetchStaff, setRoles, USERS_PAGE_SIZE, userKeys } from "./api";
import { accountStatus } from "./labels";
import { UserSearch } from "./UserSearch";
import { createStaffSchema } from "./schemas";
import type { AdminUser, CreateStaffValues } from "./schemas";

const CREATE_FIELDS = ["email", "fullName", "password", "roles"] as const;

/** Tài khoản nhân viên: tìm kiếm, thêm nhân viên, đổi vai trò, khóa, đặt lại mật khẩu, đăng xuất hộ, đăng nhập hộ. */
export function StaffList() {
  const session = useSyncExternalStore(subscribeSession, getSessionState, getServerSessionState);
  const [query, setQuery] = useState({ q: "", page: 1 });
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const staff = useQuery({
    queryKey: userKeys.staff(query),
    queryFn: () => fetchStaff(query),
    placeholderData: keepPreviousData,
  });
  if (session.status !== "authenticated") {
    return null;
  }
  const currentUserId = session.user.id;

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Nhân viên"
        description="Nhân viên mới đăng nhập bằng mật khẩu tạm và phải bật xác thực 2 lớp trước khi vào trang quản trị."
        actions={
          !creating && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={18} aria-hidden="true" /> Thêm nhân viên
            </Button>
          )
        }
      />

      {creating && <CreateStaffForm onClose={() => setCreating(false)} />}

      <UserSearch id="staff-search" label="Tìm nhân viên" onSearch={(q) => setQuery({ q, page: 1 })} />

      {staff.isError ? (
        <ErrorStatus error={staff.error} onRetry={() => void staff.refetch()} />
      ) : staff.isPending ? (
        <LoadingStatus />
      ) : staff.data.items.length === 0 ? (
        <p className={`${CARD} text-muted p-6`}>{query.q ? "Không có nhân viên phù hợp." : "Chưa có nhân viên nào."}</p>
      ) : (
        <>
          <ul className="flex flex-col gap-3" aria-label="Danh sách nhân viên">
            {staff.data.items.map((account) => {
              const status = accountStatus(account);
              const expanded = expandedId === account.id;
              return (
                <li key={account.id} className={`${CARD} flex flex-col gap-4 p-4`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="font-semibold">
                        {account.fullName}
                        {account.id === currentUserId && <span className="text-muted font-normal"> (anh/chị)</span>}
                      </p>
                      <p className="text-muted text-sm break-all">
                        {account.email}
                        {account.phoneNumber && ` · ${account.phoneNumber}`}
                      </p>
                      <p className="text-sm">{staffRoleLabels(account.roles).join(" · ")}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                      <StatusBadge tone={account.twoFactorEnabled ? "info" : "warning"}>
                        {account.twoFactorEnabled ? "Đã bật 2FA" : "Chưa bật 2FA"}
                      </StatusBadge>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-expanded={expanded}
                        aria-controls={`staff-${account.id}`}
                        aria-label={`Quản lý ${account.email}`}
                        onClick={() => setExpandedId(expanded ? null : account.id)}
                      >
                        {expanded ? (
                          <ChevronUp size={16} aria-hidden="true" />
                        ) : (
                          <ChevronDown size={16} aria-hidden="true" />
                        )}
                        Quản lý
                      </Button>
                    </div>
                  </div>
                  {expanded && (
                    <div id={`staff-${account.id}`} className="border-border flex flex-col gap-5 border-t pt-4">
                      <RolesEditor account={account} currentUserId={currentUserId} />
                      <AccountActions account={account} currentUserId={currentUserId} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <Pagination
            page={staff.data.meta.page}
            limit={staff.data.meta.limit || USERS_PAGE_SIZE}
            total={staff.data.meta.total}
            onPageChange={(page) => setQuery({ ...query, page })}
          />
        </>
      )}
    </div>
  );
}

function RoleCheckboxes({
  idPrefix,
  value,
  onChange,
  disabledRole,
}: {
  idPrefix: string;
  value: readonly string[];
  onChange: (roles: string[]) => void;
  /** Vai trò không bỏ được (Super Admin tự gỡ quyền của chính mình). */
  disabledRole?: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {STAFF_ROLES.map((role) => {
        const id = `${idPrefix}-${role}`;
        const checked = value.includes(role);
        return (
          <label key={role} htmlFor={id} className="flex min-h-11 items-center gap-3">
            <input
              id={id}
              type="checkbox"
              className={CHECKBOX}
              checked={checked}
              disabled={role === disabledRole}
              onChange={() => onChange(checked ? value.filter((item) => item !== role) : [...value, role])}
            />
            {staffRoleLabels([role])[0]}
          </label>
        );
      })}
    </div>
  );
}

function RolesEditor({ account, currentUserId }: { account: AdminUser; currentUserId: number }) {
  const queryClient = useQueryClient();
  const [roles, setRolesDraft] = useState<string[]>(account.roles);
  const save = useMutation({
    mutationFn: () => setRoles(account.id, roles),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
  const changed = [...roles].sort().join() !== [...account.roles].sort().join();
  const isSelf = account.id === currentUserId;

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className={`${LABEL} mb-2`}>Vai trò</legend>
      <RoleCheckboxes
        idPrefix={`roles-${account.id}`}
        value={roles}
        onChange={setRolesDraft}
        disabledRole={isSelf ? "super_admin" : undefined}
      />
      {roles.every((role) => role === "customer") && (
        <p className="text-warning text-sm">
          Bỏ hết vai trò nhân viên thì tài khoản không vào được trang quản trị nữa.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" disabled={!changed || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Đang lưu…" : "Lưu vai trò"}
        </Button>
        {save.isSuccess && !changed && (
          <span role="status" className="text-success text-sm">
            Đã lưu vai trò.
          </span>
        )}
      </div>
      {save.isError && (
        <p role="alert" className={FORM_ERROR}>
          {adminErrorMessage(save.error)}
        </p>
      )}
    </fieldset>
  );
}

function CreateStaffForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateStaffValues>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: { email: "", fullName: "", password: "", roles: [] },
  });
  const roles = useWatch({ control, name: "roles" });

  return (
    <form
      noValidate
      aria-label="Thêm nhân viên"
      onSubmit={handleSubmit(async (values) => {
        try {
          await createStaff(values);
          await queryClient.invalidateQueries({ queryKey: userKeys.all });
          onClose();
        } catch (error) {
          showServerError(error, CREATE_FIELDS, setError);
        }
      })}
      className={`${CARD} flex flex-col gap-5 p-5`}
    >
      <h2 className="text-xl font-semibold">Thêm nhân viên</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="staff-email" label="Email" error={errors.email?.message}>
          <input
            type="email"
            autoComplete="off"
            className={INPUT}
            {...fieldA11y("staff-email", errors.email?.message)}
            {...register("email")}
          />
        </Field>
        <Field id="staff-name" label="Họ tên" error={errors.fullName?.message}>
          <input
            type="text"
            className={INPUT}
            {...fieldA11y("staff-name", errors.fullName?.message)}
            {...register("fullName")}
          />
        </Field>
        <Field
          id="staff-password"
          label="Mật khẩu tạm"
          hint="Tối thiểu 8 ký tự. Gửi cho nhân viên qua kênh riêng."
          error={errors.password?.message}
        >
          <input
            type="text"
            autoComplete="off"
            className={INPUT}
            {...fieldA11y("staff-password", errors.password?.message, true)}
            {...register("password")}
          />
        </Field>
      </div>
      <fieldset className="flex flex-col gap-2" aria-describedby={errors.roles ? "staff-roles-error" : undefined}>
        <legend className={`${LABEL} mb-2`}>Vai trò</legend>
        <RoleCheckboxes
          idPrefix="new-staff-role"
          value={roles}
          onChange={(next) => setValue("roles", next, { shouldValidate: true })}
        />
        {errors.roles && (
          <p id="staff-roles-error" role="alert" className="text-danger text-sm">
            {errors.roles.message}
          </p>
        )}
      </fieldset>
      <FormActions
        pending={isSubmitting}
        submitLabel="Thêm nhân viên"
        onCancel={onClose}
        error={errors.root?.server?.message}
      />
    </form>
  );
}
