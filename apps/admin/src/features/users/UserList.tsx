"use client";

import { useState, useSyncExternalStore } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { getServerSessionState, getSessionState, subscribeSession } from "@slvn/auth";
import { Button } from "@slvn/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { StatusBadge } from "@/components/StatusBadge";
import { CARD, FORM_ERROR, FORM_SUCCESS } from "@/components/form-styles";
import { adminErrorMessage } from "@/lib/admin-errors";
import { roleLabel } from "@/lib/roles";
import {
  createStaff,
  fetchStaff,
  logoutEverywhere,
  resetPassword,
  setActive,
  setRoles,
  STAFF_PAGE_SIZE,
  staffKeys,
} from "./api";
import type { StaffUser } from "./schemas";
import { canManage, toCreateStaffBody, toSetRolesBody } from "./user-forms";
import { CreateStaffForm, PasswordForm, RolesForm } from "./UserForms";
import { ImpersonateButton } from "./ImpersonateButton";
import { UserSearch } from "./UserSearch";

/** Đang mở form nào dưới một dòng. */
type Panel = { id: number; kind: "roles" | "password" } | null;

/** Quản lý nhân viên (chỉ Super Admin): thêm mới, đổi vai trò, đặt mật khẩu, vô hiệu hóa và đăng xuất hộ. */
export function UserList() {
  const queryClient = useQueryClient();
  const session = useSyncExternalStore(subscribeSession, getSessionState, getServerSessionState);
  const currentUserId = session.status === "authenticated" ? session.user.id : null;
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [impersonationError, setImpersonationError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const staff = useQuery({
    queryKey: staffKeys.list(page, q),
    queryFn: () => fetchStaff(page, q),
    placeholderData: keepPreviousData,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: staffKeys.lists });

  const create = useMutation({ mutationFn: createStaff, onSuccess: refresh });
  const roles = useMutation({
    mutationFn: ({ user, staffRoles }: { user: StaffUser; staffRoles: Parameters<typeof toSetRolesBody>[1] }) =>
      setRoles(user.id, toSetRolesBody(user, staffRoles).roles),
    onSuccess: refresh,
  });
  const password = useMutation({
    mutationFn: ({ id, newPassword }: { id: number; newPassword: string }) => resetPassword(id, newPassword),
  });
  const active = useMutation({
    mutationFn: ({ id, value }: { id: number; value: boolean }) => setActive(id, value),
    onSuccess: refresh,
  });
  const logout = useMutation({ mutationFn: logoutEverywhere });
  const actionError = active.error ?? logout.error;
  const actionErrorMessage = actionError ? adminErrorMessage(actionError) : impersonationError;

  const closePanel = () => setPanel(null);

  if (currentUserId === null) {
    return null;
  }

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <PageHeader
        title="Nhân viên"
        description="Tài khoản nhân viên và vai trò. Chỉ Super Admin vào được phần này."
        actions={
          !creating && (
            <Button
              onClick={() => {
                setCreating(true);
                setNotice(null);
              }}
            >
              <Plus size={18} aria-hidden="true" /> Thêm nhân viên
            </Button>
          )
        }
      />

      {notice && (
        <p role="status" className={FORM_SUCCESS}>
          {notice}
        </p>
      )}
      {actionErrorMessage && (
        <p role="alert" className={FORM_ERROR}>
          {actionErrorMessage}
        </p>
      )}

      {creating && (
        <section aria-labelledby="them-nhan-vien" className={`${CARD} flex flex-col gap-5 p-5`}>
          <h2 id="them-nhan-vien" className="text-xl font-semibold">
            Thêm nhân viên
          </h2>
          <CreateStaffForm
            onCancel={() => setCreating(false)}
            onSave={async (values) => {
              const created = await create.mutateAsync(toCreateStaffBody(values));
              setCreating(false);
              setNotice(`Đã thêm ${created.fullName}. Anh/chị báo mật khẩu tạm cho nhân viên.`);
            }}
          />
        </section>
      )}

      <UserSearch
        id="staff-search"
        label="Tìm nhân viên"
        onSearch={(value) => {
          setQ(value);
          setPage(1);
        }}
      />

      {staff.isError ? (
        <ErrorStatus error={staff.error} onRetry={() => void staff.refetch()} />
      ) : staff.isPending ? (
        <LoadingStatus />
      ) : staff.data.items.length === 0 ? (
        <p className={`${CARD} text-muted p-6`}>{q ? "Không có nhân viên phù hợp." : "Chưa có nhân viên nào."}</p>
      ) : (
        <>
          <ul aria-label="Danh sách nhân viên" className={`${CARD} divide-border divide-y`}>
            {staff.data.items.map((user) => {
              const manageable = canManage(user, currentUserId);
              const isSelf = user.id === currentUserId;
              return (
                <li key={user.id} className="flex flex-col gap-4 p-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{user.fullName}</span>
                      {isSelf && <StatusBadge tone="info">Bạn</StatusBadge>}
                      {!user.isActive && <StatusBadge tone="danger">Đã vô hiệu hóa</StatusBadge>}
                      {user.requiresTwoFactorSetup ? (
                        <StatusBadge tone="warning">Chưa bật 2FA</StatusBadge>
                      ) : (
                        <StatusBadge tone="success">Đã bật 2FA</StatusBadge>
                      )}
                    </div>
                    <span className="text-muted text-sm">{user.email}</span>
                    <span className="text-muted text-sm">
                      Vai trò:{" "}
                      {user.roles
                        .filter((role) => role !== "customer")
                        .map(roleLabel)
                        .join(", ") || "Chưa có"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Không đổi vai trò của chính mình hay Super Admin khác (backend trả `CANNOT_MANAGE_USER`). */}
                    {manageable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Đổi vai trò của ${user.fullName}`}
                        onClick={() => setPanel({ id: user.id, kind: "roles" })}
                      >
                        Đổi vai trò
                      </Button>
                    )}
                    {manageable && user.isActive && (
                      <ImpersonateButton
                        account={user}
                        onResult={(result) => {
                          setNotice(result.ok ? result.message : null);
                          setImpersonationError(result.ok ? null : result.message);
                        }}
                      />
                    )}
                    {manageable && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Đặt mật khẩu mới cho ${user.fullName}`}
                          onClick={() => setPanel({ id: user.id, kind: "password" })}
                        >
                          Đặt mật khẩu
                        </Button>
                        {user.isActive ? (
                          <ConfirmButton
                            question={`Vô hiệu hóa ${user.fullName}? Tài khoản bị đăng xuất và không đăng nhập lại được.`}
                            confirmLabel="Vô hiệu hóa"
                            pending={active.isPending && active.variables?.id === user.id}
                            onConfirm={() => {
                              setNotice(null);
                              active.mutate({ id: user.id, value: false });
                            }}
                          >
                            Vô hiệu hóa
                          </ConfirmButton>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label={`Kích hoạt lại ${user.fullName}`}
                            disabled={active.isPending && active.variables?.id === user.id}
                            onClick={() => {
                              setNotice(null);
                              active.mutate({ id: user.id, value: true });
                            }}
                          >
                            Kích hoạt lại
                          </Button>
                        )}
                      </>
                    )}
                    {!isSelf && (
                      <ConfirmButton
                        question={`Đăng xuất ${user.fullName} khỏi mọi thiết bị?`}
                        confirmLabel="Đăng xuất"
                        pending={logout.isPending && logout.variables === user.id}
                        onConfirm={() =>
                          logout.mutate(user.id, {
                            onSuccess: (count) =>
                              setNotice(
                                `Đã đăng xuất ${user.fullName} (${count} phiên). Token đang dùng hết hạn trong tối đa 15 phút.`,
                              ),
                          })
                        }
                      >
                        Đăng xuất hộ
                      </ConfirmButton>
                    )}
                  </div>

                  {panel?.id === user.id && panel.kind === "roles" && (
                    <RolesForm
                      user={user}
                      onCancel={closePanel}
                      onSave={async ({ roles: staffRoles }) => {
                        await roles.mutateAsync({ user, staffRoles });
                        closePanel();
                        setNotice(`Đã cập nhật vai trò của ${user.fullName}.`);
                      }}
                    />
                  )}
                  {panel?.id === user.id && panel.kind === "password" && (
                    <PasswordForm
                      user={user}
                      onCancel={closePanel}
                      onSave={async ({ newPassword }) => {
                        await password.mutateAsync({ id: user.id, newPassword });
                        closePanel();
                        setNotice(`Đã đặt mật khẩu mới cho ${user.fullName} và đăng xuất mọi thiết bị của họ.`);
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
          <Pagination
            page={staff.data.meta.page}
            limit={staff.data.meta.limit || STAFF_PAGE_SIZE}
            total={staff.data.meta.total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
