import { describe, expect, it } from "vitest";
import {
  getHistoryStatusLabel,
  truncateRecordOutput,
} from "./DeviceAgentPage.service";

describe("Device Agent page formatting", () => {
  it.each([
    ["success", "Succes"],
    ["partial-success", "Partiel"],
    ["denied", "Refus"],
    ["error", "Erreur"],
    ["interrupted", "Erreur"],
  ] as const)("formats %s history status", (status, expected) => {
    expect(getHistoryStatusLabel(status)).toBe(expected);
  });

  it("keeps short history output intact", () => {
    expect(truncateRecordOutput("sortie courte")).toBe("sortie courte");
  });

  it("truncates long history output with the hidden character count", () => {
    const output = "a".repeat(925);
    const truncated = truncateRecordOutput(output);

    expect(truncated).toContain("a".repeat(900));
    expect(truncated).toContain("[sortie tronquee: 25 caracteres masques]");
    expect(truncated).not.toContain("a".repeat(901));
  });
});
