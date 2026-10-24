"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { catalogKeys } from "./api";
import type { AdminBook } from "./schemas";

/**
 * Các API sửa đầu sách/ấn bản/SKU trả lại toàn bộ đầu sách: thay cache màn chi tiết bằng response và đánh dấu
 * danh sách đầu sách cần tải lại (số ấn bản, trạng thái, thời điểm sửa đã đổi).
 */
export function useSaveBook(): (book: AdminBook) => void {
  const queryClient = useQueryClient();
  return useCallback(
    (book: AdminBook) => {
      queryClient.setQueryData(catalogKeys.book(book.id), book);
      void queryClient.invalidateQueries({ queryKey: catalogKeys.bookLists });
    },
    [queryClient],
  );
}
