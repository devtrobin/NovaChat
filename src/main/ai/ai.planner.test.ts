import { describe, expect, it } from "vitest";
import {
  createPlannerBlockedResponse,
  createPlannerNeedsInfoResponse,
  parsePlannerMessageContent,
} from "./ai.planner";

describe("Planner response parser", () => {
  it("parses a ready plan with one atomic Device step", () => {
    const parsed = parsePlannerMessageContent([
      "STATUS: ready",
      "SUMMARY: Il faut inspecter les fichiers.",
      "AGENT: device-agent",
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
        recommendedAgent: "device-agent",
        request: "Lister les fichiers suivis",
        successCriteria: "La liste des fichiers est disponible",
      },
      status: "ready",
      summary: "Il faut inspecter les fichiers.",
    });
    expect(parsed.debugSummary).toBe("Inspection locale nécessaire");
  });

  it("parses missing information without an executable next step", () => {
    const parsed = parsePlannerMessageContent([
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
    expect(createPlannerNeedsInfoResponse(parsed)).toContain("1. Chemin du projet");
  });

  it("rejects a ready plan missing mandatory fields", () => {
    const parsed = parsePlannerMessageContent([
      "STATUS: ready",
      "SUMMARY: Plan incomplet.",
      "AGENT: device-agent",
      "MODE: goal",
      "GOAL: Inspecter",
      "REQUEST:",
      "SUCCESS: Résultat disponible",
    ].join("\n"));

    expect(parsed.plan).toBeNull();
  });

  it("uses the planner summary for a blocked response", () => {
    const parsed = parsePlannerMessageContent([
      "STATUS: blocked",
      "SUMMARY: Action impossible sans accès.",
      "MISSING:",
      "COMPLETED:",
      "DEBUG: Accès absent",
    ].join("\n"));

    expect(createPlannerBlockedResponse(parsed)).toBe("Action impossible sans accès.");
  });
});
