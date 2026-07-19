import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertCommandAllowed,
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

  it("rejects empty commands and null bytes before classification", () => {
    expect(() => assertCommandAllowed("  ")).toThrow("vide");
    expect(() => assertCommandAllowed("rg\0--files")).toThrow("caractere interdit");
  });

  it.each([
    ["rg --files", "allow"],
    ["git status --short", "allow"],
    ["git -C . status --short", "allow"],
    ["git branch --show-current", "allow"],
    ["cat package.json | rg name", "allow"],
    ...(process.platform === "win32"
      ? [["ver & systeminfo", "allow"] as const]
      : []),
    ['printf "a|b"', "allow"],
    ["echo hello", "allow"],
    ["FOO=bar", "allow"],
    ["npm install", "ask"],
    ["npm install --global package-name", "ask-always"],
    ["curl https://example.com", "ask"],
    ["mv source.txt tmp/allowed/target.txt", "ask"],
    ["sed 's/a/b/' tmp/allowed/file.txt", "ask-always"],
    ["rm -rf tmp/allowed", "ask-always"],
    ["sudo whoami", "ask-always"],
    ["/bin/rm -rf tmp/allowed", "ask-always"],
    ["./cat package.json", "ask-always"],
    ["unknown-device-tool --inspect", "ask-always"],
    ["LD_PRELOAD=./payload.so rg --files", "ask-always"],
  ] as const)("classifies %s as %s", (command, expectedKind) => {
    expect(evaluate(command).kind).toBe(expectedKind);
  });

  it.each([
    ["rg --files", "allow", "read-local"],
    ["touch tmp/allowed/new-file.txt", "allow", "workspace-write"],
    ["mv source.txt tmp/allowed/target.txt", "ask", "workspace-write"],
    ["curl https://example.com", "ask", "network"],
    ["git push origin main", "ask", "network"],
    ["npm install", "ask", "system"],
    ["sudo whoami", "ask-always", "system"],
    ["echo hello > ~/.bashrc", "ask-always", "system"],
    ["rm -rf tmp/allowed", "ask-always", "destructive"],
    ["echo hello > ../outside.txt", "ask-always", "workspace-write"],
    ["echo hello > $OUTPUT_PATH", "ask-always", "unclassified"],
    ["unknown-device-tool --inspect", "ask-always", "unclassified"],
  ] as const)("classifies %s as %s/%s", (command, expectedKind, expectedCategory) => {
    expect(evaluate(command)).toMatchObject({
      category: expectedCategory,
      kind: expectedKind,
    });
  });

  it("keeps the highest-risk category across multiple shell segments", () => {
    expect(evaluate("cat package.json | curl https://example.com")).toMatchObject({
      category: "network",
      kind: "ask",
    });
    expect(evaluate("npm install && rm -rf tmp/allowed")).toMatchObject({
      category: "destructive",
      kind: "ask-always",
    });
  });

  it.each([
    "cat .env",
    "cat ~/.ssh/id_rsa",
    "printenv",
    "rg api_key settings.json.bak",
  ])("asks before a potentially sensitive local read: %s", (command) => {
    expect(evaluate(command)).toMatchObject({
      category: "read-local",
      kind: "ask",
    });
  });

  it("allows a constrained non-sensitive environment read", () => {
    expect(evaluate("printenv PROCESSOR_ARCHITECTURE")).toMatchObject({
      category: "read-local",
      kind: "allow",
    });
  });

  it.each([
    "echo hello > tmp/allowed/output.txt",
    "echo hello>tmp/allowed/output.txt",
    "cat package.json > tmp/allowed/copy.json",
    "touch tmp/allowed/new-file.txt",
    "mkdir tmp/allowed/new-directory",
    "cp package.json tmp/allowed/package.json",
    "sort package.json -o tmp/allowed/sorted.txt",
  ])("allows a simple write inside an approved root: %s", (command) => {
    expect(evaluate(command).kind).toBe("allow");
  });

  it.each([
    "echo hello > ../outside.txt",
    "echo hello>../outside.txt",
    "echo hello > ~/outside.txt",
    "echo hello > $OUTPUT_PATH",
    "cp package.json ../outside.json",
    "cp -t ../outside package.json",
    "diff package.json package-lock.json --output=../outside.diff",
    "diff .env package.json --output=../outside.diff",
    "git diff --output=../outside.diff",
    "sort package.json -o ../outside.txt",
    "rm -rf tmp/allowed > tmp/allowed/removal.log",
  ])("always asks before an unsafe or ambiguous write: %s", (command) => {
    expect(evaluate(command).kind).toBe("ask-always");
  });

  it.each([
    "cat package.json | rm -rf tmp/allowed",
    "cat package.json && rm -rf tmp/allowed",
    "cat package.json || rm -rf tmp/allowed",
    "cat package.json; rm -rf tmp/allowed",
    "cat package.json\nrm -rf tmp/allowed",
    "cat package.json & rm -rf tmp/allowed",
    'cat "$(rm -rf tmp/allowed)"',
    "cat `rm -rf tmp/allowed`",
    "find tmp/allowed -delete",
    "find tmp/allowed -exec rm -rf {} ;",
    "xargs rm -rf tmp/allowed",
    "awk 'BEGIN { system(\"rm -rf tmp/allowed\") }'",
    "sh -c \"rm -rf tmp/allowed\"",
    "env rm -rf tmp/allowed",
    "command rm -rf tmp/allowed",
    "rg --pre 'rm -rf tmp/allowed' .",
    "git -c core.fsmonitor=malicious status",
    "date --set=2026-07-18",
    "hostname unsafe-name",
    "sort --compress-program=malicious package.json",
    "sysctl -p unsafe.conf",
    "sysctl -w kernel.hostname=unsafe",
    "top",
    "(rm -rf tmp/allowed)",
    "cat \"unterminated",
    "cat package.json |",
  ])("requires a non-persistent confirmation for complex syntax: %s", (command) => {
    expect(evaluate(command).kind).toBe("ask-always");
  });

  it("does not allow persistent permission for an unclassified sed script", () => {
    expect(evaluate("sed 's/a/b/' tmp/allowed/file.txt")).toMatchObject({
      category: "unclassified",
      kind: "ask-always",
    });
  });

  it("detects the mutating sed -i option", () => {
    expect(evaluate("sed -i 's/a/b/' tmp/allowed/file.txt").kind).toBe("ask");
  });

  it("always asks when sed -i targets a path outside approved roots", () => {
    expect(evaluate("sed -i 's/a/b/' ../outside.txt").kind).toBe("ask-always");
  });

  it.each([
    "git push origin main",
    "git pull --ff-only",
    "git add package.json",
    "git commit -m test",
  ])("requires permission before a mutating or network Git command: %s", (command) => {
    expect(evaluate(command).kind).toBe("ask");
  });

  it.each([
    "git clean -fd",
    "git reset --hard",
    "git restore package.json",
    "git rm package.json",
  ])("always asks before a destructive Git command: %s", (command) => {
    expect(evaluate(command).kind).toBe("ask-always");
  });
});

