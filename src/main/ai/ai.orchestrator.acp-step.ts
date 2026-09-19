import { AgentId } from "../../shared/agent.types";
import { ChatMessage } from "../../shared/chat.types";
import { RuntimeAppSettings } from "../../shared/settings.types";
import { runAgentTask } from "../agents/agent-orchestrator.service";
import {
  createAgentRequestMessage,
  createAssistantResponseMessage,
  PipelineStage,
} from "./ai.orchestrator.cycle.messages";
import { Emit } from "./ai.orchestrator.types";
import {
  createACPBlockedResponse,
  createACPInvalidResponse,
  createACPNeedsInfoResponse,
  parseACPMessageContent,
} from "./ai.acp";

type ResolveACPStepArgs = {
  conversationId: string;
  emit: Emit;
  executedACPSteps: Set<string>;
  message: ChatMessage;
  settings: RuntimeAppSettings;
  turnId: string;
  updatePipelineStage: (stage: PipelineStage, agentId?: AgentId) => void;
  userAssistantConversationId: string;
  userMessage: ChatMessage;
};

export async function resolveACPStep({
  conversationId,
  emit,
  executedACPSteps,
  message,
  settings,
  turnId,
  updatePipelineStage,
  userAssistantConversationId,
  userMessage,
}: ResolveACPStepArgs): Promise<
  | { kind: "assistant"; message: ChatMessage }
  | { kind: "agent"; message: ChatMessage }
  | { kind: "finalize" }
> {
  const parsed = parseACPMessageContent(message.content);
  const plan = parsed.plan;
  if (!plan) {
    return assistant(createACPInvalidResponse(message));
  }
  if (plan.status === "needs-info") {
    return assistant(createACPNeedsInfoResponse(parsed));
  }
  if (plan.status === "blocked") {
    return assistant(createACPBlockedResponse(parsed));
  }
  if (plan.nextStep.recommendedAgent === "none" || plan.nextStep.mode === "none") {
    return assistant(plan.summary);
  }
  if (plan.nextStep.recommendedAgent !== "agent-ael") {
    return assistant(
      `Le acp a recommande un agent non pris en charge: ${plan.nextStep.recommendedAgent}.`,
    );
  }

  const stepSignature = createStepSignature(plan.nextStep);
  if (executedACPSteps.has(stepSignature)) {
    return { kind: "finalize" };
  }
  executedACPSteps.add(stepSignature);
  updatePipelineStage("requesting-agent", "agent-ael");
  const delegationMessage = createAgentRequestMessage(
    "agent-ael",
    plan.nextStep.request,
    [],
  );
  emit({ conversationId, messages: [delegationMessage], type: "append-messages" });
  const { aelMessage } = await runAgentTask({
    conversationId,
    emit,
    messageId: delegationMessage.id,
    onPipelineStageChange: updatePipelineStage,
    settings,
    task: {
      agentId: "agent-ael",
      mode: "goal",
      request: plan.nextStep.request,
      triggerMessageId: userMessage.id,
      turnId,
      userAssistantConversationId,
      userPrompt: userMessage.content,
    },
    turnId,
  });
  emit({ conversationId, messages: [aelMessage], type: "append-messages" });
  return { kind: "agent", message: aelMessage };
}

function assistant(content: string): { kind: "assistant"; message: ChatMessage } {
  return {
    kind: "assistant",
    message: createAssistantResponseMessage(content, []),
  };
}

function createStepSignature(
  nextStep: {
    goal: string;
    mode: string;
    recommendedAgent: string;
    request: string;
    successCriteria: string;
  },
): string {
  return JSON.stringify({
    agentId: nextStep.recommendedAgent,
    goal: normalizeSignaturePart(nextStep.goal),
    request: normalizeSignaturePart(nextStep.request),
  });
}

function normalizeSignaturePart(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
