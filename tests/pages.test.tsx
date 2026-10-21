// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const { getUser, redirect } = vi.hoisted(() => ({
  getUser: vi.fn(),
  redirect: vi.fn(() => { throw new Error("redirect"); }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
vi.mock("next/navigation", () => ({ redirect }));
import LoginPage from "../src/app/login/page";
import HomePage from "../src/app/page";
import PageError from "../src/app/error";

beforeEach(() => {
  getUser.mockResolvedValue({ data: { user: null } });
  redirect.mockClear();
});
afterEach(cleanup);

describe("auth page and route error UX (mocked session)", () => {
  it("renders the actual sign-in form and a generic invalid-credentials message", async () => {
    render(await LoginPage({ searchParams: Promise.resolve({ error: "invalid" }) }));
    const input = screen.getByLabelText("Email") as HTMLInputElement;
    expect(input.form?.getAttribute("action")).toBe("/auth/sign-in");
    expect(input.form?.getAttribute("method")).toBe("post");
    expect((screen.getByLabelText("Password") as HTMLInputElement).type).toBe("password");
    expect(screen.getByRole("alert").textContent).toContain("Check your email and password");
  });

  it("redirects unauthenticated workspace access on the server", async () => {
    await expect(HomePage()).rejects.toThrow("redirect");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("shows a safe top-level error with a working retry instead of exception internals", () => {
    const reset = vi.fn();
    render(<PageError error={new Error("private database detail")} reset={reset} />);
    expect(screen.getByRole("alert").textContent).not.toContain("private database detail");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
