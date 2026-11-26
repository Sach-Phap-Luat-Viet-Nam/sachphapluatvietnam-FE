"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { isApiError } from "@slvn/api-client";
import { formatDateTime } from "@slvn/utils";
import { PageHeader } from "@/components/PageHeader";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { StatusBadge } from "@/components/StatusBadge";
import { CARD } from "@/components/form-styles";
import { createStaticPage, fetchStaticPage, staticPageKeys, updateStaticPage } from "./api";
import { emptyStaticPageForm, staticPageToFormValues } from "./static-page-form";
import type { StaticPageBody } from "./static-page-form";
import { StaticPageForm } from "./StaticPageForm";
import { STATIC_PAGES_PATH } from "./StaticPageList";
import type { AdminStaticPage } from "./schemas";

function BackLink() {
  return (
    <Link
      href={STATIC_PAGES_PATH}
      className="text-muted hover:text-foreground flex min-h-11 w-fit items-center gap-2"
    >
      <ArrowLeft size={16} aria-hidden="true" /> Danh sách trang tĩnh
    </Link>
  );
}

/** Lưu xong thì làm mới danh sách và quay về. */
function useFinish() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: staticPageKeys.lists });
    router.push(STATIC_PAGES_PATH);
  };
}

export function StaticPageCreate() {
  const router = useRouter();
  const finish = useFinish();
  const [defaultValues] = useState(emptyStaticPageForm);

  return (
    <EditorPage title="Thêm trang tĩnh">
      <StaticPageForm
        isNew
        defaultValues={defaultValues}
        submitLabel="Tạo trang"
        onCancel={() => router.push(STATIC_PAGES_PATH)}
        onSave={async (body) => {
          await createStaticPage(body);
          await finish();
        }}
      />
    </EditorPage>
  );
}

export function StaticPageEdit({ pageId }: { pageId: number }) {
  const page = useQuery({ queryKey: staticPageKeys.detail(pageId), queryFn: () => fetchStaticPage(pageId) });

  if (page.isPending) {
    return <LoadingStatus />;
  }
  if (page.isError) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <ErrorStatus
          error={page.error}
          overrides={{ NOT_FOUND: "Không tìm thấy trang này, có thể đã bị xóa." }}
          onRetry={isApiError(page.error) && page.error.status === 404 ? undefined : () => void page.refetch()}
        />
      </div>
    );
  }
  // `key` theo lần sửa: dữ liệu mới từ máy chủ thì dựng lại form và trình soạn thảo với nội dung mới.
  return <StaticPageEditForm key={page.data.updatedAt} page={page.data} />;
}

function StaticPageEditForm({ page }: { page: AdminStaticPage }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const finish = useFinish();
  const [defaultValues] = useState(() => staticPageToFormValues(page));

  const save = async (body: StaticPageBody) => {
    queryClient.setQueryData(staticPageKeys.detail(page.id), await updateStaticPage(page.id, body));
    await finish();
  };

  return (
    <EditorPage
      title={`Sửa trang “${page.title}”`}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={page.isPublished ? "success" : "neutral"}>
            {page.isPublished ? "Đang hiển thị" : "Chưa xuất bản"}
          </StatusBadge>
          <span>Sửa lần cuối {formatDateTime(page.updatedAt)}</span>
        </span>
      }
    >
      <StaticPageForm
        defaultValues={defaultValues}
        submitLabel="Lưu trang"
        onCancel={() => router.push(STATIC_PAGES_PATH)}
        onSave={save}
      />
    </EditorPage>
  );
}

function EditorPage({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackLink />
        <PageHeader title={title} description={description} />
      </div>
      <section className={`${CARD} p-5 sm:p-6`}>{children}</section>
    </div>
  );
}
