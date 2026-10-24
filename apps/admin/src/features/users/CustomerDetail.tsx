"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@slvn/ui";
import { formatDate } from "@slvn/utils";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PageHeader } from "@/components/PageHeader";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { StatusBadge } from "@/components/StatusBadge";
import { CARD, FORM_ERROR, FORM_SUCCESS } from "@/components/form-styles";
import { adminErrorMessage } from "@/lib/admin-errors";
import { customerKeys, fetchCustomer, logoutEverywhere, resetPassword, setActive } from "./api";
import { ImpersonateButton } from "./ImpersonateButton";
import { OCCUPATION_LABELS } from "./labels";
import { PasswordForm } from "./UserForms";

const NOT_FOUND = { USER_NOT_FOUND: "Không tìm thấy khách hàng này (hoặc tài khoản không phải khách hàng)." };

type Notice = { ok: boolean; message: string } | null;

/** Chi tiết khách: hồ sơ, sổ địa chỉ, thông tin hóa đơn và các thao tác hỗ trợ (giống màn Nhân viên). */
export function CustomerDetail({ customerId }: { customerId: number }) {
  const queryClient = useQueryClient();
  const customer = useQuery({ queryKey: customerKeys.detail(customerId), queryFn: () => fetchCustomer(customerId) });
  const [notice, setNotice] = useState<Notice>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: customerKeys.all });
  const fail = (error: unknown) => setNotice({ ok: false, message: adminErrorMessage(error) });

  const active = useMutation({
    mutationFn: (value: boolean) => setActive(customerId, value),
    onSuccess: async (user) => {
      setNotice({
        ok: true,
        message: user.isActive ? "Đã kích hoạt lại tài khoản." : "Đã vô hiệu hóa tài khoản và đăng xuất mọi thiết bị.",
      });
      await refresh();
    },
    onError: fail,
  });
  const logout = useMutation({
    mutationFn: () => logoutEverywhere(customerId),
    onSuccess: (count) =>
      setNotice({
        ok: true,
        message: `Đã đăng xuất ${count} phiên. Token đang dùng hết hạn trong tối đa 15 phút.`,
      }),
    onError: fail,
  });

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <Link href="/khach-hang" className="text-primary flex min-h-11 w-fit items-center gap-2 hover:underline">
        <ArrowLeft size={18} aria-hidden="true" /> Danh sách khách hàng
      </Link>

      {customer.isError ? (
        <ErrorStatus error={customer.error} onRetry={() => void customer.refetch()} overrides={NOT_FOUND} />
      ) : customer.isPending ? (
        <LoadingStatus />
      ) : (
        (() => {
          const { account, addresses, invoiceInfo } = customer.data;
          return (
            <>
              <PageHeader
                title={account.fullName}
                description={account.email}
                actions={
                  account.isActive ? (
                    <StatusBadge tone="success">Hoạt động</StatusBadge>
                  ) : (
                    <StatusBadge tone="danger">Đã vô hiệu hóa</StatusBadge>
                  )
                }
              />

              <section aria-labelledby="customer-actions" className={`${CARD} flex flex-col gap-4 p-5`}>
                <h2 id="customer-actions" className="text-xl font-semibold">
                  Hỗ trợ tài khoản
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  {account.isActive && <ImpersonateButton account={account} onResult={setNotice} />}
                  {!changingPassword && (
                    <Button variant="outline" size="sm" onClick={() => setChangingPassword(true)}>
                      Đặt mật khẩu
                    </Button>
                  )}
                  {account.isActive ? (
                    <ConfirmButton
                      question={`Vô hiệu hóa ${account.fullName}? Tài khoản bị đăng xuất và không đăng nhập lại được.`}
                      confirmLabel="Vô hiệu hóa"
                      pending={active.isPending}
                      onConfirm={() => active.mutate(false)}
                    >
                      Vô hiệu hóa
                    </ConfirmButton>
                  ) : (
                    <Button variant="outline" size="sm" disabled={active.isPending} onClick={() => active.mutate(true)}>
                      Kích hoạt lại
                    </Button>
                  )}
                  <ConfirmButton
                    question={`Đăng xuất ${account.fullName} khỏi mọi thiết bị?`}
                    confirmLabel="Đăng xuất"
                    pending={logout.isPending}
                    onConfirm={() => logout.mutate()}
                  >
                    Đăng xuất hộ
                  </ConfirmButton>
                </div>
                {changingPassword && (
                  <PasswordForm
                    user={account}
                    onCancel={() => setChangingPassword(false)}
                    onSave={async ({ newPassword }) => {
                      await resetPassword(customerId, newPassword);
                      setChangingPassword(false);
                      setNotice({ ok: true, message: "Đã đặt mật khẩu mới và đăng xuất mọi thiết bị của khách." });
                    }}
                  />
                )}
                {notice && (
                  <p role={notice.ok ? "status" : "alert"} className={notice.ok ? FORM_SUCCESS : FORM_ERROR}>
                    {notice.message}
                  </p>
                )}
              </section>

              <section aria-labelledby="customer-profile" className={`${CARD} flex flex-col gap-4 p-5`}>
                <h2 id="customer-profile" className="text-xl font-semibold">
                  Hồ sơ
                </h2>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <Info label="Số điện thoại" value={account.phoneNumber} />
                  <Info label="Ngày sinh" value={formatDate(account.birthDate)} />
                  <Info
                    label="Nghề nghiệp"
                    value={account.occupation ? (OCCUPATION_LABELS[account.occupation] ?? account.occupation) : null}
                  />
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
