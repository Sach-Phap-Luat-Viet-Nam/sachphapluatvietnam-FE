import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PopupEdit } from "@/features/popup/PopupEditor";

export const metadata: Metadata = { title: "Sửa popup" };

export default async function PopupPage({ params }: PageProps<"/noi-dung/popup/[id]">) {
  const { id } = await params;
  // Id popup là số nguyên dương; chuỗi khác thì 404 luôn, không gọi API.
  if (!/^[1-9]\d{0,15}$/.test(id)) {
    notFound();
  }
  return <PopupEdit popupId={Number(id)} />;
}
