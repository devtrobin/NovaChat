import { ApiRequestRecord, ChatMessage } from "../../renderer/types/chat.types";
import { AgentId, AgentTaskRequest } from "../../shared/agent.types";
import { AppSettings } from "../../shared/settings.types";
import { runAgentTask } from "../agents/agent-orchestrator.service";
import { Emit } from "./ai.orchestrator.types";
import { appendLifecycleLog } from "./ai.orchestrator.runtime";
import { generateOpenAIReply } from "./openai.service";
import {
  registerAbortController,
  throwIfTurnStopped,
  unregisterAbortController,
} from "./ai.turn-registry";
import {
  appendUserApiTrace,
  createAssistantResponseMessage,
  createDeviceRequestMessage,
  createInterruptedCommandContextMessage,
  createThinkingSystemMessage,
} from "./ai.orchestrator.cycle.messages";

type RunAssistantCycleArgs = {
  conversationId: string;
  emit: Emit;
  settings: AppSettings;
  step: number;
  turnId: string;
  turnMessages: ChatMessage[];
  userMessage: ChatMessage;
};

export async function runAssistantCycle({
  conversationId,
  emit,
  settings,
  step,
  turnId,
  turnMessages,
  userMessage,
}: RunAssistantCycleArgs): Promise<
  | { kind: "assistant"; message: ChatMessage }
  | { kind: "agent"; message: ChatMessage }
> {
  throwIfTurnStopped(turnId);
  const controller = new AbortController();
  registerAbortController(turnId, controller);
  const { apiRecords, providerResponse } = await generateOpenAIReply(
    settings.openai,
    turnMessages,
    getEnabledAgents(settings),
    controller.signal,
  );
  unregisterAbortController(turnId, controller);
  throwIfTurnStopped(turnId);
  emit({
    conversationId,
    message: appendUserApiTrace(userMessage, apiRecords, step),
    messageId: userMessage.id,
    type: "replace-message",
  });

  if (providerResponse.to === "user") {
    if (shouldForceDiagnosticAgentHandoff(settings, turnMessages, userMessage.content, providerResponse.content)) {
      const handoff = createForcedDiagnosticHandoff(apiRecords, userMessage.content);
      const runningMessage = createDeviceRequestMessage(`Agent ${handoff.agentId}: ${handoff.previewContent}`, handoff.apiRecords);

      const { deviceMessage } = await runAgentTask({
        conversationId,
        emit,
        initialMessage: runningMessage,
        messageId: runningMessage.id,
        settings,
        task: {
          agentId: handoff.agentId,
          mode: handoff.mode,
          request: handoff.request,
          turnId,
          triggerMessageId: userMessage.id,
          userAssistantConversationId: conversationId,
          userPrompt: userMessage.content,
        },
        turnId,
      });

      deviceMessage.apiRequests = [...(runningMessage.apiRequests ?? [])];
      appendLifecycleLog(deviceMessage, "assistant-agent-cycle-complete", `Cycle assistant -> ${handoff.agentId} termine.`);
      turnMessages.push(deviceMessage);
      return { kind: "agent", message: deviceMessage };
    }

    return { kind: "assistant", message: createAssistantResponseMessage(providerResponse.content, apiRecords) };
  }

  const handoff = resolveAgentHandoff({
    apiRecords,
    providerResponse,
  });
  if (!isAgentEnabled(settings, handoff.agentId)) {
    return {
      kind: "assistant",
      message: createAssistantResponseMessage(
        `L'agent ${formatAgentLabel(handoff.agentId)} est actuellement desactive. Je poursuis sans delegation.`,
        apiRecords,
      ),
    };
  }
  const previousAgentMessage = findPreviousAgentMessage(turnMessages, handoff.agentId);
  if (previousAgentMessage) {
    return {
      kind: "assistant",
      message: createAssistantResponseMessage(previousAgentMessage.content, apiRecords),
    };
  }

  const runningMessage = createDeviceRequestMessage(`Agent ${handoff.agentId}: ${handoff.previewContent}`, handoff.apiRecords);
  if (handoff.agentId === "device-agent") {
    emit({ conversationId, messages: [runningMessage], type: "append-messages" });
  }

  const { deviceMessage } = await runAgentTask({
    conversationId,
    emit,
    initialMessage: runningMessage,
    messageId: runningMessage.id,
    settings,
    task: {
      agentId: handoff.agentId,
      mode: handoff.mode,
      request: handoff.request,
      turnId,
      triggerMessageId: userMessage.id,
      userAssistantConversationId: conversationId,
      userPrompt: userMessage.content,
    },
    turnId,
  });

  if (handoff.agentId === "device-agent") {
    emit({ conversationId, messageId: runningMessage.id, type: "remove-message" });
  }
  deviceMessage.apiRequests = [...(runningMessage.apiRequests ?? [])];
  appendLifecycleLog(deviceMessage, "assistant-agent-cycle-complete", `Cycle assistant -> ${handoff.agentId} termine.`);
  turnMessages.push(deviceMessage);

  return { kind: "agent", message: deviceMessage };
}

