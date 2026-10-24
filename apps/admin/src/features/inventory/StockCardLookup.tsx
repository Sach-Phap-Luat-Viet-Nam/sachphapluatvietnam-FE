"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { CARD, LABEL } from "@/components/form-styles";
import { SkuPicker } from "./SkuPicker";

/** Chọn SKU để mở thẻ kho (xem tồn, lô in, lịch sử; đặt ngưỡng; xuất hủy/biếu tặng). */
export function StockCardLookup() {
  const router = useRouter();
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Thẻ kho & xuất kho"
        description="Chọn SKU để xem tồn theo lô in, lịch sử nhập xuất, đặt ngưỡng tồn thấp hoặc xuất hủy hàng lỗi, biếu tặng. Cũng mở được bằng cách bấm mã SKU ở phiếu nhập hoặc danh sách tồn thấp."
      />
      <div className={`${CARD} flex flex-col gap-2 p-5`}>
        <label htmlFor="stock-card-sku" className={LABEL}>
          Tìm SKU
        </label>
        <SkuPicker
          id="stock-card-sku"
          value={null}
          onChange={(option) => {
            if (option) {
              router.push(`/kho/the-kho/${option.id}`);
            }
          }}
        />
      </div>
    </div>
  );
}
