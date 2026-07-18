import {
  AgentHistoryEntry,
  AgentId,
} from "../../shared/agent.types";
import {
  ChatMessage,
  Conversation,
} from "../../shared/chat.types";
import { saveChatStateToDirectory } from "../chat/chat-storage.service";
import { writeJsonFile } from "../chat/chat-storage.io";
import {
  getAgentConversationsDirectory,
  getAgentHistoryPath,
} from "./agent-storage.paths";
import {
  createAgentConversation,
  createAgentConversationTitle,
  createAgentResultMessage,
  createAssistantToAgentMessage,
  upsertConversation,
} from "./agent-storage.records";
import { ensureAgentWorkspace } from "./agent-storage.workspace";

type RecordAgentCommandExchangeArgs = {
  agentId: AgentId;
  agentConversationId?: string | null;
  apiRequests?: ChatMessage["apiRequests"];
  assistantRequest: string;
  command: string;
  result: {
    output: string;
    status: "denied" | "error" | "interrupted" | "partial-success" | "success";
  };
  rootDirectory: string;
  triggerMessageId: string;
  userAssistantConversationId: string;
  userPrompt: string;
};

export async function recordAgentCommandExchange({
  agentId,
  agentConversationId = null,
  apiRequests = [],
  assistantRequest,
  command,
  result,
  rootDirectory,
  triggerMessageId,
  userAssistantConversationId,
  userPrompt,
}: RecordAgentCommandExchangeArgs): Promise<{ agentConversationId: string }> {
  const workspace = await ensureAgentWorkspace(rootDirectory, agentId);
  const assistantMessage = createAssistantToAgentMessage(agentId, assistantRequest, command);
  const resultMessage = createAgentResultMessage(
    agentId,
    command,
    result.output,
    result.status,
    apiRequests,
  );
  const existingConversation = agentConversationId
    ? workspace.conversations.conversations.find((conversation) => conversation.id === agentConversationId) ?? null
    : null;
  const conversation = existingConversation
    ?? createAgentConversation(createAgentConversationTitle(userPrompt), "assistant");
  const nextConversation: Conversation = {
    ...conversation,
    messages: [...conversation.messages, assistantMessage, resultMessage],
    updatedAt: resultMessage.createdAt,
  };
  await saveChatStateToDirectory(
    upsertConversation(workspace.conversations, nextConversation),
    getAgentConversationsDirectory(rootDirectory, agentId),
  );

  const nextHistoryEntry: AgentHistoryEntry = {
    agentConversationId: nextConversation.id,
    assistantRequest,
    at: resultMessage.createdAt,
    command,
    result: result.output,
    status: result.status,
    triggerMessageId,
    userAssistantConversationId,
  };
  await writeJsonFile(
    getAgentHistoryPath(rootDirectory, agentId),
    [nextHistoryEntry, ...workspace.history],
  );

  return { agentConversationId: nextConversation.id };
}
