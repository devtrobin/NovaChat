import { describe, expect, it } from "vitest";
import { evaluateDeviceAgentCommandProfile } from "./device.agent-command-profile";

describe("Device agent terminal profile", () => {
  it.each([
    "npm test",
    "reg query HKLM\\HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0",
    "systeminfo | findstr /I processor",
    "ver & systeminfo & pnputil /enum-devices /class Display",
  ])("allows a short non-interactive terminal command: %s", (command) => {
    expect(evaluateDeviceAgentCommandProfile(command)).toEqual({ kind: "allow" });
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
    expect(evaluateDeviceAgentCommandProfile(command)).toMatchObject({ kind: "reject" });
  });

  it("rejects shell grouping even when the inner command looks read-only", () => {
    expect(evaluateDeviceAgentCommandProfile("(echo list disk) | diskpart"))
      .toMatchObject({ kind: "reject" });
  });

  it("rejects oversized command chains so Device returns between inspections", () => {
    expect(evaluateDeviceAgentCommandProfile(
      "ver & systeminfo & reg query HKLM\\HARDWARE & pnputil /enum-devices",
    )).toMatchObject({
      kind: "reject",
      reason: expect.stringContaining("au plus 3 segments"),
    });
  });
});
