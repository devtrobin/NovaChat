import { describe, expect, it } from "vitest";
import { evaluateAELAgentCommandProfile } from "./ael.agent-command-profile";

describe("AEL agent terminal profile", () => {
  it.each([
    "npm test",
    "reg query HKLM\\HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0",
    "systeminfo | findstr /I processor",
    "ver & systeminfo & pnputil /enum-aels /class Display",
  ])("allows a short non-interactive terminal command: %s", (command) => {
    expect(evaluateAELAgentCommandProfile(command)).toEqual({ kind: "allow" });
  });

  it.each([
    "cmd /c systeminfo",
    "diskpart",
    "echo list disk | diskpart",
    "dxdiag",
    "more package.json",
    "msinfo32",
    "notepad.exe",
    "pause",
    "powershell -Command Get-CimInstance Win32_Processor",
    "start notepad",
    "wmic cpu get Name",
    "unknown-desktop-tool",
  ])("rejects wrappers, interactive tools and program launchers: %s", (command) => {
    expect(evaluateAELAgentCommandProfile(command)).toMatchObject({ kind: "reject" });
  });

  it("rejects shell grouping even when the inner command looks read-only", () => {
    expect(evaluateAELAgentCommandProfile("(echo list disk) | diskpart"))
      .toMatchObject({ kind: "reject" });
  });

  it("rejects oversized command chains so AEL returns between inspections", () => {
    expect(evaluateAELAgentCommandProfile(
      "ver & systeminfo & reg query HKLM\\HARDWARE & pnputil /enum-aels",
    )).toMatchObject({
      kind: "reject",
      reason: expect.stringContaining("au plus 3 segments"),
    });
  });
});
