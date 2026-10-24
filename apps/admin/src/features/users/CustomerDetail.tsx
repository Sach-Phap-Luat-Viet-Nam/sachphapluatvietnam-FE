"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { getServerSessionState, getSessionState, subscribeSession } from "@slvn/auth";
import { formatDate, formatDateTime } from "@slvn/utils";
import { PageHeader } from "@/components/PageHeader";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { StatusBadge } from "@/components/StatusBadge";
import { CARD } from "@/components/form-styles";
import { AccountActions } from "./AccountActions";
import { fetchCustomer, userKeys } from "./api";
import { accountStatus, OCCUPATION_LABELS } from "./labels";

const NOT_FOUND = { USER_NOT_FOUND: "Không tìm thấy khách hàng này (hoặc tài khoản không phải khách hàng)." };

/** Chi tiết khách: hồ sơ, sổ địa chỉ, thông tin hóa đơn và các thao tác hỗ trợ. */
export function CustomerDetail({ customerId }: { customerId: number }) {
  const session = useSyncExternalStore(subscribeSession, getSessionState, getServerSessionState);
  const customer = useQuery({ queryKey: userKeys.customer(customerId), queryFn: () => fetchCustomer(customerId) });

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <Link href="/khach-hang" className="text-primary flex min-h-11 w-fit items-center gap-2 hover:underline">
        <ArrowLeft size={18} aria-hidden="true" /> Danh sách khách hàng
      </Link>

      {customer.isError ? (
        <ErrorStatus error={customer.error} onRetry={() => void customer.refetch()} overrides={NOT_FOUND} />
      ) : customer.isPending || session.status !== "authenticated" ? (
        <LoadingStatus />
      ) : (
        (() => {
          const { account, addresses, invoiceInfo } = customer.data;
          const status = accountStatus(account);
          return (
            <>
              <PageHeader
                title={account.fullName}
                description={account.email}
                actions={<StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
              />

              <section aria-labelledby="customer-actions" className={`${CARD} flex flex-col gap-4 p-5`}>
                <h2 id="customer-actions" className="text-xl font-semibold">
                  Hỗ trợ tài khoản
                </h2>
                <AccountActions account={account} currentUserId={session.user.id} />
              </section>

              <section aria-labelledby="customer-profile" className={`${CARD} flex flex-col gap-4 p-5`}>
                <h2 id="customer-profile" className="text-xl font-semibold">
                  Hồ sơ
                </h2>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <Info label="Số điện thoại" value={account.phoneNumber} />
                  <Info label="Ngày sinh" value={formatDate(customer.data.birthDate)} />
                  <Info
                    label="Nghề nghiệp"
                    value={
                      customer.data.occupation
                        ? (OCCUPATION_LABELS[customer.data.occupation] ?? customer.data.occupation)
                        : null
                    }
                  />
                  <Info label="Ngày đăng ký" value={formatDateTime(account.createdAt)} />
                </dl>
              </section>

              <section aria-labelledby="customer-addresses" className={`${CARD} flex flex-col gap-4 p-5`}>
                <h2 id="customer-addresses" className="text-xl font-semibold">
                  Sổ địa chỉ
                </h2>
                {addresses.length === 0 ? (
                  <p className="text-muted">Khách chưa lưu địa chỉ nào.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {addresses.map((address) => (
                      <li key={address.id} className="border-border flex flex-col gap-1 rounded-md border p-4">
                        <p className="flex flex-wrap items-center gap-2 font-medium">
                          {address.recipientName} · {address.phone}
                          {address.isDefault && <StatusBadge tone="info">Mặc định</StatusBadge>}
                        </p>
                        <p className="text-muted">
                          {address.streetAddress}, {address.ward}, {address.province}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="customer-invoice" className={`${CARD} flex flex-col gap-4 p-5`}>
                <h2 id="customer-invoice" className="text-xl font-semibold">
                  Thông tin xuất hóa đơn
                </h2>
                {invoiceInfo ? (
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <Info label="Tên công ty" value={invoiceInfo.companyName} />
                    <Info label="Mã số thuế" value={invoiceInfo.taxCode} />
                    <Info label="Địa chỉ" value={invoiceInfo.address} />
                    <Info label="Email nhận hóa đơn" value={invoiceInfo.email} />
                  </dl>
                ) : (
                  <p className="text-muted">Khách chưa lưu thông tin xuất hóa đơn.</p>
                )}
              </section>
            </>
          );
        })()
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-muted text-sm">{label}</dt>
      <dd>{value ?? "—"}</dd>
    </div>
  );
}
