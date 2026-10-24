"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { buttonClassName } from "@slvn/ui";
import { formatDateTime } from "@slvn/utils";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { StatusBadge } from "@/components/StatusBadge";
import { CARD, SELECT } from "@/components/form-styles";
import { enumLabel } from "@/lib/enum-label";
import { RECEIPTS_PAGE_SIZE, fetchReceipts, inventoryKeys } from "./api";
import { receiptTotals } from "./forms";
import { RECEIPT_STATUS_LABELS, RECEIPT_STATUSES, receiptStatusTone } from "./labels";

const TH = "px-4 py-3 font-medium";

/** Danh sách phiếu nhập kho, mới nhất trước, lọc theo trạng thái. */
export function ReceiptList() {
  const [query, setQuery] = useState({ status: "", page: 1 });
  const receipts = useQuery({
    queryKey: inventoryKeys.receipts(query),
    queryFn: () => fetchReceipts(query),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Phiếu nhập kho"
        description="Thủ kho lập phiếu, Super Admin duyệt thì tồn kho mới tăng. Người duyệt phải khác người lập phiếu."
        actions={
          <Link href="/kho/phieu-nhap/tao-moi" className={buttonClassName()}>
            <Plus size={18} aria-hidden="true" /> Lập phiếu nhập
          </Link>
        }
      />

      <div className="flex flex-col gap-2 sm:w-60">
        <label htmlFor="receipt-status-filter" className="text-base font-medium">
          Trạng thái
        </label>
        <select
          id="receipt-status-filter"
          value={query.status}
          onChange={(event) => setQuery({ status: event.target.value, page: 1 })}
          className={SELECT}
        >
          <option value="">Tất cả</option>
          {RECEIPT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {RECEIPT_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      {receipts.isError ? (
        <ErrorStatus error={receipts.error} onRetry={() => void receipts.refetch()} />
      ) : receipts.isPending ? (
        <LoadingStatus />
      ) : receipts.data.items.length === 0 ? (
        <p className={`${CARD} text-muted p-6`}>
          {query.status ? "Không có phiếu nhập nào ở trạng thái này." : "Chưa có phiếu nhập nào."}
        </p>
      ) : (
        <>
          <div className={`${CARD} overflow-x-auto`}>
            <table className="w-full min-w-2xl text-left">
              <caption className="sr-only">Danh sách phiếu nhập kho</caption>
              <thead className="border-border text-muted border-b text-sm">
                <tr>
                  <th scope="col" className={TH}>
                    Phiếu
                  </th>
                  <th scope="col" className={TH}>
                    Trạng thái
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    Số dòng
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    Số cuốn
                  </th>
                  <th scope="col" className={TH}>
                    Ghi chú
                  </th>
                  <th scope="col" className={TH}>
                    Ngày lập
                  </th>
                </tr>
              </thead>
              <tbody>
                {receipts.data.items.map((receipt) => (
                  <tr key={receipt.id} className="border-border border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/kho/phieu-nhap/${receipt.id}`}
                        className="text-primary font-medium whitespace-nowrap hover:underline"
                      >
                        Phiếu #{receipt.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={receiptStatusTone(receipt.status)}>
                        {enumLabel(RECEIPT_STATUS_LABELS, receipt.status)}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{receipt.lines.length}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {receiptTotals(receipt.lines).quantity.toLocaleString("vi-VN")}
                    </td>
                    <td className="text-muted max-w-64 truncate px-4 py-3">{receipt.note}</td>
                    <td className="text-muted px-4 py-3 text-sm whitespace-nowrap">
                      {formatDateTime(receipt.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={receipts.data.meta.page}
            limit={receipts.data.meta.limit || RECEIPTS_PAGE_SIZE}
            total={receipts.data.meta.total}
            onPageChange={(page) => setQuery({ ...query, page })}
          />
        </>
      )}
    </div>
  );
}
