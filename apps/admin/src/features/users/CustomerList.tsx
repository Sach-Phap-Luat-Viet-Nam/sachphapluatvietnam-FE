"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { formatDateTime } from "@slvn/utils";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { StatusBadge } from "@/components/StatusBadge";
import { CARD } from "@/components/form-styles";
import { fetchCustomers, USERS_PAGE_SIZE, userKeys } from "./api";
import { accountStatus } from "./labels";
import { UserSearch } from "./UserSearch";

/** Danh sách khách hàng, mới đăng ký trước; tìm theo email, họ tên, số điện thoại. */
export function CustomerList() {
  const [query, setQuery] = useState({ q: "", page: 1 });
  const customers = useQuery({
    queryKey: userKeys.customers(query),
    queryFn: () => fetchCustomers(query),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Khách hàng"
        description="Tài khoản khách đã đăng ký trên website. Mở chi tiết để xem sổ địa chỉ, khóa tài khoản hoặc đăng nhập hộ."
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
          <div className={`${CARD} overflow-x-auto`}>
            <table className="w-full min-w-2xl text-left">
              <caption className="sr-only">Danh sách khách hàng</caption>
              <thead className="border-border text-muted border-b text-sm">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Khách hàng
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Số điện thoại
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Trạng thái
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Ngày đăng ký
                  </th>
                </tr>
              </thead>
              <tbody>
                {customers.data.items.map((customer) => {
                  const status = accountStatus(customer);
                  return (
                    <tr key={customer.id} className="border-border border-b last:border-b-0">
                      <td className="px-4 py-3">
                        <Link href={`/khach-hang/${customer.id}`} className="text-primary font-medium hover:underline">
                          {customer.fullName}
                        </Link>
                        <span className="text-muted block text-sm break-all">{customer.email}</span>
                      </td>
                      <td className="px-4 py-3">{customer.phoneNumber ?? "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                      </td>
                      <td className="text-muted px-4 py-3 text-sm">{formatDateTime(customer.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={customers.data.meta.page}
            limit={customers.data.meta.limit || USERS_PAGE_SIZE}
            total={customers.data.meta.total}
            onPageChange={(page) => setQuery({ ...query, page })}
          />
        </>
      )}
    </div>
  );
}