export function restartAssistantThinking(
  conversationId: string,
  emit: Emit,
  previousSystemMessageId: string,
): ChatMessage {
  emit({
    conversationId,
    messageId: previousSystemMessageId,
    type: "remove-message",
  });
  const nextSystemMessage = createThinkingSystemMessage();
  emit({
    conversationId,
    messages: [nextSystemMessage],
    type: "append-messages",
  });
  return nextSystemMessage;
}

export function appendInterruptedCommandContext(turnMessages: ChatMessage[]): void {
  turnMessages.push(createInterruptedCommandContextMessage());
}

export function appendApiErrorTrace(
  userMessage: ChatMessage,
  apiRecords: ApiRequestRecord[],
  details: string,
): ChatMessage {
  userMessage.apiRequests = [...(userMessage.apiRequests ?? []), ...apiRecords];
  appendLifecycleLog(userMessage, "api-response-error", details);
  return { ...userMessage };
}

type ResolvedAgentHandoff = {
  agentId: "device-agent" | "diagnostic-agent";
  apiRecords: ApiRequestRecord[];
  mode: AgentTaskRequest["mode"];
  previewContent: string;
  request: string;
};

function resolveAgentHandoff(args: {
  apiRecords: ApiRequestRecord[];
  providerResponse: Exclude<Awaited<ReturnType<typeof generateOpenAIReply>>["providerResponse"], { to: "user" }>;
}): ResolvedAgentHandoff {
  const agentId = args.providerResponse.to === "agent" ? args.providerResponse.agentId : "device-agent";
  const content = args.providerResponse.content;
  const goal = agentId === "device-agent" ? extractDeviceGoal(content) : null;
  if (!goal) {
    return {
      agentId,
      apiRecords: args.apiRecords,
      mode: agentId === "device-agent" ? "command" : "analysis",
      previewContent: content,
      request: content,
    };
  }

  return {
    agentId,
    apiRecords: args.apiRecords,
    mode: "goal",
    previewContent: `GOAL: ${goal}`,
    request: goal,
  };
}

function extractDeviceGoal(value: string): string | null {
  const match = value.trim().match(/^(?:goal|objective|task)\s*:\s*([\s\S]+)$/i);
  return match?.[1]?.trim() ? match[1].trim() : null;
}

function shouldForceDiagnosticAgentHandoff(
  settings: AppSettings,
  turnMessages: ChatMessage[],
  userPrompt: string,
  assistantReply: string,
): boolean {
  if (!isAgentEnabled(settings, "diagnostic-agent")) {
    return false;
  }
  const normalizedPrompt = userPrompt.trim().toLowerCase();
  const normalizedReply = assistantReply.trim().toLowerCase();
  const diagnosticSignals = [
    "diagnostic",
    "debug",
    "debugging",
    "h a n d o f f".replace(/\s/g, ""),
    "handoff",
    "workflow",
    "piste",
    "analyse",
    "analyser",
    "echec",
    "erreur",
    "bug",
    "investigation",
  ];

  const promptLooksDiagnostic = diagnosticSignals.some((signal) => normalizedPrompt.includes(signal));
  if (!promptLooksDiagnostic) return false;
  if (turnMessages.some((message) => message.from === "agent" && message.agentId === "diagnostic-agent")) {
    return false;
  }

  const replyAlreadyMentionsDiagnosticAgent = normalizedReply.includes("diagnostic-agent") || normalizedReply.includes("agent diagnostic");
  return !replyAlreadyMentionsDiagnosticAgent;
}

function isAgentEnabled(settings: AppSettings, agentId: AgentId): boolean {
  return settings.agents[agentId]?.enabled ?? true;
}

function getEnabledAgents(settings: AppSettings): AgentId[] {
  return (Object.entries(settings.agents) as Array<[AgentId, { enabled: boolean }]>)
    .filter(([, state]) => state.enabled)
    .map(([agentId]) => agentId);
}

function formatAgentLabel(agentId: AgentId): string {
  return agentId === "device-agent" ? "Device" : "Diagnostic";
}

function createForcedDiagnosticHandoff(apiRecords: ApiRequestRecord[], userPrompt: string): ResolvedAgentHandoff {
  return {
    agentId: "diagnostic-agent",
    apiRecords,
    mode: "analysis",
    previewContent: userPrompt,
    request: userPrompt,
  };
}

function findPreviousAgentMessage(
  turnMessages: ChatMessage[],
  agentId: "device-agent" | "diagnostic-agent",
): ChatMessage | null {
  return [...turnMessages]
    .reverse()
    .find((message) => message.from === "agent" && message.agentId === agentId) ?? null;
}
