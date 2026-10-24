"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@slvn/ui";
import { INPUT } from "@/components/form-styles";

export interface UserSearchProps {
  id: string;
  label: string;
  onSearch: (q: string) => void;
}

/** Ô tìm theo email, họ tên hoặc số điện thoại; tìm khi bấm Tìm (không gọi API mỗi lần gõ phím). */
export function UserSearch({ id, label, onSearch }: UserSearchProps) {
  const [draft, setDraft] = useState("");
  return (
    <form
      role="search"
      aria-label={label}
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(draft.trim());
      }}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex flex-1 flex-col gap-2">
        <label htmlFor={id} className="text-base font-medium">
          Email, họ tên hoặc số điện thoại
        </label>
        <input
          id={id}
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className={INPUT}
        />
      </div>
      <Button type="submit" size="lg" variant="outline">
        <Search size={18} aria-hidden="true" /> Tìm
      </Button>
    </form>
  );
}
