import path from "node:path";
import { loadChatStateFromDirectory, saveChatStateToDirectory } from "../chat/chat-storage.service";
import { readJsonFile, writeJsonFile } from "../chat/chat-storage.io";
import {
  AgentContextFile,
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
  const history = (await readJsonFile<AgentHistoryEntry[]>(getAgentHistoryPath(rootDirectory, agentId)))
    ?? createDefaultHistory();
  const conversations = (await loadChatStateFromDirectory(getAgentConversationsDirectory(rootDirectory, agentId)))
    ?? createDefaultConversations();

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
  assistantRequest: string;
  command: string;
  result: {
    output: string;
    status: "denied" | "error" | "success";
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

function createAgentConversation(title: string): Conversation {
  const createdAt = new Date().toISOString();
  return {
    createdAt,
    draft: "",
    id: crypto.randomUUID(),
    messages: [],
    title,
    updatedAt: createdAt,
  };
}

function createAssistantToAgentMessage(assistantRequest: string, command: string): ChatMessage {
  const createdAt = new Date().toISOString();
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
  status: "denied" | "error" | "success",
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
      status: status === "success" ? "success" : "error",
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
    status: status === "success" ? "success" : "error",
    to: "assistant",
  };
}

export async function recordAgentCommandExchange({
  agentId,
  assistantRequest,
  command,
  result,
  rootDirectory,
  triggerMessageId,
  userAssistantConversationId,
  userPrompt,
}: RecordAgentCommandExchangeArgs): Promise<{ agentConversationId: string }> {
  const workspace = await ensureAgentWorkspace(rootDirectory, agentId);
  const conversation = createAgentConversation(createAgentConversationTitle(userPrompt));
  const assistantMessage = createAssistantToAgentMessage(assistantRequest, command);
  const resultMessage = createAgentResultMessage(agentId, command, result.output, result.status);
  const nextConversation: Conversation = {
    ...conversation,
    messages: [assistantMessage, resultMessage],
    updatedAt: resultMessage.createdAt,
  };
  const nextState: PersistedChatState = {
    activeConversationId: nextConversation.id,
    conversations: [nextConversation, ...workspace.conversations.conversations],
  };

  await saveChatStateToDirectory(nextState, getAgentConversationsDirectory(rootDirectory, agentId));

  const nextHistoryEntry: AgentHistoryEntry = {
    agentConversationId: nextConversation.id,
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
