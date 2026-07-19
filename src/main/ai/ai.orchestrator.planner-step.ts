import { AgentId, AgentTaskRequest } from "../../shared/agent.types";
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
  createPlannerBlockedResponse,
  createPlannerInvalidResponse,
  createPlannerNeedsInfoResponse,
  parsePlannerMessageContent,
} from "./ai.planner";

type ResolvePlannerStepArgs = {
  conversationId: string;
  emit: Emit;
  executedPlannerSteps: Set<string>;
  message: ChatMessage;
  settings: RuntimeAppSettings;
  turnId: string;
  updatePipelineStage: (stage: PipelineStage, agentId?: AgentId) => void;
  userAssistantConversationId: string;
  userMessage: ChatMessage;
};

export async function resolvePlannerStep({
  conversationId,
  emit,
  executedPlannerSteps,
  message,
  settings,
  turnId,
  updatePipelineStage,
  userAssistantConversationId,
  userMessage,
}: ResolvePlannerStepArgs): Promise<
  | { kind: "assistant"; message: ChatMessage }
  | { kind: "agent"; message: ChatMessage }
> {
  const parsed = parsePlannerMessageContent(message.content);
  const plan = parsed.plan;
  if (!plan) {
    return assistant(createPlannerInvalidResponse(message));
  }
  if (plan.status === "needs-info") {
    return assistant(createPlannerNeedsInfoResponse(parsed));
  }
  if (plan.status === "blocked") {
    return assistant(createPlannerBlockedResponse(parsed));
  }
  if (plan.nextStep.recommendedAgent === "none" || plan.nextStep.mode === "none") {
    return assistant(plan.summary);
  }
  if (plan.nextStep.recommendedAgent !== "device-agent") {
    return assistant(
      `Le planner a recommande un agent non pris en charge: ${plan.nextStep.recommendedAgent}.`,
    );
  }

  const stepSignature = createStepSignature(plan.nextStep);
  if (executedPlannerSteps.has(stepSignature)) {
    return assistant(
      "Le planner a repropose exactement la meme etape. J'arrete ici pour eviter une boucle interne.",
    );
  }
  executedPlannerSteps.add(stepSignature);
  updatePipelineStage("requesting-agent", "device-agent");
  const delegationMessage = createAgentRequestMessage(
    "device-agent",
    plan.nextStep.request,
    [],
  );
  emit({ conversationId, messages: [delegationMessage], type: "append-messages" });
  const { deviceMessage } = await runAgentTask({
    conversationId,
    emit,
    messageId: delegationMessage.id,
    onPipelineStageChange: updatePipelineStage,
    settings,
    task: {
      agentId: "device-agent",
      mode: plan.nextStep.mode as AgentTaskRequest["mode"],
      request: plan.nextStep.request,
      triggerMessageId: userMessage.id,
      turnId,
      userAssistantConversationId,
      userPrompt: userMessage.content,
    },
    turnId,
  });
  emit({ conversationId, messages: [deviceMessage], type: "append-messages" });
  return { kind: "agent", message: deviceMessage };
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
    goal: nextStep.goal,
    mode: nextStep.mode,
    request: nextStep.request,
    successCriteria: nextStep.successCriteria,
  });
}
