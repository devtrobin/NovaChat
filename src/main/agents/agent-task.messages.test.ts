import { describe, expect, it } from "vitest";
import { isLikelyShellCommand } from "./agent-task.device-command";
import {
  createAgentResultMessage,
  createDeviceAgentSummaryMessage,
  extractDeviceAgentSummaryOutput,
  normalizeDeviceStatus,
} from "./agent-task.messages";

describe("agent task messages", () => {
  it("creates a structured Planner result", () => {
    expect(createAgentResultMessage("agent-planner", "Plan prêt.")).toMatchObject({
      agentId: "agent-planner",
      content: "Plan prêt.",
      from: "agent",
      status: "success",
      to: "assistant",
    });
  });

  it.each([
    ["success", "Execution terminee.", "Resultat: sortie", "success"],
    ["partial-success", "Execution partiellement reussie.", "Resultat partiel: sortie", "partial-success"],
    ["denied", "Execution non autorisee.", "Motif: sortie", "error"],
    ["error", "Execution echouee.", "Erreur: sortie", "error"],
  ] as const)("formats a %s Device outcome", (status, heading, detail, messageStatus) => {
    const message = createDeviceAgentSummaryMessage("Inspecter", "rg --files", "sortie", status);

    expect(message).toMatchObject({
      agentId: "device-agent",
      content: "sortie",
      from: "agent",
      status: messageStatus,
      to: "assistant",
    });
    expect(message.result).toContain(heading);
    expect(message.result).toContain(detail);
  });

  it("extracts the raw result from technical details", () => {
    const message = createDeviceAgentSummaryMessage("Inspecter", "rg --files", "résultat utile", "success");

    expect(extractDeviceAgentSummaryOutput(message)).toBe("résultat utile");
  });

  it("normalizes Device message statuses", () => {
    expect(normalizeDeviceStatus("success")).toBe("success");
    expect(normalizeDeviceStatus("partial-success")).toBe("partial-success");
    expect(normalizeDeviceStatus("error")).toBe("error");
    expect(normalizeDeviceStatus("pending")).toBe("error");
  });
});

describe("Device command detection", () => {
  it.each([
    ["rg --files", true],
    ["cat package.json | rg name", true],
    ["FOO=bar rg --files", true],
    ["Inspecte les fichiers du projet", false],
  ])("classifies %s", (value, expected) => {
    expect(isLikelyShellCommand(value)).toBe(expected);
  });
});
