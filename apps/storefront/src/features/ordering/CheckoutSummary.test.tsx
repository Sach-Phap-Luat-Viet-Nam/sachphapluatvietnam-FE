import { render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import { CheckoutSummary } from "./CheckoutSummary";
import type { CheckoutPreview } from "./checkout-preview";

function preview(appliedPromotions: CheckoutPreview["appliedPromotions"]): CheckoutPreview {
  return {
    items: [],
    subtotal: 100000,
    discount: 30000,
    shippingFee: 30000,
    shippingDiscount: 30000,
    total: 70000,
    appliedPromotions,
    couponApplied: null,
    freeShippingThreshold: null,
    amountToFreeShipping: 0,
    eta: null,
    zoneName: null,
  };
}

function renderSummary(value: CheckoutPreview) {
  return render(
    <CheckoutSummary
      fallback={{ subtotal: 100000, totalQuantity: 2 }}
      listSubtotal={100000}
      preview={value}
      updating={false}
      loadFailed={false}
      coupon={null}
      lines={null}
    />,
  );
}

describe("CheckoutSummary ưu đãi đã áp", () => {
  it("hiện combo cùng ưu đãi phí ship dù id combo trùng id chương trình, không trùng key", () => {
    // Combo AB có id 1 và chương trình giảm phí ship cũng có id 1: `promotionId` của combo là id combo.
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    renderSummary(
      preview([
        { promotionId: 1, name: "Combo trọn bộ sách AB", kind: "combo", couponCode: null, amount: 30000 },
        { promotionId: 1, name: "Miễn phí vận chuyển", kind: "free_shipping", couponCode: null, amount: 30000 },
      ]),
    );

    const applied = within(screen.getByRole("list", { name: "Ưu đãi đã áp" }));
    expect(applied.getByText("Combo trọn bộ sách AB")).toBeVisible();
    expect(applied.getByText("Miễn phí vận chuyển")).toBeVisible();
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
