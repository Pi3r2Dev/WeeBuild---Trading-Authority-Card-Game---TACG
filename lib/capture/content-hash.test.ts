import { describe, it, expect } from "vitest";
import { sha256Hex } from "./content-hash";

describe("sha256Hex", () => {
  it("est déterministe", () => {
    const buf = Buffer.from("hello");
    expect(sha256Hex(buf)).toBe(sha256Hex(buf));
    expect(sha256Hex(buf).length).toBe(64);
  });
});
