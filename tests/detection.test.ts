import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classifyContent } from "../src/detection";

const validFixture = readFileSync(
  new URL("./fixtures/acceptance-valid.txt", import.meta.url),
  "utf8",
);
const invalidFixture = readFileSync(
  new URL("./fixtures/acceptance-invalid.txt", import.meta.url),
  "utf8",
);

describe("classifyContent", () => {
  it("detects and aggregates synthetic acceptance examples", () => {
    const result = classifyContent(validFixture);

    expect(result.overallRisk).toBe("Critical");
    expect(result.findings).toEqual([
      {
        type: "email",
        risk: "Low",
        count: 2,
        maskedExample: "a***@example.test",
      },
      {
        type: "uk_phone",
        risk: "Medium",
        count: 2,
        maskedExample: "07******123",
      },
      {
        type: "uk_nino",
        risk: "High",
        count: 1,
        maskedExample: "AB******C",
      },
      {
        type: "payment_card",
        risk: "Critical",
        count: 1,
        maskedExample: "************1111",
      },
    ]);
  });

  it("ignores malformed values, invalid prefixes and invalid card checksums", () => {
    expect(classifyContent(invalidFixture)).toEqual({
      overallRisk: "None",
      findings: [],
    });
  });

  it("detects the synthetic card candidate without also counting a phone", () => {
    const result = classifyContent("0712345678901230");

    expect(result.overallRisk).toBe("Critical");
    expect(result.findings.map(({ type, count }) => ({ type, count }))).toEqual([
      { type: "payment_card", count: 1 },
    ]);
  });

  it("rejects partial matches inside longer letter or digit runs", () => {
    const result = classifyContent(
      "x@alex@example.test; 107700900123; 077009001234; AB1234567; 41111111111111111111; 05012345678",
    );

    expect(result).toEqual({ overallRisk: "None", findings: [] });
  });

  it("returns only masked examples and never serializes complete synthetic values", () => {
    const source =
      "alex@example.test; 07700 900123; AB 12 34 56 C; 4111 1111 1111 1111";
    const serialized = JSON.stringify(classifyContent(source));

    expect(serialized).not.toContain("alex@example.test");
    expect(serialized).not.toContain("07700 900123");
    expect(serialized).not.toContain("AB 12 34 56 C");
    expect(serialized).not.toContain("4111 1111 1111 1111");
    expect(serialized).toContain("maskedExample");
  });

  it("returns None for clean input", () => {
    expect(classifyContent("Synthetic clean text only.")).toEqual({
      overallRisk: "None",
      findings: [],
    });
  });
});
