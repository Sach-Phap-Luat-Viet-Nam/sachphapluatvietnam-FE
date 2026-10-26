import { useForm, useWatch } from "react-hook-form";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ProvinceSelect } from "./ProvinceSelect";

function Harness({ initial }: { initial: string }) {
  const { register, control } = useForm<{ province: string }>({ defaultValues: { province: initial } });
  const province = useWatch({ control, name: "province" });
  return <ProvinceSelect id="province" label="Tỉnh/Thành phố" registration={register("province")} value={province} />;
}

describe("ProvinceSelect", () => {
  it("lists the standard provinces and lets the user pick one", async () => {
    const user = userEvent.setup();
    render(<Harness initial="" />);

    const select = screen.getByLabelText("Tỉnh/Thành phố");
    expect(select).toHaveValue("");
    expect(screen.getByRole("option", { name: "Đà Nẵng" })).toBeInTheDocument();

    await user.selectOptions(select, "Đà Nẵng");
    expect(select).toHaveValue("Đà Nẵng");
  });

  it("keeps a saved province that is not in the standard list", () => {
    render(<Harness initial="Thành phố Hồ Chí Minh" />);

    expect(screen.getByLabelText("Tỉnh/Thành phố")).toHaveValue("Thành phố Hồ Chí Minh");
    expect(screen.getByRole("option", { name: "Thành phố Hồ Chí Minh" })).toBeInTheDocument();
  });
});
