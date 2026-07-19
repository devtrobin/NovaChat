import {
  AgentContextFile,
  AgentHistoryEntry,
  AgentId,
  AgentPermissionLookup,
  AgentPermissionsFile,
  AgentWorkspaceData,
} from "../../shared/agent.types";
import { loadChatStateFromDirectoryWithRecovery } from "../chat/chat-storage.service";
import { readJsonFileDetailed, writeJsonFile } from "../chat/chat-storage.io";
import { toIndex } from "../chat/chat-storage.serialization";
import {
  assertStorageWritable,
  registerStorageRecovery,
  StorageRecoveryRequiredError,
} from "../storage/storage-recovery.registry";
import { migrateAgentContext } from "./agent-context.migration";
import {
  getAgentContextPath,
  getAgentConversationsDirectory,
  getAgentConversationsIndexPath,
  getAgentDirectory,
  getAgentHistoryPath,
  getAgentPermissionsPath,
} from "./agent-storage.paths";
import { runAgentStorageOperation } from "./agent-storage.queue";
import {
  createDefaultConversations,
  createDefaultHistory,
  createDefaultPermissions,
  recoverHistoryFromConversations,
} from "./agent-storage.recovery";

export async function ensureAgentWorkspaceUnlocked(
  rootDirectory: string,
  agentId: AgentId,
): Promise<AgentWorkspaceData> {
  const contextResult = await readJsonFileDetailed<unknown>(
    getAgentContextPath(rootDirectory, agentId),
  );
  const permissionsResult = await readJsonFileDetailed<AgentPermissionsFile>(
    getAgentPermissionsPath(rootDirectory, agentId),
  );
  const conversationsResult = await loadChatStateFromDirectoryWithRecovery(
    getAgentConversationsDirectory(rootDirectory, agentId),
  );
  const historyResult = await readJsonFileDetailed<AgentHistoryEntry[]>(
    getAgentHistoryPath(rootDirectory, agentId),
  );
  const issues = [
    ...contextResult.issues,
    ...permissionsResult.issues,
    ...conversationsResult.issues,
    ...historyResult.issues,
  ];
  const context = migrateAgentContext(agentId, contextResult.value);
  const permissions = permissionsResult.value ?? createDefaultPermissions();
  const conversations = conversationsResult.state ?? createDefaultConversations();
  const storedHistory = historyResult.value ?? createDefaultHistory();
  const history = storedHistory.length > 0
    ? storedHistory
    : recoverHistoryFromConversations(conversations);
  const storageRecovery = registerStorageRecovery(
    getAgentDirectory(rootDirectory, agentId),
    issues,
  );

  if (!storageRecovery) {
    await writeJsonFile(getAgentContextPath(rootDirectory, agentId), context);
    await writeJsonFile(getAgentPermissionsPath(rootDirectory, agentId), permissions);
    await writeJsonFile(getAgentHistoryPath(rootDirectory, agentId), history);
    await writeJsonFile(getAgentConversationsIndexPath(rootDirectory, agentId), toIndex(conversations));
  }

  return {
    context,
    conversations,
    history,
    id: agentId,
    permissions,
    storageRecovery: storageRecovery ?? undefined,
  };
}

export async function ensureAgentWorkspace(
  rootDirectory: string,
  agentId: AgentId,
): Promise<AgentWorkspaceData> {
  const workspace = await ensureAgentWorkspaceUnlocked(rootDirectory, agentId);
  assertWorkspaceRecovered(workspace);
  return workspace;
}

export async function loadAgentWorkspace(
  rootDirectory: string,
  agentId: AgentId,
): Promise<AgentWorkspaceData> {
  return runAgentStorageOperation(rootDirectory, agentId, () =>
    ensureAgentWorkspace(rootDirectory, agentId));
}

export async function loadAgentWorkspaceForUi(
  rootDirectory: string,
  agentId: AgentId,
): Promise<AgentWorkspaceData> {
  return runAgentStorageOperation(rootDirectory, agentId, () =>
    ensureAgentWorkspaceUnlocked(rootDirectory, agentId));
}

export async function saveAgentContext(
  rootDirectory: string,
  agentId: AgentId,
  context: AgentContextFile,
): Promise<AgentContextFile> {
  return runAgentStorageOperation(rootDirectory, agentId, async () => {
    await ensureAgentWorkspace(rootDirectory, agentId);
    assertStorageWritable(getAgentDirectory(rootDirectory, agentId));
    const migratedContext = migrateAgentContext(agentId, context);
    await writeJsonFile(getAgentContextPath(rootDirectory, agentId), migratedContext);
    return migratedContext;
  });
}

export async function getAgentPermission(
  rootDirectory: string,
  agentId: AgentId,
  command: string,
): Promise<AgentPermissionLookup> {
  return runAgentStorageOperation(rootDirectory, agentId, async () => {
    const workspace = await ensureAgentWorkspace(rootDirectory, agentId);
    const matchedRule = workspace.permissions.rules.find((rule) => rule.command === command) ?? null;

    return {
      decision: matchedRule?.decision ?? null,
      matchedRule,
    };
  });
}

export async function saveAgentPermission(
  rootDirectory: string,
  agentId: AgentId,
  command: string,
  decision: "allow" | "deny",
  remember: boolean,
): Promise<AgentPermissionsFile> {
  return runAgentStorageOperation(rootDirectory, agentId, async () => {
    const workspace = await ensureAgentWorkspaceUnlocked(rootDirectory, agentId);
    assertWorkspaceRecovered(workspace);
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

    assertStorageWritable(getAgentDirectory(rootDirectory, agentId));
    await writeJsonFile(getAgentPermissionsPath(rootDirectory, agentId), nextPermissions);
    return nextPermissions;
  });
}

export async function deleteAgentPermission(
  rootDirectory: string,
  agentId: AgentId,
  command: string,
): Promise<AgentPermissionsFile> {
  return runAgentStorageOperation(rootDirectory, agentId, async () => {
    const workspace = await ensureAgentWorkspaceUnlocked(rootDirectory, agentId);
    assertWorkspaceRecovered(workspace);
    const nextPermissions: AgentPermissionsFile = {
      rules: workspace.permissions.rules.filter((rule) => rule.command !== command),
    };

    assertStorageWritable(getAgentDirectory(rootDirectory, agentId));
    await writeJsonFile(getAgentPermissionsPath(rootDirectory, agentId), nextPermissions);
    return nextPermissions;
  });
}

function assertWorkspaceRecovered(workspace: AgentWorkspaceData): void {
  if (workspace.storageRecovery) {
    throw new StorageRecoveryRequiredError(workspace.storageRecovery);
  }
}
