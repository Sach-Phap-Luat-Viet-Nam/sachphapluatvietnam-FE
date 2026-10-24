"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@slvn/ui";
import { formatDiscount, formatPrice } from "@slvn/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { CARD } from "@/components/form-styles";
import { addSku, updateSku } from "./api";
import { availableCoverTypes, skuToPriceValues } from "./forms";
import { COVER_TYPE_LABELS, enumLabel } from "./labels";
import type { Edition } from "./schemas";
import { SkuCreateForm, SkuPriceForm } from "./SkuForms";
import { useSaveBook } from "./use-save-book";

export interface SkuTableProps {
  edition: Edition;
}

/** SKU (loại bìa + giá) của một ấn bản. Tồn kho (`inStock`) do module Kho quản lý, ở đây chỉ hiển thị. */
export function SkuTable({ edition }: SkuTableProps) {
  const saveBook = useSaveBook();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const coverTypes = availableCoverTypes(edition);
  const editing = edition.skus.find((sku) => sku.id === editingId);

  return (
    <section aria-label="SKU" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-semibold">SKU (loại bìa và giá)</h4>
        {coverTypes.length > 0 && !adding && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
          >
            <Plus size={16} aria-hidden="true" /> Thêm SKU
          </Button>
        )}
      </div>

      {edition.skus.length === 0 ? (
        <p className="text-muted text-sm">Chưa có SKU: ấn bản chưa có giá nên chưa bán được.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-xl text-left text-sm">
            <caption className="sr-only">SKU của ấn bản {edition.editionName ?? edition.isbn}</caption>
            <thead className="border-border text-muted border-b">
              <tr>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Mã SKU
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Loại bìa
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">
                  Giá bìa
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">
                  Giá bán
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Kho
                </th>
                <th scope="col" className="py-2 font-medium">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {edition.skus.map((sku) => (
                <tr key={sku.id} className="border-border border-b last:border-b-0">
                  <td className="py-2 pr-3 font-medium">{sku.skuCode}</td>
                  <td className="py-2 pr-3">{enumLabel(COVER_TYPE_LABELS, sku.coverType)}</td>
                  <td className="py-2 pr-3 text-right">{formatPrice(sku.listPrice)}</td>
                  <td className="py-2 pr-3 text-right">
                    {formatPrice(sku.salePrice)}
                    {formatDiscount(sku.discountPercent) && (
                      <span className="text-accent ml-1">{formatDiscount(sku.discountPercent)}</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <StatusBadge tone={sku.inStock ? "success" : "neutral"}>
                      {sku.inStock ? "Còn hàng" : "Hết hàng"}
                    </StatusBadge>
                  </td>
                  <td className="py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Sửa giá ${sku.skuCode}`}
                      onClick={() => {
                        setEditingId(sku.id);
                        setAdding(false);
                      }}
                    >
                      <Pencil size={16} aria-hidden="true" /> Sửa giá
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className={`${CARD} flex flex-col gap-4 p-4`}>
          <h5 className="font-semibold">Sửa giá {editing.skuCode}</h5>
          <SkuPriceForm
            key={editing.id}
            defaultValues={skuToPriceValues(editing)}
            onCancel={() => setEditingId(null)}
            onSave={async (body) => {
              saveBook(await updateSku(editing.id, body));
              setEditingId(null);
            }}
          />
        </div>
      )}

      {adding && coverTypes.length > 0 && (
        <div className={`${CARD} flex flex-col gap-4 p-4`}>
          <h5 className="font-semibold">Thêm SKU</h5>
          <SkuCreateForm
            coverTypes={coverTypes}
            onCancel={() => setAdding(false)}
            onSave={async (body) => {
              saveBook(await addSku(edition.id, body));
              setAdding(false);
            }}
          />
        </div>
      )}
    </section>
  );
}
