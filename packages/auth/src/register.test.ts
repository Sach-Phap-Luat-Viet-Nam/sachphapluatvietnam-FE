import { toRegisterBody } from "./register";
import { registerSchema } from "./schemas";

const VALID = {
  fullName: "Nguyễn Văn A",
  email: "khach@example.com",
  phoneNumber: "",
  password: "mat-khau-dung",
  confirmPassword: "mat-khau-dung",
};

function messages(values: Partial<typeof VALID>) {
  const result = registerSchema.safeParse({ ...VALID, ...values });
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
}

describe("registerSchema", () => {
  it("nhận form hợp lệ, số điện thoại để trống được", () => {
    expect(registerSchema.safeParse(VALID).success).toBe(true);
    expect(registerSchema.safeParse({ ...VALID, phoneNumber: "0901234567" }).success).toBe(true);
    expect(registerSchema.safeParse({ ...VALID, phoneNumber: "+84901234567" }).success).toBe(true);
  });

  it("báo lỗi từng ô theo quy tắc của backend", () => {
    expect(messages({ fullName: "   " })).toEqual(["fullName: Anh/chị vui lòng nhập họ tên."]);
    expect(messages({ email: "khach" })).toEqual(["email: Anh/chị vui lòng nhập email hợp lệ."]);
    expect(messages({ phoneNumber: "12345" })).toEqual([
      "phoneNumber: Số điện thoại gồm 10 số, bắt đầu bằng 0 hoặc +84.",
    ]);
    expect(messages({ password: "ngan", confirmPassword: "ngan" })).toEqual(["password: Mật khẩu tối thiểu 8 ký tự."]);
    expect(messages({ password: "a".repeat(129), confirmPassword: "a".repeat(129) })).toEqual([
      "password: Mật khẩu tối đa 128 ký tự.",
    ]);
  });

  it("báo khi nhập lại mật khẩu không khớp", () => {
    expect(messages({ confirmPassword: "mat-khau-khac" })).toEqual(["confirmPassword: Mật khẩu nhập lại chưa khớp."]);
  });
});

describe("toRegisterBody", () => {
  it("chuẩn hóa email, bỏ ô nhập lại mật khẩu và đổi số điện thoại trống thành null", () => {
    expect(toRegisterBody({ ...VALID, email: " Khach@Example.com ", fullName: "  Nguyễn Văn A " })).toEqual({
      email: "khach@example.com",
      password: "mat-khau-dung",
      fullName: "Nguyễn Văn A",
      phoneNumber: null,
    });
  });

  it("giữ số điện thoại khi có nhập", () => {
    expect(toRegisterBody({ ...VALID, phoneNumber: " 0901234567 " }).phoneNumber).toBe("0901234567");
  });
});
