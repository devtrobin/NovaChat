import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolvePathWithinRoot } from "./safe-path";

describe("resolvePathWithinRoot", () => {
  it("resolves descendants inside the configured root", () => {
    const root = path.resolve("storage");

    expect(resolvePathWithinRoot(root, "conversation-1", "message.json"))
      .toBe(path.join(root, "conversation-1", "message.json"));
  });

  it.each([
    [".."],
    ["..", "outside"],
    [path.parse(path.resolve("outside")).root, "outside"],
  ])("rejects a path escaping the configured root", (...segments) => {
    expect(() => resolvePathWithinRoot(path.resolve("storage"), ...segments))
      .toThrow("sort du repertoire autorise");
  });
});
