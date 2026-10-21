// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

const { getUser, redirect, usePathname } = vi.hoisted(() => ({
  getUser: vi.fn(),
  redirect: vi.fn(() => { throw new Error("redirect"); }),
  usePathname: vi.fn(() => "/"),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
vi.mock("next/navigation", () => ({ redirect, usePathname }));
import LoginPage from "../src/app/login/page";
import HomePage from "../src/app/page";
import UploadPage from "../src/app/upload/page";
import FindingsPage from "../src/app/findings/page";
import PageError from "../src/app/error";
import PageLoading from "../src/app/loading";

const ROUTES = [
  ["/", HomePage, "Dashboard"],
  ["/upload", UploadPage, "Upload"],
  ["/findings", FindingsPage, "Findings"],
] as const;

function expectOnlyActive(label: string) {
  const nav = screen.getByRole("navigation", { name: "Primary" });
  const current = within(nav).getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page");
  expect(current.map((link) => link.textContent)).toEqual([label]);
}

beforeEach(() => {
  getUser.mockResolvedValue({ data: { user: null } });
  redirect.mockClear();
  usePathname.mockReturnValue("/");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ scans: [], redactedExamples: 0 }))));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("auth page and route error UX (mocked session)", () => {
  it("renders the actual sign-in form and a generic invalid-credentials message", async () => {
    render(await LoginPage({ searchParams: Promise.resolve({ error: "invalid" }) }));
    const input = screen.getByLabelText("Email") as HTMLInputElement;
    expect(input.form?.getAttribute("action")).toBe("/auth/sign-in");
    expect(input.form?.getAttribute("method")).toBe("post");
    expect((screen.getByLabelText("Password") as HTMLInputElement).type).toBe("password");
    expect(screen.getByRole("alert").textContent).toContain("Check your email and password");
  });

  it.each(ROUTES)("redirects unauthenticated access to %s on the server", async (_path, Page) => {
    await expect(Page()).rejects.toThrow("redirect");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it.each(ROUTES)("renders %s as its own route with exactly one active sidebar item", async (path, Page, label) => {
    getUser.mockResolvedValue({ data: { user: { email: "user-a@example.test" } } });
    render(await Page());
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(label);
    expectOnlyActive(label);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["/", "/upload", "/findings"]);
    expect(path).toBe(within(nav).getByRole("link", { name: label }).getAttribute("href"));
  });

  it.each(ROUTES)("keeps the loading state on the %s sidebar item", (path, _Page, label) => {
    usePathname.mockReturnValue(path);
    render(<PageLoading />);
    expectOnlyActive(label);
    expect(screen.getByRole("status").textContent).toContain("Loading your workspace...");
  });

  it("shows a safe top-level error with a working retry instead of exception internals", () => {
    usePathname.mockReturnValue("/findings");
    const reset = vi.fn();
    render(<PageError error={new Error("private database detail")} reset={reset} />);
    expectOnlyActive("Findings");
    expect(screen.getByRole("alert").textContent).not.toContain("private database detail");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
