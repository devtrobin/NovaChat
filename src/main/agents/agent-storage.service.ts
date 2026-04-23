import path from "node:path";
import { loadChatStateFromDirectory, saveChatStateToDirectory } from "../chat/chat-storage.service";
import { readJsonFile, writeJsonFile } from "../chat/chat-storage.io";
import {
  AgentContextFile,
  AgentConversationOrigin,
  AgentHistoryEntry,
  AgentId,
  AgentPermissionLookup,
  AgentPermissionsFile,
  AgentWorkspaceData,
} from "../../shared/agent.types";
import { ChatMessage, Conversation, PersistedChatState } from "../../renderer/types/chat.types";
import { toIndex } from "../chat/chat-storage.serialization";
import { createDefaultAgentContext } from "./agent-prompt.service";

function getAgentDirectory(rootDirectory: string, agentId: string): string {
  return path.join(rootDirectory, agentId);
}

function getAgentContextPath(rootDirectory: string, agentId: string): string {
  return path.join(getAgentDirectory(rootDirectory, agentId), "contexte.json");
}

function getAgentPermissionsPath(rootDirectory: string, agentId: string): string {
  return path.join(getAgentDirectory(rootDirectory, agentId), "permissions.json");
}

function getAgentHistoryPath(rootDirectory: string, agentId: string): string {
  return path.join(getAgentDirectory(rootDirectory, agentId), "historique.json");
}

function getAgentConversationsDirectory(rootDirectory: string, agentId: string): string {
  return path.join(getAgentDirectory(rootDirectory, agentId), "conversations");
}

function createDefaultPermissions(): AgentPermissionsFile {
  return {
    rules: [],
  };
}

function createDefaultHistory(): AgentHistoryEntry[] {
  return [];
}

