import { describe, expect, it } from "vitest";
import { formatKobo, koboToNairaInput, parseNairaToKobo } from "@/lib/money";

describe("money", () => {
  it("returns null for unknown prices (never ₦0)", () => {
    expect(formatKobo(null)).toBeNull();
    expect(formatKobo(undefined)).toBeNull();
  });
  it("formats kobo as naira", () => {
    expect(formatKobo(1250000)).toContain("12,500");
  });
  it("parses human input to exact integer kobo", () => {
    expect(parseNairaToKobo("12,500")).toBe(1250000);
    expect(parseNairaToKobo("₦12500.5")).toBe(1250050);
    expect(parseNairaToKobo("0.07")).toBe(7);
    expect(parseNairaToKobo("")).toBeNull();
    expect(parseNairaToKobo("12.345")).toBeUndefined();
    expect(parseNairaToKobo("abc")).toBeUndefined();
  });
  it("round-trips kobo to input text", () => {
    expect(koboToNairaInput(1250000)).toBe("12500");
    expect(koboToNairaInput(1250050)).toBe("12500.5");
    expect(koboToNairaInput(null)).toBe("");
  });
});
