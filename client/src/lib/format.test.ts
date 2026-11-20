import { describe, it, expect } from "vitest";
import { formatPrice } from "./format";

describe("formatPrice", () => {
  it("formats a sale price in euros", () => {
    expect(formatPrice(250000, "sale")).toContain("250,000");
  });
  it("adds a monthly suffix for rentals", () => {
    expect(formatPrice(1100, "rent")).toContain("/ month");
  });
});
