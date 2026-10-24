"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { cn } from "@slvn/ui";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { CARD } from "@/components/form-styles";
import { LOW_STOCK_PAGE_SIZE, fetchLowStock, inventoryKeys } from "./api";

const TH = "px-4 py-3 font-medium";

/** SKU có tồn khả dụng ≤ ngưỡng, tồn thấp nhất trước; bấm mã SKU để mở thẻ kho. */
export function LowStockList() {
  const [page, setPage] = useState(1);
  const lowStock = useQuery({
    queryKey: inventoryKeys.lowStock(page),
    queryFn: () => fetchLowStock(page),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tồn thấp"
        description="SKU có tồn khả dụng bằng hoặc dưới ngưỡng cảnh báo (mặc định 50 cuốn, đổi ở thẻ kho). SKU chưa từng nhập kho không nằm trong danh sách này."
      />
      {lowStock.isError ? (
        <ErrorStatus error={lowStock.error} onRetry={() => void lowStock.refetch()} />
      ) : lowStock.isPending ? (
        <LoadingStatus />
      ) : lowStock.data.items.length === 0 ? (
        <p className={`${CARD} text-muted p-6`}>Không có SKU nào dưới ngưỡng tồn thấp.</p>
      ) : (
        <>
          <div className={`${CARD} overflow-x-auto`}>
            <table className="w-full min-w-2xl text-left">
              <caption className="sr-only">SKU tồn thấp</caption>
              <thead className="border-border text-muted border-b text-sm">
                <tr>
                  <th scope="col" className={TH}>
                    SKU
                  </th>
                  <th scope="col" className={TH}>
                    Tên sách
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    Khả dụng
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    Đang giữ
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    Ngưỡng
                  </th>
                </tr>
              </thead>
              <tbody>
                {lowStock.data.items.map((item) => (
                  <tr key={item.skuId} className="border-border border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <Link href={`/kho/the-kho/${item.skuId}`} className="text-primary font-medium hover:underline">
                        {item.skuCode}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{item.bookTitle}</td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right font-semibold tabular-nums",
                        item.available === 0 ? "text-danger" : "text-warning",
                      )}
                    >
                      {item.available.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{item.reserved.toLocaleString("vi-VN")}</td>
                    <td className="text-muted px-4 py-3 text-right tabular-nums">
                      {item.lowStockThreshold.toLocaleString("vi-VN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={lowStock.data.meta.page}
            limit={lowStock.data.meta.limit || LOW_STOCK_PAGE_SIZE}
            total={lowStock.data.meta.total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
