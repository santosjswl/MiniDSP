// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { DashboardView, FindingsView, UploadView } from "../src/app/workspace";
import { scanFixture } from "./ui-fixtures";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
function history(scans = [scanFixture()]) {
  return json({ scans, redactedExamples: 0 });
}
function chooseFile(file: File) {
  fireEvent.change(screen.getByLabelText("Choose a synthetic file"), { target: { files: [file] } });
  fireEvent.click(screen.getByRole("button", { name: "Upload and scan" }));
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Dashboard route view (DOM, mocked HTTP)", () => {
  it("loads totals, risk distribution and recent scans from persisted data only", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(history()));
    render(<DashboardView />);
    expect(screen.getByRole("status").textContent).toContain("Loading stored scans...");
    const distribution = await screen.findByRole("table", { name: "Risk distribution" });
    expect(within(screen.getByLabelText("Scan totals")).getByText("3")).toBeTruthy();
    expect(within(distribution).getByText("Critical")).toBeTruthy();
    expect(within(distribution).getByText("100%")).toBeTruthy();
    expect(within(distribution).getAllByRole("meter")).toHaveLength(5);
    expect(screen.getByRole("table", { name: "Recent scans" })).toBeTruthy();
    expect(screen.queryByRole("table", { name: "Masked findings" })).toBeNull();
    expect(document.body.textContent).not.toContain("alex@example.test");
  });

  it("shows a first-run empty state that links to the upload route", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(history([])));
    render(<DashboardView />);
    await screen.findByText(/No scans yet/);
    expect(screen.queryByRole("table")).toBeNull();
    expect(within(screen.getByLabelText("Scan totals")).getAllByText("0")).toHaveLength(4);
    expect(screen.getByRole("link", { name: /Upload a synthetic CSV or TXT file/ }).getAttribute("href")).toBe("/upload");
  });

  it("shows a history error and supports retry", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({}, 503)).mockResolvedValueOnce(history([])));
    render(<DashboardView />);
    await screen.findByText("Could not load scans");
    expect(screen.queryByLabelText("Scan totals")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Refresh data" }));
    await screen.findByText(/No scans yet/);
  });

  it("clearly reports an expired history session", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 401)));
    render(<DashboardView />);
    await screen.findByText(/Your session has expired/);
  });

  it("announces withheld legacy examples", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ scans: [], redactedExamples: 1 })));
    render(<DashboardView />);
    await screen.findByText("Some examples were withheld");
    await waitFor(() => expect(screen.queryAllByText("Loading stored scans...")).toHaveLength(0));
  });
});

