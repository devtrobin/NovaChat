import { ChatMessage } from "../../renderer/types/chat.types";
import { RunTurnRequest, RunTurnResult } from "../../shared/ai.types";
import { AgentId } from "../../shared/agent.types";
import { AppSettings } from "../../shared/settings.types";
import {
  createInterruptedSystemMessage,
  createUserMessage,
} from "./ai.message-factory";
import {
  isDirectCommand,
  shouldSetTitle,
} from "./ai.orchestrator.runtime";
import { Emit } from "./ai.orchestrator.types";
import { runDirectCommandTurn } from "./ai.orchestrator.commands";
import {
  appendInterruptedCommandContext,
  restartAssistantThinking,
  runAssistantCycle,
} from "./ai.orchestrator.cycle";
import { createPipelineSystemMessage, PipelineStage } from "./ai.orchestrator.cycle.messages";
import { handleMissingOpenAIConfig, handleTurnError } from "./ai.orchestrator.errors";
import { finishTurn, startTurn, TurnStoppedError } from "./ai.turn-registry";

export async function runTurn(
  request: RunTurnRequest,
  settings: AppSettings,
  emit: Emit,
): Promise<RunTurnResult> {
  const userMessage = createUserMessage(request.userInput);
  if (isDirectCommand(request.userInput)) {
    return runDirectCommandTurn(request, userMessage, emit);
  }

  if (!settings.openai.apiKey || !settings.openai.model) {
    return handleMissingOpenAIConfig(request, userMessage, emit);
  }

  if (shouldSetTitle(request)) {
    emit({
      conversationId: request.conversationId,
      title: request.userInput.trim().slice(0, 36) || "Nouvelle conversation",
      type: "set-title",
    });
  }

  let systemMessage = createPipelineSystemMessage("nova-thinking");
  emit({
    conversationId: request.conversationId,
    messages: [userMessage, systemMessage],
    type: "append-messages",
  });

  const turnMessages: ChatMessage[] = [...request.messages, userMessage];
  const turnId = startTurn(request.conversationId);
  const updatePipelineStage = (stage: PipelineStage, agentId?: AgentId) => {
    emit({ conversationId: request.conversationId, messageId: systemMessage.id, type: "remove-message" });
    systemMessage = createPipelineSystemMessage(stage, agentId);
    emit({ conversationId: request.conversationId, messages: [systemMessage], type: "append-messages" });
  };

  try {
    for (let step = 0; step < 4; step += 1) {
      const cycleResult = await runAssistantCycle({
        conversationId: request.conversationId,
        emit,
        onPipelineStageChange: updatePipelineStage,
        settings,
        step,
        turnId,
        turnMessages,
        userMessage,
      });

      if (cycleResult.kind === "assistant") {
        emit({ conversationId: request.conversationId, messages: [cycleResult.message], type: "append-messages" });
        emit({ conversationId: request.conversationId, messageId: systemMessage.id, type: "remove-message" });
        return { ok: true };
      }

      systemMessage = restartAssistantThinking(
        request.conversationId,
        emit,
        systemMessage.id,
        "analyzing-agent-result",
        cycleResult.message.agentId as AgentId | undefined,
      );
      if (cycleResult.message.lifecycleLog?.some((entry) => entry.event === "device-killed")) {
        appendInterruptedCommandContext(turnMessages);
      }
    }
  } catch (error) {
    if (error instanceof TurnStoppedError || (error instanceof DOMException && error.name === "AbortError")) {
      emit({ conversationId: request.conversationId, messageId: systemMessage.id, type: "remove-message" });
      emit({ conversationId: request.conversationId, messages: [createInterruptedSystemMessage()], type: "append-messages" });
      return { ok: false };
    }
    await handleTurnError(request.conversationId, error, emit, systemMessage.id, userMessage);
    return { ok: false };
  } finally {
    finishTurn(turnId);
  }

  emit({ conversationId: request.conversationId, messageId: systemMessage.id, type: "remove-message" });
  return { ok: false };
}
