"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { buttonClassName } from "@slvn/ui";
import { formatDateTime } from "@slvn/utils";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { StatusBadge } from "@/components/StatusBadge";
import { CARD, FORM_ERROR } from "@/components/form-styles";
import { adminErrorMessage } from "@/lib/admin-errors";
import { isPreviewableImageUrl, optimizedImageUrl } from "@/lib/image-upload";
import { deletePopup, fetchPopups, POPUPS_PAGE_SIZE, popupKeys } from "./api";
import { displayFrequencyLabel, popupStatusLabel, popupStatusTone } from "./labels";

/** Danh sách popup quảng cáo, sắp theo độ ưu tiên. */
export function PopupList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const popups = useQuery({
    queryKey: popupKeys.list(page),
    queryFn: () => fetchPopups(page),
    placeholderData: keepPreviousData,
  });
  const remove = useMutation({
    mutationFn: deletePopup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: popupKeys.lists }),
  });

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <PageHeader
        title="Popup quảng cáo"
        description="Website hiện một popup đang chạy có độ ưu tiên cao nhất."
        actions={
          <Link href="/noi-dung/popup/tao-moi" className={buttonClassName()}>
            <Plus size={18} aria-hidden="true" /> Thêm popup
          </Link>
        }
      />

      {remove.isError && (
        <p role="alert" className={FORM_ERROR}>
          {adminErrorMessage(remove.error)}
        </p>
      )}

      {popups.isError ? (
        <ErrorStatus error={popups.error} onRetry={() => void popups.refetch()} />
      ) : popups.isPending ? (
        <LoadingStatus />
      ) : popups.data.items.length === 0 ? (
        <p className={`${CARD} text-muted p-6`}>Chưa có popup nào. Bấm “Thêm popup” để tạo.</p>
      ) : (
        <>
          <ul aria-label="Danh sách popup" className={`${CARD} divide-border divide-y`}>
            {popups.data.items.map((popup) => (
              <li key={popup.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div className="bg-surface border-border flex size-20 shrink-0 items-center justify-center overflow-hidden rounded border">
                  {isPreviewableImageUrl(popup.imageUrl) && (
                    <Image
                      src={optimizedImageUrl(popup.imageUrl)}
                      alt=""
                      width={80}
                      height={80}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{popup.title}</span>
                    <StatusBadge tone={popupStatusTone(popup.status)}>{popupStatusLabel(popup.status)}</StatusBadge>
                  </div>
                  <span className="text-muted text-sm">
                    {formatDateTime(popup.startsAt)} → {popup.endsAt ? formatDateTime(popup.endsAt) : "đến khi tắt"}
                  </span>
                  <span className="text-muted text-sm">
                    Ưu tiên {popup.priority} · {displayFrequencyLabel(popup.displayFrequency)}
                    {popup.linkUrl && ` · ${popup.linkUrl}`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/noi-dung/popup/${popup.id}`}
                    aria-label={`Sửa popup ${popup.title}`}
                    className={buttonClassName({ variant: "ghost", size: "sm" })}
                  >
                    <Pencil size={16} aria-hidden="true" /> Sửa
                  </Link>
                  <ConfirmButton
                    question={`Xóa popup “${popup.title}”?`}
                    confirmLabel="Xóa"
                    pending={remove.isPending && remove.variables === popup.id}
                    onConfirm={() => remove.mutate(popup.id)}
                  >
                    Xóa
                  </ConfirmButton>
                </div>
              </li>
            ))}
          </ul>
          <Pagination
            page={popups.data.meta.page}
            limit={popups.data.meta.limit || POPUPS_PAGE_SIZE}
            total={popups.data.meta.total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
