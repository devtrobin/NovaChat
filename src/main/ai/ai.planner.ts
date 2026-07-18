import { ChatMessage } from "../../renderer/types/chat.types";

export type PlannerStepMode = "analysis" | "command" | "goal" | "none";
export type PlannerRecommendedAgent = "device-agent" | "none";
export type PlannerStatus = "blocked" | "needs-info" | "ready";

export type PlannerNextStep = {
  goal: string;
  mode: PlannerStepMode;
  recommendedAgent: PlannerRecommendedAgent;
  request: string;
  successCriteria: string;
};

export type PlannerPlan = {
  completedSoFar: string[];
  missingInfo: string[];
  nextStep: PlannerNextStep;
  status: PlannerStatus;
  summary: string;
};

export type ParsedPlannerMessage = {
  debugSummary: string | null;
  plan: PlannerPlan | null;
};

const SECTION_LABELS = [
  "STATUS",
  "SUMMARY",
  "AGENT",
  "MODE",
  "GOAL",
  "REQUEST",
  "SUCCESS",
  "MISSING",
  "COMPLETED",
  "DEBUG",
] as const;

export function parsePlannerMessageContent(content: string): ParsedPlannerMessage {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  const debugSummary = extractSection(normalized, "DEBUG");
  const status = normalizePlannerStatus(extractInlineValue(normalized, "STATUS"));
  const summary = extractSection(normalized, "SUMMARY")?.trim() ?? "";
  const recommendedAgent = normalizeRecommendedAgent(extractInlineValue(normalized, "AGENT"));
  const mode = normalizePlannerStepMode(extractInlineValue(normalized, "MODE"));
  const goal = extractSection(normalized, "GOAL")?.trim() ?? "";
  const request = extractSection(normalized, "REQUEST")?.trim() ?? "";
  const successCriteria = extractSection(normalized, "SUCCESS")?.trim() ?? "";
  const missingInfo = extractListSection(normalized, "MISSING");
  const completedSoFar = extractListSection(normalized, "COMPLETED");

  if (!status || !summary) {
    return { debugSummary, plan: null };
  }

  if (status === "needs-info") {
    return {
      debugSummary,
      plan: {
        completedSoFar,
        missingInfo,
        nextStep: {
          goal: "",
          mode: "none",
          recommendedAgent: "none",
          request: "",
          successCriteria: "",
        },
        status,
        summary,
      },
    };
  }

  if (status === "blocked") {
    return {
      debugSummary,
      plan: {
        completedSoFar,
        missingInfo,
        nextStep: {
          goal: "",
          mode: "none",
          recommendedAgent: "none",
          request: "",
          successCriteria: "",
        },
        status,
        summary,
      },
    };
  }

  if (!recommendedAgent || !mode || !goal || !successCriteria) {
    return { debugSummary, plan: null };
  }

  if (mode !== "none" && !request) {
    return { debugSummary, plan: null };
  }

  return {
    debugSummary,
    plan: {
      completedSoFar,
      missingInfo,
      nextStep: {
        goal,
        mode,
        recommendedAgent,
        request,
        successCriteria,
      },
      status,
      summary,
    },
  };
}

export function createPlannerNeedsInfoResponse(parsed: ParsedPlannerMessage): string {
  const missingInfo = parsed.plan?.missingInfo.filter(Boolean) ?? [];
  const summary = parsed.plan?.summary?.trim() || parsed.debugSummary?.trim() || "Le planner demande des informations complementaires.";

  if (!missingInfo.length) {
    return summary;
  }

  return [
    summary,
    "",
    "Il me manque encore :",
    ...missingInfo.map((item, index) => `${index + 1}. ${item}`),
  ].join("\n");
}

export function createPlannerBlockedResponse(parsed: ParsedPlannerMessage): string {
  return parsed.plan?.summary?.trim()
    || parsed.debugSummary?.trim()
    || "Le planner n'a pas pu proposer une suite exploitable pour le moment.";
}

export function createPlannerInvalidResponse(message: ChatMessage): string {
  return [
    "Le planner a renvoye un plan interne illisible.",
    "Je ne poursuis pas automatiquement pour eviter une boucle.",
    "",
    "Format attendu : STATUS, SUMMARY, AGENT, MODE, GOAL, REQUEST, SUCCESS, MISSING, COMPLETED, DEBUG.",
    "",
    "Resume brut :",
    message.content.slice(0, 800),
  ].join("\n");
}

function extractInlineValue(content: string, label: typeof SECTION_LABELS[number]): string | null {
  const match = content.match(new RegExp(`(?:^|\\n)${label}:[ \\t]*([^\\n]+)`, "i"));
  return match?.[1]?.trim() || null;
}

function extractSection(content: string, label: typeof SECTION_LABELS[number]): string | null {
  const allLabelsPattern = SECTION_LABELS.join("|");
  const match = content.match(new RegExp(`(?:^|\\n)${label}:[ \\t]*([\\s\\S]*?)(?=\\n(?:${allLabelsPattern}):|$)`, "i"));
  return match?.[1]?.trim() || null;
}

function extractListSection(content: string, label: typeof SECTION_LABELS[number]): string[] {
  const section = extractSection(content, label);
  if (!section) return [];

  return section
    .split("\n")
    .map((line) => line.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
}

function normalizePlannerStatus(value: string | null): PlannerStatus | null {
  if (value === "blocked" || value === "needs-info" || value === "ready") return value;
  return null;
}

function normalizePlannerStepMode(value: string | null): PlannerStepMode | null {
  if (value === "analysis" || value === "command" || value === "goal" || value === "none") return value;
  return null;
}

function normalizeRecommendedAgent(value: string | null): PlannerRecommendedAgent | null {
  if (value === "device-agent" || value === "none") return value;
  return null;
}