function normalizeRecoveredAssistantRequest(value: string): string {
  return value
    .replace(/^Execute la commande suivante sur le device:\n/i, "")
    .replace(/^Demande d'analyse envoyee a [^:\n]+:\n/i, "")
    .replace(/^Objectif delegue par l'assistant:\n/i, "")
    .trim();
}

function recoverHistoryFromConversations(conversations: PersistedChatState): AgentHistoryEntry[] {
  const entries: AgentHistoryEntry[] = [];

  for (const conversation of conversations.conversations) {
    for (let index = 0; index < conversation.messages.length - 1; index += 2) {
      const assistantMessage = conversation.messages[index];
      const resultMessage = conversation.messages[index + 1];
      if (!assistantMessage || !resultMessage) continue;
      if (assistantMessage.from !== "assistant") continue;
      if (resultMessage.from !== "agent" && resultMessage.from !== "device") continue;

      const recoveredRequest = normalizeRecoveredAssistantRequest(assistantMessage.content);
      const recoveredCommand = resultMessage.from === "device"
        ? resultMessage.content
        : recoveredRequest || assistantMessage.content;
      const recoveredResult = resultMessage.result ?? resultMessage.content;
      const recoveredStatus = resultMessage.status === "success"
        ? "success"
        : resultMessage.status === "partial-success"
          ? "partial-success"
          : /refusee/i.test(recoveredResult)
            ? "denied"
            : /interrompu/i.test(recoveredResult)
              ? "interrupted"
              : "error";

      entries.push({
        agentConversationId: conversation.id,
        assistantRequest: recoveredRequest || assistantMessage.content,
        at: resultMessage.createdAt,
        command: recoveredCommand,
        result: recoveredResult,
        status: recoveredStatus,
        triggerMessageId: "",
        userAssistantConversationId: "",
      });
    }
  }

  return entries.sort((left, right) => right.at.localeCompare(left.at));
}

function createDefaultConversations(): PersistedChatState {
  return {
    activeConversationId: null,
    conversations: [],
  };
}

async function ensureAgentWorkspace(rootDirectory: string, agentId: AgentId): Promise<AgentWorkspaceData> {
  const context = (await readJsonFile<AgentContextFile>(getAgentContextPath(rootDirectory, agentId)))
    ?? createDefaultAgentContext(agentId);
  const permissions = (await readJsonFile<AgentPermissionsFile>(getAgentPermissionsPath(rootDirectory, agentId)))
    ?? createDefaultPermissions();
  const conversations = (await loadChatStateFromDirectory(getAgentConversationsDirectory(rootDirectory, agentId)))
    ?? createDefaultConversations();
  const storedHistory = (await readJsonFile<AgentHistoryEntry[]>(getAgentHistoryPath(rootDirectory, agentId)))
    ?? createDefaultHistory();
  const history = storedHistory.length > 0
    ? storedHistory
    : recoverHistoryFromConversations(conversations);

  await writeJsonFile(getAgentContextPath(rootDirectory, agentId), context);
  await writeJsonFile(getAgentPermissionsPath(rootDirectory, agentId), permissions);
  await writeJsonFile(getAgentHistoryPath(rootDirectory, agentId), history);
  await writeJsonFile(
    path.join(getAgentConversationsDirectory(rootDirectory, agentId), "conversations.json"),
    toIndex(conversations),
  );

  return {
    context,
    conversations,
    history,
    id: agentId,
    permissions,
  };
}

export async function loadAgentWorkspace(rootDirectory: string, agentId: AgentId): Promise<AgentWorkspaceData> {
  return ensureAgentWorkspace(rootDirectory, agentId);
}

export async function saveAgentContext(
  rootDirectory: string,
  agentId: AgentId,
  context: AgentContextFile,
): Promise<AgentContextFile> {
  await writeJsonFile(getAgentContextPath(rootDirectory, agentId), context);
  return context;
}

export async function getAgentPermission(
  rootDirectory: string,
  agentId: AgentId,
  command: string,
): Promise<AgentPermissionLookup> {
  const workspace = await ensureAgentWorkspace(rootDirectory, agentId);
  const matchedRule = workspace.permissions.rules.find((rule) => rule.command === command) ?? null;

  return {
    decision: matchedRule?.decision ?? null,
    matchedRule,
  };
}

export async function saveAgentPermission(
  rootDirectory: string,
  agentId: AgentId,
  command: string,
  decision: "allow" | "deny",
  remember: boolean,
): Promise<AgentPermissionsFile> {
  const workspace = await ensureAgentWorkspace(rootDirectory, agentId);
  const createdAt = new Date().toISOString();
  const nextRule = {
    command,
    createdAt,
    decision,
    remember,
  };
  const nextPermissions: AgentPermissionsFile = {
    rules: [
      nextRule,
      ...workspace.permissions.rules.filter((rule) => rule.command !== command),
    ],
  };

  await writeJsonFile(getAgentPermissionsPath(rootDirectory, agentId), nextPermissions);
  return nextPermissions;
}

export async function deleteAgentPermission(
  rootDirectory: string,
  agentId: AgentId,
  command: string,
): Promise<AgentPermissionsFile> {
  const workspace = await ensureAgentWorkspace(rootDirectory, agentId);
  const nextPermissions: AgentPermissionsFile = {
    rules: workspace.permissions.rules.filter((rule) => rule.command !== command),
  };

  await writeJsonFile(getAgentPermissionsPath(rootDirectory, agentId), nextPermissions);
  return nextPermissions;
}

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

function createAgentConversationTitle(userPrompt: string): string {
  const title = userPrompt.trim().slice(0, 48);
  return title || "Execution device";
}

function createAgentConversation(title: string, origin: AgentConversationOrigin = "assistant"): Conversation {
  const createdAt = new Date().toISOString();
  return {
    createdAt,
    draft: "",
    id: crypto.randomUUID(),
    messages: [],
    origin,
    title,
    updatedAt: createdAt,
  };
}

function createAssistantTestConversationTitle(prompt: string): string {
  const title = prompt.trim().slice(0, 48);
  return title || "Test assistant";
}

function createAssistantTestMessage(agentId: AgentId, prompt: string): ChatMessage {
  const createdAt = new Date().toISOString();

  return {
    agentId,
    apiRequests: [],
    content: prompt,
    createdAt,
    from: "assistant",
    id: crypto.randomUUID(),
    lifecycleLog: [
      {
        at: createdAt,
        details: `Demande assistant simule -> ${agentId} creee.`,
        event: "created",
      },
    ],
    to: "agent",
  };
}

function createDirectAgentReplyMessage(agentId: AgentId, output: string): ChatMessage {
  const createdAt = new Date().toISOString();

  return {
    agentId,
    apiRequests: [],
    content: output,
    createdAt,
    from: "agent",
    id: crypto.randomUUID(),
    lifecycleLog: [
      {
        at: createdAt,
        details: `Reponse ${agentId} -> assistant simule creee.`,
        event: "created",
      },
    ],
    status: "success",
    to: "assistant",
  };
}

function upsertConversation(
  state: PersistedChatState,
  conversation: Conversation,
): PersistedChatState {
  return {
    activeConversationId: conversation.id,
    conversations: [
      conversation,
      ...state.conversations.filter((entry) => entry.id !== conversation.id),
    ],
  };
}

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
  const conversation = existingConversation ?? createAgentConversation(createAssistantTestConversationTitle(prompt), "assistant-test");

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

function createAssistantToAgentMessage(agentId: AgentId, assistantRequest: string, command: string): ChatMessage {
  const createdAt = new Date().toISOString();
  if (agentId !== "device-agent") {
    return {
      agentId,
      apiRequests: [],
      content: `Demande d'analyse envoyee a ${agentId}:\n${assistantRequest}`,
      createdAt,
      from: "assistant",
      id: crypto.randomUUID(),
      lifecycleLog: [
        {
          at: createdAt,
          details: `Demande assistant -> ${agentId} creee.`,
          event: "created",
        },
      ],
      to: "agent",
    };
  }

  const isGoalRequest = /^goal\s*:/i.test(assistantRequest.trim());
  const content = isGoalRequest
    ? `Objectif delegue par l'assistant:\n${assistantRequest.replace(/^goal\s*:\s*/i, "").trim()}\n\nCommande retenue:\n${command}`
    : `Execute la commande suivante sur le device:\n${command}`;

  return {
    apiRequests: [],
    content,
    createdAt,
    from: "assistant",
    id: crypto.randomUUID(),
    lifecycleLog: [
      {
        at: createdAt,
        details: "Demande assistant -> device-agent creee.",
        event: "created",
      },
    ],
    to: "device",
  };
}

function createAgentResultMessage(
  agentId: AgentId,
  command: string,
  output: string,
  status: "denied" | "error" | "interrupted" | "partial-success" | "success",
  // note: interrupted reuses error visual semantics in agent conversation
): ChatMessage {
  const createdAt = new Date().toISOString();
  if (agentId !== "device-agent") {
    return {
      agentId,
      apiRequests: [],
      content: output,
      createdAt,
      from: "agent",
      id: crypto.randomUUID(),
      lifecycleLog: [
        {
          at: createdAt,
          details: `Resultat ${agentId} -> assistant cree.`,
          event: "created",
          metadata: { status },
        },
      ],
      status: status === "success" ? "success" : status === "partial-success" ? "partial-success" : "error",
      to: "assistant",
    };
  }

  return {
    apiRequests: [],
    content: command,
    createdAt,
    from: "device",
    id: crypto.randomUUID(),
    isExpandable: true,
    lifecycleLog: [
      {
        at: createdAt,
        details: "Resultat device-agent -> assistant cree.",
        event: "created",
        metadata: { status },
      },
    ],
    result: output,
    status: status === "success" ? "success" : status === "partial-success" ? "partial-success" : "error",
    to: "assistant",
  };
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
  const conversation = existingConversation ?? createAgentConversation(createAgentConversationTitle(userPrompt), "assistant");
  const nextConversation: Conversation = {
    ...conversation,
    messages: [...conversation.messages, assistantMessage, resultMessage],
    updatedAt: resultMessage.createdAt,
  };
  const nextState: PersistedChatState = {
    activeConversationId: nextConversation.id,
    conversations: [
      nextConversation,
      ...workspace.conversations.conversations.filter((conversation) => conversation.id !== nextConversation.id),
    ],
  };

  await saveChatStateToDirectory(nextState, getAgentConversationsDirectory(rootDirectory, agentId));

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
