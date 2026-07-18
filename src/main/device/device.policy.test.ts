import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateCommandPermissionPolicy,
  normalizeCommand,
} from "./device.policy";

const allowedRoot = path.join(process.cwd(), "tmp", "allowed");

function evaluate(command: string) {
  return evaluateCommandPermissionPolicy(command, [allowedRoot]);
}

describe("device permission policy", () => {
  it("normalizes whitespace and Windows line endings", () => {
    expect(normalizeCommand("  rg --files\r\n  ")).toBe("rg --files");
  });

  it.each([
    ["rg --files", "allow"],
    ["git status --short", "allow"],
    ["npm install", "ask"],
    ["rm -rf tmp/allowed", "ask-always"],
    ["sudo whoami", "ask-always"],
  ] as const)("classifies %s as %s", (command, expectedKind) => {
    expect(evaluate(command).kind).toBe(expectedKind);
  });

  it("allows a simple write inside an approved root", () => {
    expect(evaluate("echo hello > tmp/allowed/output.txt").kind).toBe("allow");
  });

  it("always asks before writing outside approved roots", () => {
    expect(evaluate("echo hello > ../outside.txt").kind).toBe("ask-always");
  });

  describe("known parser gaps to close in the Device hardening phase", () => {
    it.fails("detects a destructive command hidden behind a pipe", () => {
      expect(evaluate("cat package.json | rm -rf tmp/allowed").kind).toBe("ask-always");
    });

    it.fails("detects a destructive command substitution", () => {
      expect(evaluate('cat "$(rm -rf tmp/allowed)"').kind).toBe("ask-always");
    });

    it.fails("detects the mutating find -delete option", () => {
      expect(evaluate("find tmp/allowed -delete").kind).toBe("ask-always");
    });

    it.fails("detects the mutating sed -i option", () => {
      expect(evaluate("sed -i 's/a/b/' tmp/allowed/file.txt").kind).toBe("ask");
    });

    it.fails("requires confirmation before a git push", () => {
      expect(evaluate("git push origin main").kind).toBe("ask");
    });
  });
});
