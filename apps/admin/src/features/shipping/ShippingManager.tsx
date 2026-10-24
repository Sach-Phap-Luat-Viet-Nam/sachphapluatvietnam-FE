"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@slvn/ui";
import { PROVINCES, formatPrice } from "@slvn/utils";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PageHeader } from "@/components/PageHeader";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { StatusBadge } from "@/components/StatusBadge";
import { CARD, FORM_ERROR } from "@/components/form-styles";
import { adminErrorMessage } from "@/lib/admin-errors";
import {
  createZone,
  deleteZone,
  fetchShippingSettings,
  fetchZones,
  saveShippingSettings,
  shippingKeys,
  updateZone,
} from "./api";
import { SettingsForm } from "./SettingsForm";
import { emptyZoneForm, zoneToFormValues } from "./shipping-form";
import type { ZoneBody } from "./shipping-form";
import type { Zone } from "./schemas";
import { ZoneForm } from "./ZoneForm";

/** `null`: đóng; `"new"`: thêm vùng; còn lại: sửa vùng đó. */
type Editing = null | "new" | Zone;

/** Vận chuyển: cấu hình chung và các vùng giao hàng (`/admin/shipping`). */
export function ShippingManager() {
  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <PageHeader
        title="Vận chuyển"
        description="Phí vận chuyển tính theo vùng và trọng lượng đơn. Khách ở tỉnh không thuộc vùng nào sẽ không đặt hàng được."
      />
      <SettingsSection />
      <ZonesSection />
    </div>
  );
}

function SettingsSection() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: shippingKeys.settings, queryFn: fetchShippingSettings });

  return (
    <section aria-labelledby="shipping-settings-title" className={`${CARD} flex flex-col gap-5 p-5 sm:p-6`}>
      <h2 id="shipping-settings-title" className="text-lg font-semibold">
        Cấu hình chung
      </h2>
      {settings.isPending ? (
        <LoadingStatus />
      ) : settings.isError ? (
        <ErrorStatus error={settings.error} onRetry={() => void settings.refetch()} />
      ) : (
        <SettingsForm
          settings={settings.data}
          onSave={async (body) => {
            const saved = await saveShippingSettings(body);
            queryClient.setQueryData(shippingKeys.settings, saved);
            return saved;
          }}
        />
      )}
    </section>
  );
}

function ZonesSection() {
  const queryClient = useQueryClient();
  const zones = useQuery({ queryKey: shippingKeys.zones, queryFn: fetchZones });
  const [editing, setEditing] = useState<Editing>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: shippingKeys.zones });
  const remove = useMutation({ mutationFn: deleteZone, onSuccess: refresh });

  const list = zones.data ?? [];
  const editingId = typeof editing === "object" && editing !== null ? editing.id : null;
  // Tỉnh của các vùng khác: mỗi tỉnh chỉ thuộc một vùng.
  const takenBy = new Map(
    list
      .filter((zone) => zone.id !== editingId)
      .flatMap((zone) => zone.provinces.map((name) => [name, zone.name] as const)),
  );
  const covered = new Set(list.filter((zone) => zone.isActive).flatMap((zone) => zone.provinces));
  const uncovered = PROVINCES.filter((name) => !covered.has(name));

  const save = async (body: ZoneBody) => {
    if (editing === "new") {
      await createZone(body);
    } else if (editing) {
      await updateZone(editing.id, body);
    }
    await refresh();
    setEditing(null);
  };

  return (
    <section aria-labelledby="shipping-zones-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="shipping-zones-title" className="text-lg font-semibold">
          Vùng giao hàng
        </h2>
        {editing === null && (
          <Button onClick={() => setEditing("new")}>
            <Plus size={18} aria-hidden="true" /> Thêm vùng
          </Button>
        )}
      </div>

      {remove.isError && (
        <p role="alert" className={FORM_ERROR}>
          {adminErrorMessage(remove.error)}
        </p>
      )}

      {editing !== null && (
        <div className={`${CARD} p-5 sm:p-6`}>
          <h3 className="mb-4 text-lg font-semibold">
            {editing === "new" ? "Thêm vùng" : `Sửa vùng “${editing.name}”`}
          </h3>
          <ZoneForm
            // Đổi vùng đang sửa thì dựng lại form với dữ liệu của vùng đó.
            key={editing === "new" ? "new" : editing.id}
            defaultValues={editing === "new" ? emptyZoneForm(list.length) : zoneToFormValues(editing)}
            submitLabel={editing === "new" ? "Tạo vùng" : "Lưu vùng"}
            takenBy={takenBy}
            firstZone={editing === "new" && list.length === 0}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {zones.isPending ? (
        <LoadingStatus />
      ) : zones.isError ? (
        <ErrorStatus error={zones.error} onRetry={() => void zones.refetch()} />
      ) : list.length === 0 ? (
        <p className={`${CARD} text-muted p-6`}>
          Chưa có vùng nào: mọi đơn đang tính phí cố định theo cấu hình chung. Bấm “Thêm vùng” để tạo biểu phí theo
          vùng.
        </p>
      ) : (
        <>
          {uncovered.length > 0 && (
            <p role="status" className="bg-warning-surface text-warning rounded-md px-4 py-3 text-sm leading-6">
              Còn {uncovered.length}/{PROVINCES.length} tỉnh/thành chưa thuộc vùng nào đang bật, khách ở các nơi này sẽ
              không đặt hàng được: {uncovered.join(", ")}.
            </p>
          )}
          <ul aria-label="Danh sách vùng giao hàng" className={`${CARD} divide-border divide-y`}>
            {list.map((zone) => (
              <li key={zone.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{zone.name}</span>
                    <StatusBadge tone={zone.isActive ? "success" : "neutral"}>
                      {zone.isActive ? "Đang bật" : "Đang tắt"}
                    </StatusBadge>
                  </div>
                  <span className="text-muted text-sm">
                    {formatPrice(zone.baseFee)} cho {zone.baseWeightGram} g đầu, thêm {formatPrice(zone.stepFee)} mỗi{" "}
                    {zone.stepWeightGram} g · giao {zone.etaMinDays}–{zone.etaMaxDays} ngày
                  </span>
                  <span className="text-muted text-sm">
                    {zone.provinces.length} tỉnh/thành: {zone.provinces.join(", ")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Sửa vùng ${zone.name}`}
                    onClick={() => setEditing(zone)}
                  >
                    <Pencil size={16} aria-hidden="true" /> Sửa
                  </Button>
                  <ConfirmButton
                    question={`Xóa vùng “${zone.name}” và danh sách tỉnh của vùng?`}
                    confirmLabel="Xóa"
                    pending={remove.isPending && remove.variables === zone.id}
                    onConfirm={() => remove.mutate(zone.id)}
                  >
                    Xóa
                  </ConfirmButton>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
