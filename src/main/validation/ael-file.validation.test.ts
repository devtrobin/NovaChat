import { describe, expect, it } from "vitest";
import { parseAELWriteFileOperation } from "./ael-file.validation";
import { MAX_AEL_FILE_BYTES } from "../../shared/ael-file.types";

const operation = { action: "write-file", target: { directory: "desktop", name: "coucou.py" }, content: '\n  print("coucou")\n', overwrite: false };
describe("file creation contract", () => {
  it("preserves code whitespace and permits empty files", () => {
    expect(parseAELWriteFileOperation(operation)).toEqual(operation);
    expect(parseAELWriteFileOperation({ ...operation, content: "" }).content).toBe("");
  });
  it.each(["../x", "x/y", "x\\y", "C:\\x", "x:stream", "NUL.py", "com1", "LPT².txt", ".", "..", "x.", " x", "x\n.py"])("rejects unsafe name %s", (name) => {
    expect(() => parseAELWriteFileOperation({ ...operation, target: { directory: "desktop", name } })).toThrow();
  });
  it.each([
    { ...operation, overwrite: true }, { ...operation, overwrite: undefined },
    { ...operation, path: "C:\\secret" }, { ...operation, action: "execute" },
    { ...operation, target: { directory: "other", name: "a.py" } },
    { ...operation, target: { ...operation.target, path: "x" } },
    { ...operation, content: "\0" }, { ...operation, content: "\ud800" },
    { ...operation, content: "é".repeat(MAX_AEL_FILE_BYTES / 2 + 1) },
  ])("rejects an invalid action without coercion", (value) => {
    expect(() => parseAELWriteFileOperation(value)).toThrow();
  });
});
