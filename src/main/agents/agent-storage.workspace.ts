import {
  AgentContextFile,
  AgentHistoryEntry,
  AgentId,
  AgentPermissionLookup,
  AgentPermissionsFile,
  AgentWorkspaceData,
} from "../../shared/agent.types";
import { loadChatStateFromDirectory } from "../chat/chat-storage.service";
import { readJsonFile, writeJsonFile } from "../chat/chat-storage.io";
import { toIndex } from "../chat/chat-storage.serialization";
import { createDefaultAgentContext } from "./agent-prompt.service";
import {
  getAgentContextPath,
  getAgentConversationsDirectory,
  getAgentConversationsIndexPath,
  getAgentHistoryPath,
  getAgentPermissionsPath,
} from "./agent-storage.paths";
import {
  createDefaultConversations,
  createDefaultHistory,
  createDefaultPermissions,
  recoverHistoryFromConversations,
} from "./agent-storage.recovery";

export async function ensureAgentWorkspace(
  rootDirectory: string,
  agentId: AgentId,
): Promise<AgentWorkspaceData> {
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
  await writeJsonFile(getAgentConversationsIndexPath(rootDirectory, agentId), toIndex(conversations));

  return {
    context,
    conversations,
    history,
    id: agentId,
    permissions,
  };
}

export async function loadAgentWorkspace(
  rootDirectory: string,
  agentId: AgentId,
): Promise<AgentWorkspaceData> {
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
