"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import { buttonClassName } from "@slvn/ui";
import { formatDateTime } from "@slvn/utils";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { StatusBadge } from "@/components/StatusBadge";
import { CARD, FORM_ERROR } from "@/components/form-styles";
import { adminErrorMessage } from "@/lib/admin-errors";
import { deleteStaticPage, fetchStaticPages, STATIC_PAGES_PAGE_SIZE, staticPageKeys } from "./api";
import { storefrontPageUrl } from "./storefront-url";

export const STATIC_PAGES_PATH = "/noi-dung/trang-tinh";

/** Danh sách trang tĩnh (điều khoản, chính sách...), sắp theo đường dẫn. */
export function StaticPageList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pages = useQuery({
    queryKey: staticPageKeys.list(page),
    queryFn: () => fetchStaticPages(page),
    placeholderData: keepPreviousData,
  });
  const remove = useMutation({
    mutationFn: deleteStaticPage,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staticPageKeys.lists }),
  });

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <PageHeader
        title="Trang tĩnh"
        description="Điều khoản, chính sách và các trang thông tin trên website. Sửa xong website cập nhật sau khoảng 1 phút."
        actions={
          <Link href={`${STATIC_PAGES_PATH}/tao-moi`} className={buttonClassName()}>
            <Plus size={18} aria-hidden="true" /> Thêm trang
          </Link>
        }
      />

      {remove.isError && (
        <p role="alert" className={FORM_ERROR}>
          {adminErrorMessage(remove.error)}
        </p>
      )}

      {pages.isError ? (
        <ErrorStatus error={pages.error} onRetry={() => void pages.refetch()} />
      ) : pages.isPending ? (
        <LoadingStatus />
      ) : pages.data.items.length === 0 ? (
        <p className={`${CARD} text-muted p-6`}>Chưa có trang nào. Bấm “Thêm trang” để tạo.</p>
      ) : (
        <>
          <ul aria-label="Danh sách trang tĩnh" className={`${CARD} divide-border divide-y`}>
            {pages.data.items.map((item) => {
              const publicUrl = item.isPublished ? storefrontPageUrl(item.slug) : null;
              return (
                <li key={item.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{item.title}</span>
                      <StatusBadge tone={item.isPublished ? "success" : "neutral"}>
                        {item.isPublished ? "Đang hiển thị" : "Chưa xuất bản"}
                      </StatusBadge>
                    </div>
                    <span className="text-muted text-sm break-all">/{item.slug}</span>
                    <span className="text-muted text-sm">Sửa lần cuối {formatDateTime(item.updatedAt)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {publicUrl && (
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonClassName({ variant: "ghost", size: "sm" })}
                      >
                        <ExternalLink size={16} aria-hidden="true" /> Xem
                        <span className="sr-only"> trang {item.title} trên website (mở tab mới)</span>
                      </a>
                    )}
                    <Link
                      href={`${STATIC_PAGES_PATH}/${item.id}`}
                      aria-label={`Sửa trang ${item.title}`}
                      className={buttonClassName({ variant: "ghost", size: "sm" })}
                    >
                      <Pencil size={16} aria-hidden="true" /> Sửa
                    </Link>
                    <ConfirmButton
                      question={`Xóa trang “${item.title}”? Link /${item.slug} sẽ không mở được nữa.`}
                      confirmLabel="Xóa"
                      pending={remove.isPending && remove.variables === item.id}
                      onConfirm={() => remove.mutate(item.id)}
                    >
                      Xóa
                    </ConfirmButton>
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination
            page={pages.data.meta.page}
            limit={pages.data.meta.limit || STATIC_PAGES_PAGE_SIZE}
            total={pages.data.meta.total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
