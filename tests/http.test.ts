import { describe, expect, it } from "vitest";
import { isSameOrigin, requestOrigin } from "../src/lib/http";

describe("public request origin", () => {
  it("accepts same-origin requests when Next normalizes a loopback hostname", () => {
    const request = new Request("http://localhost:3000/api/scans", {
      headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
    });
    expect(isSameOrigin(request)).toBe(true);
    expect(new URL("/login", requestOrigin(request)).href).toBe("http://127.0.0.1:3000/login");
  });
  it("still denies cross-origin requests, including a different loopback hostname", () => {
    const request = new Request("http://localhost:3000/api/scans", {
      headers: { host: "127.0.0.1:3000", origin: "http://localhost:3000" },
    });
    expect(isSameOrigin(request)).toBe(false);
  });
  it("does not trust a forwarded host to authorize another origin", () => {
    const request = new Request("https://app.example.test/api/scans", {
      headers: { host: "app.example.test", origin: "https://attacker.example", "x-forwarded-host": "attacker.example" },
    });
    expect(isSameOrigin(request)).toBe(false);
  });
  it("supports non-browser requests without an Origin header", () => {
    expect(isSameOrigin(new Request("http://localhost:3000/api/scans"))).toBe(true);
  });
});
