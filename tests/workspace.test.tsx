// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Workspace } from "../src/app/workspace";
import { scanFixture } from "./ui-fixtures";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
function history(scans = [scanFixture()]) {
  return json({ scans, redactedExamples: 0 });
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Milestone 3 UI flow (DOM, mocked HTTP)", () => {
  it("loads dashboard totals from persisted data and renders masked findings", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(history()));
    render(<Workspace />);
    expect(screen.getAllByText("Loading stored scans...")).toHaveLength(2);
    const table = await screen.findByRole("table", { name: "Masked findings" });
    expect(within(table).getByText("a***@example.test")).toBeTruthy();
    const totals = screen.getByLabelText("Scan totals");
    expect(within(totals).getByText("3")).toBeTruthy();
    const distribution = screen.getByRole("table", { name: "Risk distribution" });
    expect(within(distribution).getByText("Critical")).toBeTruthy();
    expect(within(distribution).getByText("100%")).toBeTruthy();
    expect(within(distribution).getAllByRole("meter")).toHaveLength(5);
    expect(screen.getByRole("table", { name: "Recent scans" })).toBeTruthy();
    expect(document.body.textContent).not.toContain("alex@example.test");
  });

  it("uploads, displays immediate results, and reloads stored totals without an optimistic increment", async () => {
    let finishUpload: ((response: Response) => void) | undefined;
    const pending = new Promise<Response>((resolve) => { finishUpload = resolve; });
    const fetchMock = vi.fn().mockResolvedValueOnce(history([])).mockReturnValueOnce(pending).mockResolvedValueOnce(history());
    vi.stubGlobal("fetch", fetchMock);
    render(<Workspace />);
    await screen.findByText(/No scans yet/);
    fireEvent.change(screen.getByLabelText("Choose a synthetic file"), {
      target: { files: [new File(["alex@example.test"], "synthetic.csv", { type: "text/csv" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload and scan" }));
    expect((screen.getByRole("button", { name: "Scanning..." }) as HTMLButtonElement).disabled).toBe(true);
    finishUpload?.(json({ scan: {
      id: "scan-1", fileName: "synthetic.csv", overallRisk: "Critical", totalFindings: 3,
      findings: [
        { type: "email", risk: "Low", count: 2, maskedExample: "a***@example.test" },
        { type: "payment_card", risk: "Critical", count: 1, maskedExample: "************1111" },
      ],
    } }, 201));
    await screen.findByRole("table", { name: "Latest scan findings" });
    await screen.findByRole("table", { name: "Masked findings" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][1].body).toBeInstanceOf(File);
    expect(within(screen.getByLabelText("Scan totals")).getByText("3")).toBeTruthy();
    expect(document.body.textContent).not.toContain("alex@example.test");
    expect((screen.getByLabelText("Choose a synthetic file") as HTMLInputElement).value).toBe("");
  });

  it("combines type and risk filters and explains a no-match state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(history()));
    render(<Workspace />);
    await screen.findByRole("table", { name: "Masked findings" });
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Finding type" })).getByLabelText("Email"));
    expect(within(screen.getByRole("table", { name: "Masked findings" })).queryByText("************1111")).toBeNull();
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Risk" })).getByLabelText("Critical"));
    expect(screen.getByText(/No findings match these filters/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText("All types"));
    expect(within(screen.getByRole("table", { name: "Masked findings" })).getByText("************1111")).toBeTruthy();
    expect(within(screen.getByLabelText("Scan totals")).getByText("3")).toBeTruthy();
  });

  it("offers a masked CSV export that follows the active filters and hides when nothing matches", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(history()));
    render(<Workspace />);
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

  it("shows a first-run empty state instead of invented dashboard records", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(history([])));
    render(<Workspace />);
    await screen.findByText(/No scans yet/);
    expect(screen.getByText(/No findings yet/)).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(within(screen.getByLabelText("Scan totals")).getAllByText("0")).toHaveLength(4);
  });

  it("shows a history error and supports retry", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({}, 503)).mockResolvedValueOnce(history([])));
    render(<Workspace />);
    await screen.findByText("Could not load scans");
    expect(screen.queryByLabelText("Scan totals")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Refresh data" }));
    await screen.findByText(/No scans yet/);
  });

  it("clearly reports an expired history session", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 401)));
    render(<Workspace />);
    await screen.findByText(/Your session has expired/);
  });

  it.each([
    ["empty.csv", "", /between 1 byte and 1 MiB/],
    ["payload.exe", "synthetic", /Only .csv and .txt/],
    ["big.csv", "a".repeat(1_048_577), /between 1 byte and 1 MiB/],
  ])("rejects %s on the client with clear feedback (server still validates)", async (name, content, message) => {
    const fetchMock = vi.fn().mockResolvedValue(history([]));
    vi.stubGlobal("fetch", fetchMock);
    render(<Workspace />);
    await screen.findByText(/No scans yet/);
    fireEvent.change(screen.getByLabelText("Choose a synthetic file"), { target: { files: [new File([content], name)] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload and scan" }));
    expect(screen.getByText(message)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows a safe server upload error without changing dashboard totals", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(history([])).mockResolvedValueOnce(json({ error: { message: "The scan could not be saved." } }, 500)));
    render(<Workspace />);
    await screen.findByText(/No scans yet/);
    fireEvent.change(screen.getByLabelText("Choose a synthetic file"), { target: { files: [new File(["clean"], "safe.txt")] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload and scan" }));
    await screen.findByText("The scan could not be saved.");
    expect(screen.queryByRole("region", { name: "Latest scan results" })).toBeNull();
  });

  it("preserves a saved result but reports a failed dashboard refresh honestly", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(history([]))
      .mockResolvedValueOnce(json({ scan: { id: "clean", fileName: "clean.txt", overallRisk: "None", totalFindings: 0, findings: [] } }, 201))
      .mockRejectedValueOnce(new Error("Network unavailable")));
    render(<Workspace />);
    await screen.findByText(/No scans yet/);
    fireEvent.change(screen.getByLabelText("Choose a synthetic file"), { target: { files: [new File(["clean"], "clean.txt")] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload and scan" }));
    await screen.findByText("Scan saved");
    await screen.findByText("Dashboard may be out of date");
    expect(screen.getByText("No sensitive-data patterns detected.")).toBeTruthy();
  });

  it("announces withheld legacy examples", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ scans: [], redactedExamples: 1 })));
    render(<Workspace />);
    await screen.findByText("Some examples were withheld");
    await waitFor(() => expect(screen.queryAllByText("Loading stored scans...")).toHaveLength(0));
  });

  it("does not let a slow initial history read overwrite the post-upload refresh", async () => {
    let finishInitial: ((response: Response) => void) | undefined;
    const pending = new Promise<Response>((resolve) => { finishInitial = resolve; });
    vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(pending)
      .mockResolvedValueOnce(json({ scan: { id: "scan-1", fileName: "clean.txt", overallRisk: "None", totalFindings: 0, findings: [] } }, 201))
      .mockResolvedValueOnce(history()));
    render(<Workspace />);
    fireEvent.change(screen.getByLabelText("Choose a synthetic file"), { target: { files: [new File(["clean"], "clean.txt")] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload and scan" }));
    await screen.findByRole("table", { name: "Masked findings" });
    finishInitial?.(history([]));
    await waitFor(() => expect(within(screen.getByLabelText("Scan totals")).getByText("3")).toBeTruthy());
    expect(screen.queryByText(/No scans yet/)).toBeNull();
  });

  it("explains ambiguous upload network failures without leaking error internals", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(history([])).mockRejectedValueOnce(new Error("private transport detail")));
    render(<Workspace />);
    await screen.findByText(/No scans yet/);
    fireEvent.change(screen.getByLabelText("Choose a synthetic file"), { target: { files: [new File(["clean"], "clean.txt")] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload and scan" }));
    await screen.findByText(/scan may already have been saved/);
    expect(document.body.textContent).not.toContain("private transport detail");
  });
});
