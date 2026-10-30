import { ChatMessage } from "../../shared/chat.types";

export type ACPStepMode = "analysis" | "command" | "goal" | "none";
export type ACPRecommendedAgent = "agent-ael" | "none";
export type ACPStatus = "blocked" | "needs-info" | "ready";

export type ACPNextStep = {
  goal: string;
  mode: ACPStepMode;
  recommendedAgent: ACPRecommendedAgent;
  request: string;
  successCriteria: string;
};

export type ACPPlan = {
  completedSoFar: string[];
  missingInfo: string[];
  nextStep: ACPNextStep;
  status: ACPStatus;
  summary: string;
};

export type ParsedACPMessage = {
  debugSummary: string | null;
  plan: ACPPlan | null;
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

export function parseACPMessageContent(content: string): ParsedACPMessage {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  const debugSummary = extractSection(normalized, "DEBUG");
  const status = normalizeACPStatus(extractInlineValue(normalized, "STATUS"));
  const summary = extractSection(normalized, "SUMMARY")?.trim() ?? "";
  const recommendedAgent = normalizeRecommendedAgent(extractInlineValue(normalized, "AGENT"));
  const mode = normalizeACPStepMode(extractInlineValue(normalized, "MODE"));
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

export function createACPNeedsInfoResponse(parsed: ParsedACPMessage): string {
  const missingInfo = parsed.plan?.missingInfo.filter(Boolean) ?? [];
  const summary = parsed.plan?.summary?.trim() || parsed.debugSummary?.trim() || "Le acp demande des informations complementaires.";

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

export function createACPBlockedResponse(parsed: ParsedACPMessage): string {
  return parsed.plan?.summary?.trim()
    || parsed.debugSummary?.trim()
    || "Le acp n'a pas pu proposer une suite exploitable pour le moment.";
}

export function createACPInvalidResponse(message: ChatMessage): string {
  return [
    "Le acp a renvoye un plan interne illisible.",
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

function normalizeACPStatus(value: string | null): ACPStatus | null {
  if (value === "blocked" || value === "needs-info" || value === "ready") return value;
  return null;
}

function normalizeACPStepMode(value: string | null): ACPStepMode | null {
  if (value === "analysis" || value === "command" || value === "goal" || value === "none") return value;
  return null;
}

function normalizeRecommendedAgent(value: string | null): ACPRecommendedAgent | null {
  if (value === "agent-ael" || value === "none") return value;
  return null;
}