describe("Upload route view (DOM, mocked HTTP)", () => {
  it("uploads, shows immediate masked results and links to the stored views", async () => {
    let finishUpload: ((response: Response) => void) | undefined;
    const pending = new Promise<Response>((resolve) => { finishUpload = resolve; });
    const fetchMock = vi.fn().mockReturnValueOnce(pending);
    vi.stubGlobal("fetch", fetchMock);
    render(<UploadView />);
    chooseFile(new File(["alex@example.test"], "synthetic.csv", { type: "text/csv" }));
    expect((screen.getByRole("button", { name: "Scanning..." }) as HTMLButtonElement).disabled).toBe(true);
    finishUpload?.(json({ scan: {
      id: "scan-1", fileName: "synthetic.csv", overallRisk: "Critical", totalFindings: 3,
      findings: [
        { type: "email", risk: "Low", count: 2, maskedExample: "a***@example.test" },
        { type: "payment_card", risk: "Critical", count: 1, maskedExample: "************1111" },
      ],
    } }, 201));
    const table = await screen.findByRole("table", { name: "Latest scan findings" });
    expect(within(table).getByText("************1111")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/scans");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    expect(fetchMock.mock.calls[0][1].body).toBeInstanceOf(File);
    expect(screen.getByRole("link", { name: "View all findings" }).getAttribute("href")).toBe("/findings");
    expect(screen.getByRole("link", { name: "open the dashboard" }).getAttribute("href")).toBe("/");
    expect(document.body.textContent).not.toContain("alex@example.test");
    expect((screen.getByLabelText("Choose a synthetic file") as HTMLInputElement).value).toBe("");
  });

  it.each([
    ["empty.csv", "", /between 1 byte and 1 MiB/],
    ["payload.exe", "synthetic", /Only .csv and .txt/],
    ["big.csv", "a".repeat(1_048_577), /between 1 byte and 1 MiB/],
  ])("rejects %s on the client with clear feedback (server still validates)", (name, content, message) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<UploadView />);
    chooseFile(new File([content], name));
    expect(screen.getByText(message)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a safe server upload error and no result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({ error: { message: "The scan could not be saved." } }, 500)));
    render(<UploadView />);
    chooseFile(new File(["clean"], "safe.txt"));
    await screen.findByText("The scan could not be saved.");
    expect(screen.queryByRole("region", { name: "Latest scan results" })).toBeNull();
  });

  it("reports a clean scan without a findings table", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({ scan: { id: "clean", fileName: "clean.txt", overallRisk: "None", totalFindings: 0, findings: [] } }, 201)));
    render(<UploadView />);
    chooseFile(new File(["clean"], "clean.txt"));
    await screen.findByText("Scan saved");
    expect(screen.getByText("No sensitive-data patterns detected.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("explains ambiguous upload network failures without leaking error internals", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("private transport detail")));
    render(<UploadView />);
    chooseFile(new File(["clean"], "clean.txt"));
    await screen.findByText(/scan may already have been saved/);
    expect(document.body.textContent).not.toContain("private transport detail");
  });
});

describe("Findings route view (DOM, mocked HTTP)", () => {
  it("renders masked findings from persisted data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(history()));
    render(<FindingsView />);
    expect(screen.getByRole("status").textContent).toContain("Loading findings...");
    const table = await screen.findByRole("table", { name: "Masked findings" });
    expect(within(table).getByText("a***@example.test")).toBeTruthy();
    expect(screen.getByText("2 finding groups (3 occurrences)")).toBeTruthy();
    expect(screen.queryByLabelText("Scan totals")).toBeNull();
  });

  it("combines type and risk filters and explains a no-match state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(history()));
    render(<FindingsView />);
    await screen.findByRole("table", { name: "Masked findings" });
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Finding type" })).getByLabelText("Email"));
    expect(within(screen.getByRole("table", { name: "Masked findings" })).queryByText("************1111")).toBeNull();
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Risk" })).getByLabelText("Critical"));
    expect(screen.getByText(/No findings match these filters/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText("All types"));
    expect(within(screen.getByRole("table", { name: "Masked findings" })).getByText("************1111")).toBeTruthy();
  });

  it("offers a masked CSV export that follows the active filters and hides when nothing matches", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(history()));
    render(<FindingsView />);
    const link = await screen.findByRole("link", { name: /Export filtered findings/ });
    expect(link.getAttribute("href")).toBe("/api/scans/export?type=all&risk=all");
    expect(link.hasAttribute("download")).toBe(true);
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Finding type" })).getByLabelText("Payment card"));
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Risk" })).getByLabelText("Critical"));
    expect(screen.getByRole("link", { name: /Export filtered findings/ }).getAttribute("href"))
      .toBe("/api/scans/export?type=payment_card&risk=Critical");
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Risk" })).getByLabelText("Low"));
    expect(screen.queryByRole("link", { name: /Export filtered findings/ })).toBeNull();
  });

  it("shows an empty state that links to the upload route", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(history([])));
    render(<FindingsView />);
    await screen.findByText(/No findings yet/);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("link", { name: "Run your first scan" }).getAttribute("href")).toBe("/upload");
  });

  it("shows a safe error with retry and no stale rows", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({}, 503)).mockResolvedValueOnce(history()));
    render(<FindingsView />);
    await screen.findByText("Findings unavailable");
    expect(screen.queryByRole("table")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Refresh data" }));
    await screen.findByRole("table", { name: "Masked findings" });
  });
});
