import { dustMotes } from "./home";

/** Bụi sáng bay lên trong vùng đèn hero; chỉ để trang trí. */
export function DustMotes() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden sm:block">
      {dustMotes().map((mote, index) => (
        <span
          key={index}
          className="dust-mote"
          // Vị trí và nhịp riêng từng hạt: giá trị động nên dùng inline style.
          style={{
            left: `${mote.left}%`,
            bottom: `${mote.bottom}px`,
            animationDuration: `${mote.duration}s`,
            animationDelay: `${mote.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
