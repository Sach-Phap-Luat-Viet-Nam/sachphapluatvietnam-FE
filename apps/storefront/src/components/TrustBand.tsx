import { Container } from "@slvn/ui";

// Chỉ nêu điều đã có trong hệ thống: ISBN/QĐXB (FR-21), nhãn "Cập nhật đến" (FR-22), phí ship và thanh toán (BR-14).
const PROMISES = [
  { title: "ISBN và số QĐXB", text: "In trên từng cuốn, tra được nguồn gốc xuất bản." },
  { title: "Cập nhật đến đâu", text: "Mỗi ấn bản ghi rõ văn bản đã được cập nhật." },
  { title: "Miễn phí từ 300.000đ", text: "Thanh toán khi nhận hàng hoặc chuyển khoản." },
];

export function TrustBand() {
  return (
    <Container className="motion-reveal pt-6 pb-20 sm:pb-24">
      <div className="border-gold/30 grid border sm:grid-cols-3">
        {PROMISES.map((item) => (
          <div
            key={item.title}
            className="border-gold/20 flex flex-col gap-1.5 border-b px-7 py-7 last:border-0 sm:border-r sm:border-b-0"
          >
            <span className="font-editorial text-xl font-bold">{item.title}</span>
            <span className="text-mist text-sm">{item.text}</span>
          </div>
        ))}
      </div>
    </Container>
  );
}
