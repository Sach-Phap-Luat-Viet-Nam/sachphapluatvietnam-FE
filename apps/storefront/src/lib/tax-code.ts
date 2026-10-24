/** Mã số thuế 10 số, chi nhánh thêm `-xxx` (giống `AuthRules.TaxCodePattern` của backend). */
const TAX_CODE_PATTERN = /^\d{10}(-\d{3})?$/;

export const TAX_CODE_MESSAGE = "Mã số thuế gồm 10 số, chi nhánh thêm -xxx (ví dụ 0101234567-001).";

export function isValidTaxCode(taxCode: string): boolean {
  return TAX_CODE_PATTERN.test(taxCode.trim());
}
