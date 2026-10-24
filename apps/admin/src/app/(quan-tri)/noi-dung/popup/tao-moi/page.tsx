import type { Metadata } from "next";
import { PopupCreate } from "@/features/popup/PopupEditor";

export const metadata: Metadata = { title: "Thêm popup" };

export default function CreatePopupPage() {
  return <PopupCreate />;
}
