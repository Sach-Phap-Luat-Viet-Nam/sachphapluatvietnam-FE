import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SortForm } from "./SortForm";

describe("SortForm", () => {
  afterEach(() => vi.restoreAllMocks());

  it("applies the sort as soon as an option is picked, without an apply button", async () => {
    const submit = vi.spyOn(HTMLFormElement.prototype, "requestSubmit").mockImplementation(() => undefined);
    render(<SortForm params={{ category: "luat-dan-su" }} />);

    expect(screen.queryByRole("button", { name: "Áp dụng sắp xếp" })).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Sắp xếp" }), "price_asc");

    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("waits for Enter when the option is changed with the arrow keys", async () => {
    const submit = vi.spyOn(HTMLFormElement.prototype, "requestSubmit").mockImplementation(() => undefined);
    render(<SortForm params={{}} />);
    const select = screen.getByRole("combobox", { name: "Sắp xếp" });

    select.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(submit).not.toHaveBeenCalled();

    await userEvent.keyboard("{Enter}");
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