describe.runIf(process.platform === "win32")("Windows read-only policy", () => {
  it.each([
    "dir /b",
    "driverquery /fo csv /nh",
    "findstr /i processor package.json",
    "fsutil fsinfo drives",
    "ipconfig /all",
    "pnputil /enum-devices /connected",
    "reg query HKLM\\HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0",
    "reg query \"HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\" /v DisplayVersion",
    "reg query \"HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\" /v ProductName",
    "systeminfo /fo list",
    "type package.json",
    "ver",
    "where node",
  ])("allows a constrained local inspection without prompting: %s", (command) => {
    expect(evaluate(command)).toMatchObject({
      category: "read-local",
      kind: "allow",
    });
  });

  it("asks before reading a potentially sensitive registry branch", () => {
    expect(evaluate("reg query HKCU\\Software")).toMatchObject({
      category: "read-local",
      kind: "ask",
    });
  });

  it("does not broadly allow every value from the Windows version registry branch", () => {
    expect(evaluate(
      "reg query \"HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\" /v ProductId",
    )).toMatchObject({
      category: "read-local",
      kind: "ask",
    });
  });

  it("asks before a Windows read targeting a network share", () => {
    expect(evaluate("dir \\\\remote-host\\share")).toMatchObject({
      category: "network",
      kind: "ask",
    });
  });

  it.each([
    "driverquery /s remote-host",
    "fsutil file createnew payload.bin 10",
    "ipconfig /release",
    "pnputil /delete-driver oem1.inf",
    "reg add HKCU\\Software\\Nova /v test /d value",
    "reg delete HKCU\\Software\\Nova /f",
    "reg query \\\\remote-host\\HKLM\\HARDWARE",
    "systeminfo /s remote-host",
  ])("keeps mutating, remote or unsupported Windows forms behind confirmation: %s", (command) => {
    expect(evaluate(command).kind).toBe("ask-always");
  });
});
