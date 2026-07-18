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
  createAssistantTestConversationTitle,
  createAssistantTestMessage,
  createAssistantToAgentMessage,
  createDirectAgentReplyMessage,
  upsertConversation,
} from "./agent-storage.records";
import { ensureAgentWorkspace } from "./agent-storage.workspace";

type RecordAgentCommandExchangeArgs = {
  agentId: AgentId;
  agentConversationId?: string | null;
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

export async function createAgentUserConversation(
  rootDirectory: string,
  agentId: AgentId,
  title: string,
): Promise<{ conversationId: string }> {
  const workspace = await ensureAgentWorkspace(rootDirectory, agentId);
  const conversation = createAgentConversation(title, "assistant-test");
  await saveChatStateToDirectory(
    upsertConversation(workspace.conversations, conversation),
    getAgentConversationsDirectory(rootDirectory, agentId),
  );

  return { conversationId: conversation.id };
}

export async function appendDirectAgentExchange(
  rootDirectory: string,
  agentId: AgentId,
  prompt: string,
  output: string,
  apiRequests: ChatMessage["apiRequests"],
  conversationId?: string | null,
): Promise<{ conversationId: string }> {
  const workspace = await ensureAgentWorkspace(rootDirectory, agentId);
  const existingConversation = conversationId
    ? workspace.conversations.conversations.find((conversation) => conversation.id === conversationId) ?? null
    : null;
  const conversation = existingConversation
    ?? createAgentConversation(createAssistantTestConversationTitle(prompt), "assistant-test");

  if ((conversation.origin ?? "assistant") !== "assistant-test") {
    throw new Error("Cette conversation agent est en lecture seule.");
  }

  const userMessage = createAssistantTestMessage(agentId, prompt);
  const replyMessage = createDirectAgentReplyMessage(agentId, output);
  replyMessage.apiRequests = apiRequests ?? [];
  const nextConversation: Conversation = {
    ...conversation,
    messages: [...conversation.messages, userMessage, replyMessage],
    updatedAt: replyMessage.createdAt,
  };

  await saveChatStateToDirectory(
    upsertConversation(workspace.conversations, nextConversation),
    getAgentConversationsDirectory(rootDirectory, agentId),
  );

  return { conversationId: nextConversation.id };
}

export async function recordAgentCommandExchange({
  agentId,
  agentConversationId = null,
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
  const resultMessage = createAgentResultMessage(agentId, command, result.output, result.status);
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
