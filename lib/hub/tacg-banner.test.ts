import { describe, it, expect } from "vitest";
import {
  TACG_BANNER_DISMISSED_VALUE,
  TACG_BANNER_STORAGE_KEY,
  TACG_FULL_NAME,
} from "./tacg-banner";

describe("tacg-banner", () => {
  it("expose une clé localStorage stable", () => {
    expect(TACG_BANNER_STORAGE_KEY).toBe("webuild_tacg_banner_dismissed");
    expect(TACG_BANNER_DISMISSED_VALUE).toBe("1");
  });

  it("déploie TACG vers Trading Authority Card Game", () => {
    expect(TACG_FULL_NAME).toBe("Trading Authority Card Game");
  });
});
