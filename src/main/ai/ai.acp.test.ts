import { describe, expect, it } from "vitest";
import {
  createACPBlockedResponse,
  createACPNeedsInfoResponse,
  parseACPMessageContent,
} from "./ai.acp";

describe("ACP response parser", () => {
  it("parses a ready plan with one atomic AEL step", () => {
    const parsed = parseACPMessageContent([
      "STATUS: ready",
      "SUMMARY: Il faut inspecter les fichiers.",
      "AGENT: agent-ael",
      "MODE: goal",
      "GOAL: Cartographier le dépôt",
      "REQUEST: Lister les fichiers suivis",
      "SUCCESS: La liste des fichiers est disponible",
      "MISSING:",
      "COMPLETED:",
      "- Demande comprise",
      "DEBUG: Inspection locale nécessaire",
    ].join("\n"));

    expect(parsed.plan).toEqual({
      completedSoFar: ["Demande comprise"],
      missingInfo: [],
      nextStep: {
        goal: "Cartographier le dépôt",
        mode: "goal",
        recommendedAgent: "agent-ael",
        request: "Lister les fichiers suivis",
        successCriteria: "La liste des fichiers est disponible",
      },
      status: "ready",
      summary: "Il faut inspecter les fichiers.",
    });
    expect(parsed.debugSummary).toBe("Inspection locale nécessaire");
  });

  it("parses missing information without an executable next step", () => {
    const parsed = parseACPMessageContent([
      "STATUS: needs-info",
      "SUMMARY: Une précision est nécessaire.",
      "AGENT: none",
      "MODE: none",
      "GOAL:",
      "REQUEST:",
      "SUCCESS:",
      "MISSING:",
      "- Chemin du projet",
      "COMPLETED:",
      "DEBUG: Aucun chemin reçu",
    ].join("\n"));

    expect(parsed.plan?.status).toBe("needs-info");
    expect(parsed.plan?.missingInfo).toEqual(["Chemin du projet"]);
    expect(parsed.plan?.nextStep).toEqual({
      goal: "",
      mode: "none",
      recommendedAgent: "none",
      request: "",
      successCriteria: "",
    });
    expect(createACPNeedsInfoResponse(parsed)).toContain("1. Chemin du projet");
  });

  it("rejects a ready plan missing mandatory fields", () => {
    const parsed = parseACPMessageContent([
      "STATUS: ready",
      "SUMMARY: Plan incomplet.",
      "AGENT: agent-ael",
      "MODE: goal",
      "GOAL: Inspecter",
      "REQUEST:",
      "SUCCESS: Résultat disponible",
    ].join("\n"));

    expect(parsed.plan).toBeNull();
  });

  it("uses the acp summary for a blocked response", () => {
    const parsed = parseACPMessageContent([
      "STATUS: blocked",
      "SUMMARY: Action impossible sans accès.",
      "MISSING:",
      "COMPLETED:",
      "DEBUG: Accès absent",
    ].join("\n"));

    expect(createACPBlockedResponse(parsed)).toBe("Action impossible sans accès.");
  });
});
