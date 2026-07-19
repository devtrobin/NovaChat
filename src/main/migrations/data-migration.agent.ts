import { cp, mkdir, rename } from "node:fs/promises";
import path from "node:path";
import { AgentHistoryEntry, AgentPermissionsFile } from "../../shared/agent.types";
import { PersistedChatState } from "../../shared/chat.types";
import {
  loadChatStateFromDirectoryWithRecovery,
  saveChatStateToDirectory,
} from "../chat/chat-storage.service";
import { readJsonFile, writeJsonFile } from "../chat/chat-storage.io";
import { reportStorageIssue } from "../storage/storage-journal";
import {
  dedupeByJson,
  formatTimestamp,
  isRecord,
  pathExists,
  readJsonObject,
} from "./data-migration.shared";

export async function migratePlannerAgent(
  userDataRoot: string,
  actions: string[],
): Promise<void> {
  const settingsPath = path.join(userDataRoot, "settings.json");
  const settings = await readJsonObject(settingsPath);
  if (settings) {
    const migrated = migrateDiagnosticAgentSetting(settings);
    if (migrated.changed) {
      await writeJsonFile(settingsPath, migrated.value);
      actions.push(`settings-agent:${settingsPath}`);
    }
  }
  const agentRoots = new Set([path.join(userDataRoot, "agents")]);
  const configuredRoot = getConfiguredAgentsDirectory(settings);
  if (configuredRoot) agentRoots.add(configuredRoot);
  for (const agentRoot of agentRoots) {
    if (await migrateDiagnosticAgentDirectory(agentRoot)) {
      actions.push(`agent-directory:${agentRoot}`);
    }
  }
}

export async function migrateDiagnosticAgentDirectory(
  agentRoot: string,
): Promise<boolean> {
  const source = path.join(agentRoot, "diagnostic-agent");
  if (!(await pathExists(source))) return false;
  const target = path.join(agentRoot, "agent-planner");
  const backupRoot = path.join(agentRoot, ".migration-backups");
  await mkdir(backupRoot, { recursive: true });
  const backup = path.join(backupRoot, `diagnostic-agent-${formatTimestamp(new Date())}`);
  await rename(source, backup);
  if (!(await pathExists(target))) {
    await cp(backup, target, { recursive: true });
  } else {
    await mergeAgentDirectory(backup, target);
  }
  return true;
}

export function migrateDiagnosticAgentSetting(
  settings: Record<string, unknown>,
): { changed: boolean; value: Record<string, unknown> } {
  if (!isRecord(settings.agents) || !isRecord(settings.agents["diagnostic-agent"])) {
    return { changed: false, value: settings };
  }
  const agents = { ...settings.agents };
  if (!isRecord(agents["agent-planner"])) {
    agents["agent-planner"] = agents["diagnostic-agent"];
  }
  delete agents["diagnostic-agent"];
  return { changed: true, value: { ...settings, agents } };
}

async function mergeAgentDirectory(source: string, target: string): Promise<void> {
  await cp(source, target, { errorOnExist: false, force: false, recursive: true });
  await mergePermissions(source, target);
  await mergeHistory(source, target);
  await mergeConversations(source, target);
}

async function mergePermissions(source: string, target: string): Promise<void> {
  const sourceValue = await readJsonFile<AgentPermissionsFile>(path.join(source, "permissions.json"));
  const targetPath = path.join(target, "permissions.json");
  const targetValue = await readJsonFile<AgentPermissionsFile>(targetPath);
  if (!sourceValue) return;
  const targetCommands = new Set(targetValue?.rules.map(({ command }) => command) ?? []);
  await writeJsonFile(targetPath, {
    rules: [
      ...(targetValue?.rules ?? []),
      ...sourceValue.rules.filter(({ command }) => !targetCommands.has(command)),
    ],
  });
}

async function mergeHistory(source: string, target: string): Promise<void> {
  const sourceValue = await readJsonFile<AgentHistoryEntry[]>(path.join(source, "historique.json"));
  const targetPath = path.join(target, "historique.json");
  const targetValue = await readJsonFile<AgentHistoryEntry[]>(targetPath);
  if (!sourceValue) return;
  await writeJsonFile(
    targetPath,
    dedupeByJson([...(targetValue ?? []), ...sourceValue])
      .sort((left, right) => right.at.localeCompare(left.at)),
  );
}

async function mergeConversations(source: string, target: string): Promise<void> {
  const sourceValue = await loadChatStateFromDirectoryWithRecovery(path.join(source, "conversations"));
  const targetPath = path.join(target, "conversations");
  const targetValue = await loadChatStateFromDirectoryWithRecovery(targetPath);
  const issues = [...sourceValue.issues, ...targetValue.issues];
  if (issues.length > 0) {
    issues.forEach(reportStorageIssue);
    throw new Error("Migration diagnostic-agent interrompue : stockage de conversation invalide.");
  }
  if (sourceValue.state) {
    await saveChatStateToDirectory(
      mergeConversationStates(targetValue.state, sourceValue.state),
      targetPath,
    );
  }
}

function mergeConversationStates(
  target: PersistedChatState | null,
  source: PersistedChatState,
): PersistedChatState {
  const conversations = new Map(
    (target?.conversations ?? []).map((conversation) => [conversation.id, conversation]),
  );
  for (const sourceConversation of source.conversations) {
    const targetConversation = conversations.get(sourceConversation.id);
    if (!targetConversation) {
      conversations.set(sourceConversation.id, sourceConversation);
      continue;
    }
    const messages = new Map(targetConversation.messages.map((message) => [message.id, message]));
    sourceConversation.messages.forEach((message) => {
      if (!messages.has(message.id)) messages.set(message.id, message);
    });
    conversations.set(sourceConversation.id, {
      ...sourceConversation,
      ...targetConversation,
      messages: [...messages.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
      updatedAt: sourceConversation.updatedAt > targetConversation.updatedAt
        ? sourceConversation.updatedAt
        : targetConversation.updatedAt,
    });
  }
  return {
    activeConversationId: target?.activeConversationId ?? source.activeConversationId,
    conversations: [...conversations.values()]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
  };
}

function getConfiguredAgentsDirectory(
  settings: Record<string, unknown> | null,
): string | null {
  if (!settings || !isRecord(settings.localFiles)) return null;
  const value = settings.localFiles.agentsDirectory;
  return typeof value === "string" && path.isAbsolute(value) ? value : null;
}
