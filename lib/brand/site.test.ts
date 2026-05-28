import { describe, it, expect } from "vitest";
import { PRODUCT_TITLE, SITE_NAME, SITE_WORDMARK } from "./site";

describe("site brand", () => {
  it("expose WeeBuild comme nom de site", () => {
    expect(SITE_WORDMARK).toBe("WEEBUILD");
    expect(SITE_NAME).toBe("WeeBuild");
    expect(PRODUCT_TITLE).toBe("WeeBuild — Trading Authority Game");
  });
});
