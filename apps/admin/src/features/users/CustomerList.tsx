"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { StatusBadge } from "@/components/StatusBadge";
import { CARD } from "@/components/form-styles";
import { customerKeys, fetchCustomers, STAFF_PAGE_SIZE } from "./api";
import { UserSearch } from "./UserSearch";

/** Danh sách khách hàng, mới đăng ký trước; tìm theo email, họ tên, số điện thoại. */
export function CustomerList() {
  const [query, setQuery] = useState({ q: "", page: 1 });
  const customers = useQuery({
    queryKey: customerKeys.list(query.page, query.q),
    queryFn: () => fetchCustomers(query.page, query.q),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <PageHeader
        title="Khách hàng"
        description="Tài khoản khách đã đăng ký trên website. Mở chi tiết để xem sổ địa chỉ, đặt mật khẩu, vô hiệu hóa hoặc đăng nhập hộ."
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
            <table className="w-full min-w-xl text-left">
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
                </tr>
              </thead>
              <tbody>
                {customers.data.items.map((customer) => (
                  <tr key={customer.id} className="border-border border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <Link href={`/khach-hang/${customer.id}`} className="text-primary font-medium hover:underline">
                        {customer.fullName}
                      </Link>
                      <span className="text-muted block text-sm break-all">{customer.email}</span>
                    </td>
                    <td className="px-4 py-3">{customer.phoneNumber ?? "—"}</td>
                    <td className="px-4 py-3">
                      {customer.isActive ? (
                        <StatusBadge tone="success">Hoạt động</StatusBadge>
                      ) : (
                        <StatusBadge tone="danger">Đã vô hiệu hóa</StatusBadge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
