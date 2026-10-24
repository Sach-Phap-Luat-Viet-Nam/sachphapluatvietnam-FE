"use client";

import { useState, useSyncExternalStore } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { getServerSessionState, getSessionState, subscribeSession } from "@slvn/auth";
import { Button } from "@slvn/ui";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { CARD, FORM_SUCCESS } from "@/components/form-styles";
import { createStaff, fetchStaff, STAFF_PAGE_SIZE, staffKeys } from "./api";
import { toCreateStaffBody } from "./user-forms";
import { CreateStaffForm } from "./UserForms";
import { UserCard } from "./UserCard";
import { UserSearch } from "./UserSearch";

/**
 * Quản lý nhân viên (chỉ Super Admin): tìm kiếm, thêm mới, và trên từng dòng đổi vai trò, đặt mật khẩu, vô hiệu hóa,
 * đăng xuất hộ, đăng nhập hộ. Cùng bố cục với màn Khách hàng (`CustomerList`) qua `UserCard`.
 */
export function UserList() {
  const queryClient = useQueryClient();
  const session = useSyncExternalStore(subscribeSession, getSessionState, getServerSessionState);
  const currentUserId = session.status === "authenticated" ? session.user.id : null;
  const [query, setQuery] = useState({ q: "", page: 1 });
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const staff = useQuery({
    queryKey: staffKeys.list(query.page, query.q),
    queryFn: () => fetchStaff(query.page, query.q),
    placeholderData: keepPreviousData,
  });
  const create = useMutation({
    mutationFn: createStaff,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffKeys.lists }),
  });

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

      <UserSearch id="staff-search" label="Tìm nhân viên" onSearch={(q) => setQuery({ q, page: 1 })} />

      {staff.isError ? (
        <ErrorStatus error={staff.error} onRetry={() => void staff.refetch()} />
      ) : staff.isPending ? (
        <LoadingStatus />
      ) : staff.data.items.length === 0 ? (
        <p className={`${CARD} text-muted p-6`}>{query.q ? "Không có nhân viên phù hợp." : "Chưa có nhân viên nào."}</p>
      ) : (
        <>
          <ul aria-label="Danh sách nhân viên" className="flex flex-col gap-3">
            {staff.data.items.map((user) => (
              <UserCard key={user.id} account={user} kind="staff" currentUserId={currentUserId} />
            ))}
          </ul>
          <Pagination
            page={staff.data.meta.page}
            limit={staff.data.meta.limit || STAFF_PAGE_SIZE}
            total={staff.data.meta.total}
            onPageChange={(page) => setQuery({ ...query, page })}
          />
        </>
      )}
    </div>
  );
}
