"use client";

import { useState } from "react";
import { vnDateKey } from "@slvn/utils";
import { createReceipt } from "./api";
import { emptyReceiptLine } from "./forms";
import { ReceiptForm } from "./ReceiptForm";

/** Lập phiếu nhập nháp nhiều dòng (mỗi dòng là một lô in); lưu xong mở màn chi tiết phiếu. */
export function ReceiptCreate() {
  // Ngày nhập mặc định là hôm nay theo giờ Việt Nam; tính một lần để thêm dòng mới dùng cùng ngày.
  const [today] = useState(() => vnDateKey(new Date()));
  return (
    <ReceiptForm
      title="Lập phiếu nhập kho"
      description="Mỗi dòng là một lô in của một SKU. Phiếu lưu ở trạng thái “Chờ duyệt”; tồn kho chỉ tăng khi Super Admin duyệt."
      backHref="/kho"
      backLabel="Danh sách phiếu nhập"
      initialValues={{ note: "", lines: [emptyReceiptLine(today)] }}
      submitLabel="Lưu phiếu nhập"
      save={createReceipt}
    />
  );
}
