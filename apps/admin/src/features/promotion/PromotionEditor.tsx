"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { isApiError } from "@slvn/api-client";
import { PageHeader } from "@/components/PageHeader";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { StatusBadge } from "@/components/StatusBadge";
import { CARD } from "@/components/form-styles";
import { createPromotion, fetchPromotion, promotionKeys, updatePromotion } from "./api";
import { CouponManager } from "./CouponManager";
import { promotionStatusLabel, promotionStatusTone } from "./labels";
import { emptyPromotionForm, promotionToFormValues } from "./promotion-form";
import type { PromotionBody } from "./promotion-form";
import { PromotionForm } from "./PromotionForm";
import { PromotionStatsPanel } from "./PromotionStatsPanel";
import type { PromotionFormValues } from "./schemas";

const LIST_PATH = "/khuyen-mai";

function BackLink() {
  return (
    <Link href={LIST_PATH} className="text-muted hover:text-foreground flex min-h-11 w-fit items-center gap-2">
      <ArrowLeft size={16} aria-hidden="true" /> Danh sách khuyến mãi
    </Link>
  );
}

function PromotionPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackLink />
        <PageHeader title={title} description={description} />
      </div>
      {children}
    </div>
  );
}

/** Lưu xong thì làm mới danh sách. */
function useRefreshLists() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: promotionKeys.lists });
}

export function PromotionCreate() {
  const router = useRouter();
  const refresh = useRefreshLists();
  // Tính một lần khi mở trang để thời điểm bắt đầu mặc định không đổi mỗi lần render.
  const [defaultValues] = useState(() => emptyPromotionForm());

  return (
    <PromotionPage title="Thêm khuyến mãi">
      <section className={`${CARD} p-5 sm:p-6`}>
        <PromotionForm
          defaultValues={defaultValues}
          submitLabel="Tạo khuyến mãi"
          onCancel={() => router.push(LIST_PATH)}
          onSave={async (body) => {
            const created = await createPromotion(body);
            await refresh();
            // Chương trình dùng mã cần thêm mã ngay: mở trang sửa thay vì quay về danh sách.
            router.push(body.mode === "coupon" ? `${LIST_PATH}/${created.id}` : LIST_PATH);
          }}
        />
      </section>
    </PromotionPage>
  );
}

export function PromotionEdit({ promotionId }: { promotionId: number }) {
  const promotion = useQuery({
    queryKey: promotionKeys.detail(promotionId),
    queryFn: () => fetchPromotion(promotionId),
  });

  if (promotion.isPending) {
    return <LoadingStatus />;
  }
  if (promotion.isError) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <ErrorStatus
          error={promotion.error}
          overrides={{ NOT_FOUND: "Không tìm thấy khuyến mãi này, có thể đã bị xóa." }}
          onRetry={
            isApiError(promotion.error) && promotion.error.status === 404 ? undefined : () => void promotion.refetch()
          }
        />
      </div>
    );
  }
  const { data } = promotion;
  return (
    <PromotionEditForm
      promotionId={promotionId}
      name={data.name}
      status={data.status}
      isCoupon={data.mode === "coupon"}
      defaultValues={promotionToFormValues(data)}
    />
  );
}

interface PromotionEditFormProps {
  promotionId: number;
  name: string;
  status: string;
  isCoupon: boolean;
  defaultValues: PromotionFormValues;
}

function PromotionEditForm({ promotionId, name, status, isCoupon, defaultValues }: PromotionEditFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const refresh = useRefreshLists();

  const save = async (body: PromotionBody) => {
    queryClient.setQueryData(promotionKeys.detail(promotionId), await updatePromotion(promotionId, body));
    await refresh();
    router.push(LIST_PATH);
  };

  return (
    <PromotionPage
      title={`Sửa khuyến mãi “${name}”`}
      description={<StatusBadge tone={promotionStatusTone(status)}>{promotionStatusLabel(status)}</StatusBadge>}
    >
      <PromotionStatsPanel promotionId={promotionId} />
      <section className={`${CARD} p-5 sm:p-6`}>
        <PromotionForm
          defaultValues={defaultValues}
          submitLabel="Lưu khuyến mãi"
          onCancel={() => router.push(LIST_PATH)}
          onSave={save}
        />
      </section>
      {isCoupon && <CouponManager promotionId={promotionId} />}
    </PromotionPage>
  );
}
