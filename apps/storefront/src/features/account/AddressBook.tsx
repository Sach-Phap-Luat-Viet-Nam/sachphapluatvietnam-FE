"use client";

import { useState } from "react";
import { MapPin, Plus, RefreshCw } from "lucide-react";
import { authErrorMessage } from "@slvn/auth";
import { cn } from "@slvn/ui";
import { FORM_ERROR } from "@/components/form-styles";
import { MAX_ADDRESSES, addressLine } from "@/lib/account-api";
import type { Address, Profile } from "@/lib/account-api";
import { useAddresses, useDeleteAddress, useSetDefaultAddress } from "@/lib/use-account";
import { AddressForm } from "./AddressForm";

const LINK_BUTTON = "link-underline text-gold flex min-h-11 items-center text-sm disabled:opacity-60";

/** Đang sửa địa chỉ nào: `new` = form thêm mới, số = id địa chỉ đang sửa. */
type Editing = "new" | number | null;

function AddressCard({ address, onEdit }: { address: Address; onEdit: () => void }) {
  const setDefault = useSetDefaultAddress();
  const remove = useDeleteAddress();
  const [confirming, setConfirming] = useState(false);
  const error = setDefault.error ?? remove.error;
  const { id } = address;

  return (
    <li className="border-gold/20 flex flex-col gap-2 border-b py-4">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium">{address.recipientName}</span>
        <span className="text-mist text-sm">{address.phone}</span>
        {address.isDefault && <span className="border-gold/60 text-gold border px-2 py-0.5 text-xs">Mặc định</span>}
      </p>
      <p className="text-sand text-sm leading-6">{addressLine(address)}</p>
      <div className="flex flex-wrap items-center gap-x-5">
        <button type="button" onClick={onEdit} className={LINK_BUTTON}>
          Sửa
        </button>
        {!address.isDefault && (
          <button
            type="button"
            onClick={() => setDefault.mutate(id)}
            disabled={setDefault.isPending}
            className={LINK_BUTTON}
          >
            {setDefault.isPending ? "Đang đặt…" : "Đặt làm mặc định"}
          </button>
        )}
        {confirming ? (
          <span className="flex items-center gap-3 text-sm">
            Xóa địa chỉ này?
            <button
              type="button"
              onClick={() => remove.mutate(id)}
              disabled={remove.isPending}
              className="text-danger min-h-11 font-medium underline underline-offset-2 disabled:opacity-60"
            >
              {remove.isPending ? "Đang xóa…" : "Xóa"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="text-mist min-h-11 underline">
              Không
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className={cn(LINK_BUTTON, "text-mist")}>
            Xóa
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-danger text-sm">
          {authErrorMessage(error)}
        </p>
      )}
    </li>
  );
}

/**
 * Sổ địa chỉ giao hàng (tối đa 10), địa chỉ mặc định được chọn sẵn khi đặt hàng. Backend chưa có API thì báo tính năng
 * đang hoàn thiện, không hiện lỗi.
 */
export function AddressBook({ profile }: { profile: Profile }) {
  const { data: addresses, error, isError, unavailable, isFetching, refetch } = useAddresses();
  const [editing, setEditing] = useState<Editing>(null);

  if (unavailable) {
    return (
      <p className="border-gold/25 text-mist flex gap-3 border px-5 py-4 text-sm leading-6">
        <MapPin size={18} className="text-gold mt-0.5 shrink-0" />
        Sổ địa chỉ đang được hoàn thiện. Trong lúc chờ, bạn nhập địa chỉ giao hàng mỗi lần đặt.
      </p>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className={FORM_ERROR}>
          Chưa tải được sổ địa chỉ. {authErrorMessage(error)}
        </p>
        <button type="button" onClick={() => void refetch()} disabled={isFetching} className={cn(LINK_BUTTON, "gap-2")}>
          <RefreshCw size={15} /> Thử lại
        </button>
      </div>
    );
  }

  if (!addresses) {
    return <p className="text-mist text-sm">Đang tải sổ địa chỉ…</p>;
  }

  const full = addresses.length >= MAX_ADDRESSES;
  return (
    <div className="flex flex-col gap-4">
      {addresses.length > 0 ? (
        <ul className="border-gold/20 border-t">
          {addresses.map((address) =>
            editing === address.id ? (
              <li key={address.id} className="py-4">
                <AddressForm address={address} forceDefault={address.isDefault} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <AddressCard key={address.id} address={address} onEdit={() => setEditing(address.id)} />
            ),
          )}
        </ul>
      ) : (
        editing !== "new" && (
          <p className="text-mist text-sm">
            Chưa có địa chỉ nào. Thêm địa chỉ để lần sau đặt hàng không phải nhập lại.
          </p>
        )
      )}

      {editing === "new" ? (
        <AddressForm
          initial={{ recipientName: profile.fullName, phone: profile.phoneNumber ?? "" }}
          forceDefault={addresses.length === 0}
          onDone={() => setEditing(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing("new")}
          disabled={full}
          className="border-gold/50 text-gold hover:border-gold flex min-h-12 w-fit items-center gap-2 border px-5 transition-colors disabled:opacity-50"
        >
          <Plus size={18} /> Thêm địa chỉ
        </button>
      )}
      {full && <p className="text-mist text-sm">Đã đủ {MAX_ADDRESSES} địa chỉ. Xóa bớt để thêm địa chỉ mới.</p>}
    </div>
  );
}
