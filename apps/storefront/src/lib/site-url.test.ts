import { describe, expect, it } from "vitest";
import { LOCAL_SITE_URL, resolveSiteUrl } from "./site-url";

describe("resolveSiteUrl", () => {
  it("prefers SITE_URL and keeps only the origin", () => {
    expect(
      resolveSiteUrl({ SITE_URL: " https://sachluat.vn/ ", VERCEL_PROJECT_PRODUCTION_URL: "slvn.vercel.app" }),
    ).toBe("https://sachluat.vn");
  });

  it("falls back to the Vercel production domain, then localhost", () => {
    expect(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "slvn.vercel.app" })).toBe("https://slvn.vercel.app");
    expect(resolveSiteUrl({ SITE_URL: "" })).toBe(LOCAL_SITE_URL);
  });

  it("rejects a SITE_URL that is not http(s)", () => {
    expect(() => resolveSiteUrl({ SITE_URL: "ftp://sachluat.vn" })).toThrow("SITE_URL");
    expect(() => resolveSiteUrl({ SITE_URL: "sachluat.vn" })).toThrow("SITE_URL");
  });
});
