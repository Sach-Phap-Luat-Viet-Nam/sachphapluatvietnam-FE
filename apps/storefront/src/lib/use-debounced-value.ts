"use client";

import { useEffect, useState } from "react";

/** Giá trị cập nhật sau khi ngừng thay đổi `delay` ms, dùng cho ô tìm kiếm để không gọi API mỗi lần gõ phím. */
export function useDebouncedValue<Value>(value: Value, delay = 300): Value {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
