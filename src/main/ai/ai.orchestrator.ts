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
  createPipelineSystemMessage,
  PipelineStage,
} from "./ai.orchestrator.cycle.messages";
import { handleMissingOpenAIConfig, handleTurnError } from "./ai.orchestrator.errors";
import { finishTurn, startTurn, TurnStoppedError } from "./ai.turn-registry";
import { resolveACPStep } from "./ai.orchestrator.acp-step";
import {
  createOrchestrationBudget,
  MAX_ASSISTANT_CYCLES,
  registerAELResult,
} from "./ai.orchestrator.budget";
import { requestFinalSynthesis } from "./ai.orchestrator.finalization";

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
  const executedACPSteps = new Set<string>();
  const orchestrationBudget = createOrchestrationBudget();
  let assistantCycles = 0;
  const updatePipelineStage = (stage: PipelineStage, agentId?: AgentId) => {
    emit({ conversationId: request.conversationId, messageId: systemMessage.id, type: "remove-message" });
    systemMessage = createPipelineSystemMessage(stage, agentId);
    emit({ conversationId: request.conversationId, messages: [systemMessage], type: "append-messages" });
  };

  try {
    for (let step = 0; step < MAX_ASSISTANT_CYCLES; step += 1) {
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
      assistantCycles = step + 1;

      if (cycleResult.kind === "assistant") {
        emit({ conversationId: request.conversationId, messages: [cycleResult.message], type: "append-messages" });
        emit({ conversationId: request.conversationId, messageId: systemMessage.id, type: "remove-message" });
        return { ok: true };
      }

      if (cycleResult.message.agentId === "agent-acp") {
        const acpResolution = await resolveACPStep({
          conversationId: request.conversationId,
          emit,
          executedACPSteps,
          message: cycleResult.message,
          settings,
          turnId,
          updatePipelineStage,
          userAssistantConversationId: request.conversationId,
          userMessage,
        });

        if (acpResolution.kind === "assistant") {
          emit({ conversationId: request.conversationId, messages: [acpResolution.message], type: "append-messages" });
          emit({ conversationId: request.conversationId, messageId: systemMessage.id, type: "remove-message" });
          return { ok: true };
        }
        if (acpResolution.kind === "finalize") {
          break;
        }

        turnMessages.push(acpResolution.message);
        const budgetDecision = registerAELResult(
          orchestrationBudget,
          acpResolution.message,
        );
        systemMessage = restartAssistantThinking(
          request.conversationId,
          emit,
          systemMessage.id,
          "analyzing-agent-result",
          acpResolution.message.agentId as AgentId | undefined,
        );
        if (acpResolution.message.lifecycleLog?.some((entry) => entry.event === "ael-killed")) {
          appendInterruptedCommandContext(turnMessages);
        }
        if (budgetDecision.duplicateCommand || budgetDecision.aelLimitReached) break;
        continue;
      }

      const budgetDecision = registerAELResult(orchestrationBudget, cycleResult.message);
      systemMessage = restartAssistantThinking(
        request.conversationId,
        emit,
        systemMessage.id,
        "analyzing-agent-result",
        cycleResult.message.agentId as AgentId | undefined,
      );
      if (cycleResult.message.lifecycleLog?.some((entry) => entry.event === "ael-killed")) {
        appendInterruptedCommandContext(turnMessages);
      }
      if (budgetDecision.duplicateCommand || budgetDecision.aelLimitReached) break;
    }

    updatePipelineStage("final-response");
    const finalSynthesis = await requestFinalSynthesis({
      conversationId: request.conversationId,
      emit,
      settings,
      step: assistantCycles,
      turnId,
      turnMessages,
      userMessage,
    });
    emit({
      conversationId: request.conversationId,
      messages: [finalSynthesis.message],
      type: "append-messages",
    });
    emit({
      conversationId: request.conversationId,
      messageId: systemMessage.id,
      type: "remove-message",
    });
    return { ok: finalSynthesis.ok };
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
}
