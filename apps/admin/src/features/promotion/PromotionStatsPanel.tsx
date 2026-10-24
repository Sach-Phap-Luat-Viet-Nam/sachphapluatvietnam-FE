"use client";

import { useQuery } from "@tanstack/react-query";
import { formatPrice } from "@slvn/utils";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { CARD } from "@/components/form-styles";
import { fetchPromotionStats, promotionKeys } from "./api";

/** Thống kê sử dụng của một chương trình (`GET /admin/promotions/{id}/stats`). */
export function PromotionStatsPanel({ promotionId }: { promotionId: number }) {
  const stats = useQuery({
    queryKey: promotionKeys.stats(promotionId),
    queryFn: () => fetchPromotionStats(promotionId),
  });

  return (
    <section aria-labelledby="promotion-stats-title" className={`${CARD} flex flex-col gap-4 p-5 sm:p-6`}>
      <h2 id="promotion-stats-title" className="text-lg font-semibold">
        Thống kê sử dụng
      </h2>
      {stats.isPending ? (
        <LoadingStatus />
      ) : stats.isError ? (
        <ErrorStatus error={stats.error} onRetry={() => void stats.refetch()} />
      ) : (
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Stat term="Lượt đã dùng" value={stats.data.usedCount} />
          <Stat term="Lượt đã hoàn" value={stats.data.releasedCount} />
          <Stat term="Khách đã dùng" value={stats.data.uniqueCustomers} />
          <Stat term="Tổng tiền giảm đơn" value={formatPrice(stats.data.totalOrderDiscount)} />
          <Stat term="Tổng tiền giảm ship" value={formatPrice(stats.data.totalShippingDiscount)} />
        </dl>
      )}
    </section>
  );
}

function Stat({ term, value }: { term: string; value: number | string }) {
  return (
    <div className="bg-surface rounded-md px-4 py-3">
      <dt className="text-muted text-sm">{term}</dt>
      <dd className="mt-1 text-xl font-semibold">
        {typeof value === "number" ? value.toLocaleString("vi-VN") : value}
      </dd>
    </div>
  );
}
