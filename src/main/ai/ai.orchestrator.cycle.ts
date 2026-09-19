import { ChatMessage } from "../../shared/chat.types";
import { AgentId } from "../../shared/agent.types";
import { RuntimeAppSettings } from "../../shared/settings.types";
import { runAgentHandoff } from "./ai.orchestrator.agent-cycle";
import { requestAssistantReply } from "./ai.orchestrator.assistant-request";
import {
  appendUserApiTrace,
  createAssistantResponseMessage,
  PipelineStage,
} from "./ai.orchestrator.cycle.messages";
import { resolveAgentHandoff } from "./ai.orchestrator.handoff";
import {
  createForcedACPHandoff,
  formatAgentLabel,
  isAgentEnabled,
  shouldForceACPAgentHandoff,
} from "./ai.orchestrator.acp-handoff";
import { Emit } from "./ai.orchestrator.types";
import { throwIfTurnStopped } from "./ai.turn-registry";

type RunAssistantCycleArgs = {
  conversationId: string;
  emit: Emit;
  settings: RuntimeAppSettings;
  onPipelineStageChange?: (stage: PipelineStage, agentId?: AgentId) => void;
  step: number;
  turnId: string;
  turnMessages: ChatMessage[];
  userMessage: ChatMessage;
};

export async function runAssistantCycle({
  conversationId,
  emit,
  settings,
  onPipelineStageChange,
  step,
  turnId,
  turnMessages,
  userMessage,
}: RunAssistantCycleArgs): Promise<{ kind: "assistant"; message: ChatMessage } | { kind: "agent"; message: ChatMessage }> {
  throwIfTurnStopped(turnId);
  onPipelineStageChange?.(step === 0 ? "nova-thinking" : "final-response");
  const { apiRecords, providerResponse } = await requestAssistantReply(settings, turnId, turnMessages);
  throwIfTurnStopped(turnId);
  emit({
    conversationId,
    message: appendUserApiTrace(userMessage, apiRecords, step),
    messageId: userMessage.id,
    type: "replace-message",
  });

  if (providerResponse.to === "user") {
    if (!shouldForceACPAgentHandoff(
      settings,
      step,
      turnMessages,
      userMessage.content,
      providerResponse.content,
    )) {
      return {
        kind: "assistant",
        message: createAssistantResponseMessage(providerResponse.content, apiRecords),
      };
    }

    return runAgentHandoff({
      conversationId,
      emit,
      handoff: createForcedACPHandoff(apiRecords, userMessage.content),
      onPipelineStageChange,
      settings,
      turnId,
      turnMessages,
      userMessage,
    });
  }

  const handoff = resolveAgentHandoff({ apiRecords, providerResponse });
  if (!isAgentEnabled(settings, handoff.agentId)) {
    return {
      kind: "assistant",
      message: createAssistantResponseMessage(
        `L'agent ${formatAgentLabel(handoff.agentId)} est actuellement desactive. Je poursuis sans delegation.`,
        apiRecords,
      ),
    };
  }

  return runAgentHandoff({
    conversationId,
    emit,
    handoff,
    onPipelineStageChange,
    settings,
    turnId,
    turnMessages,
    userMessage,
  });
}
