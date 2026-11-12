import { render, screen } from "@testing-library/react";
import { useForm, useWatch } from "react-hook-form";
import userEvent from "@testing-library/user-event";
import { WardSelect } from "./WardSelect";
import wards from "@/lib/wards.json";
import { PROVINCES } from "@slvn/utils";

function Harness({ province, initial = "" }: { province: string; initial?: string }) {
  const { register, control } = useForm({ defaultValues: { ward: initial } });
  const value = useWatch({ control, name: "ward" });
  return <WardSelect id="ward" label="Phường/Xã" province={province} value={value} registration={register("ward")} />;
}

it("covers every province with the post-merger dataset", () => {
  expect(Object.keys(wards).sort()).toEqual([...PROVINCES].sort());
  expect(Object.values(wards).flat()).toHaveLength(3321);
});

it("requires a province before choosing a ward", () => {
  render(<Harness province="" />);
  expect(screen.getByLabelText("Phường/Xã")).toBeDisabled();
});

it("lists wards only for the selected province", async () => {
  render(<Harness province="Hà Nội" />);
  expect(screen.queryByRole("option", { name: "Phường Hải Châu" })).not.toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText("Phường/Xã"), "Phường Cầu Giấy");
  expect(screen.getByLabelText("Phường/Xã")).toHaveValue("Phường Cầu Giấy");
});

it("preserves a legacy saved address", () => {
  render(<Harness province="TP. Hồ Chí Minh" initial="Phường Bến Nghé" />);
  expect(screen.getByLabelText("Phường/Xã")).toHaveValue("Phường Bến Nghé");
});
