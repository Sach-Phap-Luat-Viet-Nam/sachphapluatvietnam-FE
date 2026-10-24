"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search } from "lucide-react";
import { buttonClassName } from "@slvn/ui";
import { formatDateTime, formatPrice } from "@slvn/utils";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { StatusBadge } from "@/components/StatusBadge";
import { CARD, FORM_ERROR, INPUT } from "@/components/form-styles";
import { adminErrorMessage } from "@/lib/admin-errors";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { deletePromotion, fetchPromotions, PROMOTIONS_PAGE_SIZE, promotionKeys } from "./api";
import { promotionStatusLabel, promotionStatusTone } from "./labels";
import { benefitText } from "./summary";

/** Danh sách chương trình khuyến mãi: tìm theo tên, trạng thái tính theo giờ hiện tại, sửa, xóa mềm. */
export function PromotionList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim(), 400);
  const promotions = useQuery({
    queryKey: promotionKeys.list(page, q),
    queryFn: () => fetchPromotions(page, q),
    placeholderData: keepPreviousData,
  });
  const remove = useMutation({
    mutationFn: deletePromotion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: promotionKeys.lists }),
  });

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <PageHeader
        title="Khuyến mãi"
        description="Chương trình giảm giá đơn và giảm phí vận chuyển. Mỗi đơn áp tối đa một chương trình giảm đơn và một chương trình giảm phí ship."
        actions={
          <Link href="/khuyen-mai/tao-moi" className={buttonClassName()}>
            <Plus size={18} aria-hidden="true" /> Thêm khuyến mãi
          </Link>
        }
      />

      <div className="relative max-w-md">
        <label htmlFor="promotion-search" className="sr-only">
          Tìm khuyến mãi theo tên
        </label>
        <Search size={18} aria-hidden="true" className="text-muted absolute top-1/2 left-3.5 -translate-y-1/2" />
        <input
          id="promotion-search"
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Tìm theo tên chương trình"
          className={`${INPUT} pl-10`}
        />
      </div>

      {remove.isError && (
        <p role="alert" className={FORM_ERROR}>
          {adminErrorMessage(remove.error)}
        </p>
      )}

      {promotions.isError ? (
        <ErrorStatus error={promotions.error} onRetry={() => void promotions.refetch()} />
      ) : promotions.isPending ? (
        <LoadingStatus />
      ) : promotions.data.items.length === 0 ? (
        <p className={`${CARD} text-muted p-6`}>
          {q ? "Không có chương trình nào khớp." : "Chưa có khuyến mãi nào. Bấm “Thêm khuyến mãi” để tạo."}
        </p>
      ) : (
        <>
          <ul aria-label="Danh sách khuyến mãi" className={`${CARD} divide-border divide-y`}>
            {promotions.data.items.map((promotion) => (
              <li key={promotion.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{promotion.name}</span>
                    <StatusBadge tone={promotionStatusTone(promotion.status)}>
                      {promotionStatusLabel(promotion.status)}
                    </StatusBadge>
                    {!promotion.isPublic && <StatusBadge tone="neutral">Không công khai</StatusBadge>}
                  </div>
                  <span className="text-muted text-sm">
                    {benefitText(promotion)}
                    {promotion.minOrderAmount > 0 && ` · đơn từ ${formatPrice(promotion.minOrderAmount)}`}
                    {promotion.mode === "coupon" && ` · ${promotion.couponCount} mã`}
                  </span>
                  <span className="text-muted text-sm">
                    {formatDateTime(promotion.startsAt)} →{" "}
                    {promotion.endsAt ? formatDateTime(promotion.endsAt) : "chưa có hạn"} · đã dùng{" "}
                    {promotion.usedCount}
                    {promotion.usageLimit ? `/${promotion.usageLimit}` : ""} lượt
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/khuyen-mai/${promotion.id}`}
                    aria-label={`Sửa khuyến mãi ${promotion.name}`}
                    className={buttonClassName({ variant: "ghost", size: "sm" })}
                  >
                    <Pencil size={16} aria-hidden="true" /> Sửa
                  </Link>
                  <ConfirmButton
                    question={`Xóa khuyến mãi “${promotion.name}”?`}
                    confirmLabel="Xóa"
                    pending={remove.isPending && remove.variables === promotion.id}
                    onConfirm={() => remove.mutate(promotion.id)}
                  >
                    Xóa
                  </ConfirmButton>
                </div>
              </li>
            ))}
          </ul>
          <Pagination
            page={promotions.data.meta.page}
            limit={promotions.data.meta.limit || PROMOTIONS_PAGE_SIZE}
            total={promotions.data.meta.total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
