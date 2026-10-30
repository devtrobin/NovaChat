import { describe, expect, it } from "vitest";
import { isLikelyShellCommand } from "./agent-task.ael-command";
import {
  createAgentResultMessage,
  createAELAgentSummaryMessage,
  extractAELAgentSummaryOutput,
  normalizeAELStatus,
} from "./agent-task.messages";

describe("agent task messages", () => {
  it("creates a structured ACP result", () => {
    expect(createAgentResultMessage("agent-acp", "Plan prêt.")).toMatchObject({
      agentId: "agent-acp",
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
  ] as const)("formats a %s AEL outcome", (status, heading, detail, messageStatus) => {
    const message = createAELAgentSummaryMessage("Inspecter", "rg --files", "sortie", status);

    expect(message).toMatchObject({
      agentId: "agent-ael",
      content: "sortie",
      from: "agent",
      status: messageStatus,
      to: "assistant",
    });
    expect(message.result).toContain(heading);
    expect(message.result).toContain(detail);
  });

  it("extracts the raw result from technical details", () => {
    const message = createAELAgentSummaryMessage("Inspecter", "rg --files", "résultat utile", "success");

    expect(extractAELAgentSummaryOutput(message)).toBe("résultat utile");
  });

  it("normalizes AEL message statuses", () => {
    expect(normalizeAELStatus("success")).toBe("success");
    expect(normalizeAELStatus("partial-success")).toBe("partial-success");
    expect(normalizeAELStatus("error")).toBe("error");
    expect(normalizeAELStatus("pending")).toBe("error");
  });
});

describe("AEL command detection", () => {
  it.each([
    ["rg --files", true],
    ["cat package.json | rg name", true],
    ["FOO=bar rg --files", true],
    ["Inspecte les fichiers du projet", false],
  ])("classifies %s", (value, expected) => {
    expect(isLikelyShellCommand(value)).toBe(expected);
  });
});
