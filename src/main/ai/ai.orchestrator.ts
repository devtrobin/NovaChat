import { ChatMessage } from "../../shared/chat.types";
import { RunTurnRequest, RunTurnResult } from "../../shared/ai.types";
import { AgentId } from "../../shared/agent.types";
import { RuntimeAppSettings } from "../../shared/settings.types";
import {
  createInterruptedSystemMessage,
  createUserMessage,
} from "./ai.message-factory";
import {
  isDirectCommand,
  isSlashCommand,
  shouldSetTitle,
} from "./ai.orchestrator.runtime";
import { Emit } from "./ai.orchestrator.types";
import { runDirectCommandTurn } from "./ai.orchestrator.commands";
import { runSlashCommandTurn } from "./ai.orchestrator.slash-commands";
import { runAssistantCycle } from "./ai.orchestrator.cycle";
import {
  appendInterruptedCommandContext,
  restartAssistantThinking,
} from "./ai.orchestrator.cycle.state";
import {
  createAssistantResponseMessage,
  createPipelineSystemMessage,
  PipelineStage,
} from "./ai.orchestrator.cycle.messages";
import { handleMissingOpenAIConfig, handleTurnError } from "./ai.orchestrator.errors";
import { finishTurn, startTurn, TurnStoppedError } from "./ai.turn-registry";
import { resolvePlannerStep } from "./ai.orchestrator.planner-step";

export async function runTurn(
  request: RunTurnRequest,
  settings: RuntimeAppSettings,
  emit: Emit,
): Promise<RunTurnResult> {
  const userMessage = createUserMessage(request.userInput);
  if (isDirectCommand(request.userInput)) {
    return runDirectCommandTurn(request, settings, userMessage, emit);
  }
  if (isSlashCommand(request.userInput)) {
    return runSlashCommandTurn(request, settings, userMessage, emit);
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
  const executedPlannerSteps = new Set<string>();
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

      if (cycleResult.message.agentId === "agent-planner") {
        const plannerResolution = await resolvePlannerStep({
          conversationId: request.conversationId,
          emit,
          executedPlannerSteps,
          message: cycleResult.message,
          settings,
          turnId,
          updatePipelineStage,
          userAssistantConversationId: request.conversationId,
          userMessage,
        });

        if (plannerResolution.kind === "assistant") {
          emit({ conversationId: request.conversationId, messages: [plannerResolution.message], type: "append-messages" });
          emit({ conversationId: request.conversationId, messageId: systemMessage.id, type: "remove-message" });
          return { ok: true };
        }

        turnMessages.push(plannerResolution.message);
        systemMessage = restartAssistantThinking(
          request.conversationId,
          emit,
          systemMessage.id,
          "analyzing-agent-result",
          plannerResolution.message.agentId as AgentId | undefined,
        );
        if (plannerResolution.message.lifecycleLog?.some((entry) => entry.event === "device-killed")) {
          appendInterruptedCommandContext(turnMessages);
        }
        continue;
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
  emit({
    conversationId: request.conversationId,
    messages: [createAssistantResponseMessage(
      "Je me suis arrete avant de pouvoir finaliser une reponse exploitable. Le workflow interne a atteint sa limite de securite. Reformule la demande ou reduis-la a une etape plus precise.",
      [],
    )],
    type: "append-messages",
  });
  return { ok: false };
}
