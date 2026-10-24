import type { Metadata } from "next";
import { Container } from "@slvn/ui";
import { MyOrder } from "@/features/ordering/MyOrder";

interface OrderPageProps {
  params: Promise<{ ma: string }>;
}

/** Mã đơn từ URL, viết hoa. Segment có `%` lỗi (gõ tay) thì dùng nguyên văn thay vì để `URIError` làm hỏng trang. */
function orderCodeFromParam(param: string): string {
  try {
    return decodeURIComponent(param).trim().toUpperCase();
  } catch (error) {
    if (!(error instanceof URIError)) throw error;
    return param.trim().toUpperCase();
  }
}

export async function generateMetadata({ params }: OrderPageProps): Promise<Metadata> {
  const { ma } = await params;
  return { title: `Đơn hàng ${orderCodeFromParam(ma)}`, robots: { index: false, follow: false } };
}

export default async function OrderPage({ params }: OrderPageProps) {
  const code = orderCodeFromParam((await params).ma);
  return (
    <main id="noi-dung">
      <Container className="pt-8 pb-20 sm:pt-10">
        <h1 className="font-editorial motion-rise text-[36px] leading-[1.1] font-extrabold tracking-tight break-all sm:text-[48px]">
          Đơn hàng <span className="text-gold font-medium">{code}</span>
        </h1>
        <div className="mt-6 sm:mt-8">
          {/* Dữ liệu cần access token trong bộ nhớ trình duyệt nên tải ở client. */}
          <MyOrder code={code} />
        </div>
      </Container>
    </main>
  );
}
