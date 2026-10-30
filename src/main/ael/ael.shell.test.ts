import path from "node:path";
import { describe, expect, it } from "vitest";
import { getAELRuntimeShell, resolveShell } from "./ael.shell";

describe("AEL runtime shell", () => {
  it("reports the same shell family used by command execution", () => {
    const runtime = getAELRuntimeShell();
    const resolved = resolveShell("echo test");

    expect(resolved.file).toBe(runtime.file);
    expect(path.basename(resolved.shell)).toBe(runtime.name);
    expect(runtime.family).toBe(process.platform === "win32" ? "cmd" : "posix");
  });

  it.runIf(process.platform === "win32")("forces UTF-8 output before the Windows command", () => {
    expect(resolveShell("systeminfo").args).toEqual([
      "/d",
      "/s",
      "/c",
      "chcp 65001>nul & systeminfo",
    ]);
  });
});
