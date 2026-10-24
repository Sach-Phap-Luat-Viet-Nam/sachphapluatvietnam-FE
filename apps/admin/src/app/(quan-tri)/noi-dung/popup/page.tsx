import type { Metadata } from "next";
import { PopupList } from "@/features/popup/PopupList";

export const metadata: Metadata = { title: "Popup quảng cáo" };

export default function PopupsPage() {
  return <PopupList />;
}
