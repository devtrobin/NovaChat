import { describe, expect, it } from "vitest";
import { resolveProcessTreeTerminationStrategy } from "./ael.process-tree";

describe("process tree termination", () => {
  it("uses taskkill recursively on Windows", () => {
    expect(resolveProcessTreeTerminationStrategy("win32", 42)).toEqual({
      args: ["/pid", "42", "/t", "/f"],
      file: "taskkill",
      kind: "command",
    });
  });

  it("targets the detached process group on Unix", () => {
    expect(resolveProcessTreeTerminationStrategy("linux", 42)).toEqual({
      kind: "process-group",
      pid: -42,
      signal: "SIGTERM",
    });
  });
});
