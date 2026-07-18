import { AgentId } from "../../shared/agent.types";
import { AppSettings } from "../../shared/settings.types";
import {
  appendDirectAgentExchange,
  createAgentUserConversation,
  loadAgentWorkspace,
} from "./agent-storage.service";
import { createAgentRuntimeContext } from "./agent-prompt.service";
import { generateAgentTextReply } from "../ai/openai.service";
import {
  completeActiveAgentTask,
  finishTurn,
  registerAbortController,
  registerActiveAgentTask,
  startTurn,
  throwIfTurnStopped,
  unregisterAbortController,
} from "../ai/ai.turn-registry";

export async function createDirectAgentConversation(
  settings: AppSettings,
  agentId: AgentId,
  title: string,
): Promise<{ conversationId: string }> {
  return createAgentUserConversation(settings.localFiles.agentsDirectory, agentId, title);
}

export async function runDirectAgentConversationTurn(
  settings: AppSettings,
  agentId: AgentId,
  prompt: string,
  conversationId?: string | null,
): Promise<{ conversationId: string }> {
  const workspace = await loadAgentWorkspace(settings.localFiles.agentsDirectory, agentId);
  const targetConversation = conversationId
    ? workspace.conversations.conversations.find((conversation) => conversation.id === conversationId) ?? null
    : null;
  const turnConversationId = targetConversation?.id ?? crypto.randomUUID();
  const turnId = startTurn(turnConversationId);
  const title = targetConversation?.title ?? (prompt.trim().slice(0, 48) || "Conversation agent");
  const activeTask = registerActiveAgentTask(turnId, {
    agentId,
    conversationId: turnConversationId,
    request: prompt,
    startedAt: new Date().toISOString(),
    status: "running",
    title,
  });

  try {
    const runtimeContext = createAgentRuntimeContext(settings.activeProvider);
    const controller = new AbortController();
    registerAbortController(turnId, controller);
    const agentReply = await generateAgentTextReply(
      settings.openai,
      agentId,
      workspace.context,
      runtimeContext,
      prompt,
      prompt,
      "assistant",
      controller.signal,
    );
    unregisterAbortController(turnId, controller);
    throwIfTurnStopped(turnId);

    return appendDirectAgentExchange(
      settings.localFiles.agentsDirectory,
      agentId,
      prompt,
      agentReply.text,
      agentReply.apiRecords ?? [],
      targetConversation?.id ?? null,
    );
  } finally {
    completeActiveAgentTask(activeTask.taskId);
    finishTurn(turnId);
  }
}
