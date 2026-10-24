"use client";

import { useState, useSyncExternalStore } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getServerSessionState, getSessionState, subscribeSession } from "@slvn/auth";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { CARD } from "@/components/form-styles";
import { customerKeys, fetchCustomers, STAFF_PAGE_SIZE } from "./api";
import { UserCard } from "./UserCard";
import { UserSearch } from "./UserSearch";

/**
 * Danh sách khách hàng (chỉ Super Admin), mới đăng ký trước; tìm theo email, họ tên, số điện thoại. Cùng bố cục và cùng
 * thao tác hỗ trợ với màn Nhân viên (`UserList`) qua `UserCard`, trừ đổi vai trò (khách không có vai trò để đổi).
 */
export function CustomerList() {
  const session = useSyncExternalStore(subscribeSession, getSessionState, getServerSessionState);
  const currentUserId = session.status === "authenticated" ? session.user.id : null;
  const [query, setQuery] = useState({ q: "", page: 1 });
  const customers = useQuery({
    queryKey: customerKeys.list(query.page, query.q),
    queryFn: () => fetchCustomers(query.page, query.q),
    placeholderData: keepPreviousData,
  });

  if (currentUserId === null) {
    return null;
  }

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <PageHeader
        title="Khách hàng"
        description="Tài khoản khách đã đăng ký trên website, mới nhất trước. Mở chi tiết để xem sổ địa chỉ và thông tin hóa đơn."
      />

      <UserSearch id="customer-search" label="Tìm khách hàng" onSearch={(q) => setQuery({ q, page: 1 })} />

      {customers.isError ? (
        <ErrorStatus error={customers.error} onRetry={() => void customers.refetch()} />
      ) : customers.isPending ? (
        <LoadingStatus />
      ) : customers.data.items.length === 0 ? (
        <p className={`${CARD} text-muted p-6`}>
          {query.q ? "Không có khách hàng phù hợp." : "Chưa có khách hàng nào đăng ký."}
        </p>
      ) : (
        <>
          <ul aria-label="Danh sách khách hàng" className="flex flex-col gap-3">
            {customers.data.items.map((customer) => (
              <UserCard key={customer.id} account={customer} kind="customer" currentUserId={currentUserId} />
            ))}
          </ul>
          <Pagination
            page={customers.data.meta.page}
            limit={customers.data.meta.limit || STAFF_PAGE_SIZE}
            total={customers.data.meta.total}
            onPageChange={(page) => setQuery({ ...query, page })}
          />
        </>
      )}
    </div>
  );
}
