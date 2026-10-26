"use client";

import { useQuery } from "@tanstack/react-query";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { fetchReceipt, inventoryKeys, updateReceipt } from "./api";
import { receiptToFormValues } from "./forms";
import { ReceiptForm } from "./ReceiptForm";

const NOT_FOUND = { NOT_FOUND: "Không tìm thấy phiếu nhập này." };

/** Sửa phiếu nhập nháp: cùng form với lập phiếu, lưu xong về lại chi tiết phiếu. */
export function ReceiptEdit({ receiptId }: { receiptId: number }) {
  const receipt = useQuery({ queryKey: inventoryKeys.receipt(receiptId), queryFn: () => fetchReceipt(receiptId) });
  if (receipt.isError) {
    return <ErrorStatus error={receipt.error} onRetry={() => void receipt.refetch()} overrides={NOT_FOUND} />;
  }
  if (receipt.isPending) {
    return <LoadingStatus />;
  }
  if (receipt.data.status !== "draft") {
    return (
      <p role="alert" className="text-danger">
        Phiếu này đã được duyệt hoặc từ chối nên không sửa được.
      </p>
    );
  }
  return (
    <ReceiptForm
      title={`Sửa phiếu nhập #${receipt.data.id}`}
      description="Sửa ghi chú và các lô của phiếu đang chờ duyệt. Tồn kho chỉ tăng khi Super Admin duyệt."
      backHref={`/kho/phieu-nhap/${receipt.data.id}`}
      backLabel={`Phiếu nhập #${receipt.data.id}`}
      initialValues={receiptToFormValues(receipt.data)}
      submitLabel="Lưu thay đổi"
      save={(body) => updateReceipt(receiptId, body)}
    />
  );
}
