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
import { createPopup, fetchPopup, popupKeys, updatePopup } from "./api";
import { popupStatusLabel, popupStatusTone } from "./labels";
import { emptyPopupForm, popupToFormValues } from "./popup-form";
import type { PopupBody } from "./popup-form";
import { PopupForm } from "./PopupForm";
import type { PopupFormValues } from "./schemas";

const LIST_PATH = "/noi-dung/popup";

function BackLink() {
  return (
    <Link href={LIST_PATH} className="text-muted hover:text-foreground flex min-h-11 w-fit items-center gap-2">
      <ArrowLeft size={16} aria-hidden="true" /> Danh sách popup
    </Link>
  );
}

/** Lưu xong thì làm mới danh sách và quay về. */
function useFinish() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: popupKeys.lists });
    router.push(LIST_PATH);
  };
}

export function PopupCreate() {
  const router = useRouter();
  const finish = useFinish();
  // Tính một lần khi mở trang để thời điểm bắt đầu mặc định không đổi mỗi lần render.
  const [defaultValues] = useState(() => emptyPopupForm());

  return (
    <PopupPage title="Thêm popup">
      <PopupForm
        defaultValues={defaultValues}
        submitLabel="Tạo popup"
        onCancel={() => router.push(LIST_PATH)}
        onSave={async (body) => {
          await createPopup(body);
          await finish();
        }}
      />
    </PopupPage>
  );
}

export function PopupEdit({ popupId }: { popupId: number }) {
  const popup = useQuery({ queryKey: popupKeys.detail(popupId), queryFn: () => fetchPopup(popupId) });

  if (popup.isPending) {
    return <LoadingStatus />;
  }
  if (popup.isError) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <ErrorStatus
          error={popup.error}
          overrides={{ NOT_FOUND: "Không tìm thấy popup này, có thể đã bị xóa." }}
          onRetry={isApiError(popup.error) && popup.error.status === 404 ? undefined : () => void popup.refetch()}
        />
      </div>
    );
  }
  return (
    <PopupEditForm
      popupId={popupId}
      title={popup.data.title}
      status={popup.data.status}
      defaultValues={popupToFormValues(popup.data)}
    />
  );
}

interface PopupEditFormProps {
  popupId: number;
  title: string;
  status: string;
  defaultValues: PopupFormValues;
}

function PopupEditForm({ popupId, title, status, defaultValues }: PopupEditFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const finish = useFinish();

  const save = async (body: PopupBody) => {
    queryClient.setQueryData(popupKeys.detail(popupId), await updatePopup(popupId, body));
    await finish();
  };

  return (
    <PopupPage
      title={`Sửa popup “${title}”`}
      description={<StatusBadge tone={popupStatusTone(status)}>{popupStatusLabel(status)}</StatusBadge>}
    >
      <PopupForm
        defaultValues={defaultValues}
        submitLabel="Lưu popup"
        onCancel={() => router.push(LIST_PATH)}
        onSave={save}
      />
    </PopupPage>
  );
}

function PopupPage({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackLink />
        <PageHeader title={title} description={description} />
      </div>
      <section className={`${CARD} p-5 sm:p-6`}>{children}</section>
    </div>
  );
}
