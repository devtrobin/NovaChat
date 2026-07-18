import { cp, mkdir, readFile, rename, stat } from "node:fs/promises";
import path from "node:path";
import { AgentHistoryEntry, AgentPermissionsFile } from "../../shared/agent.types";
import { PersistedChatState } from "../../shared/chat.types";
import {
  loadChatStateFromDirectoryWithRecovery,
  saveChatStateToDirectory,
} from "../chat/chat-storage.service";
import {
  createStorageIssue,
  readJsonFile,
  writeJsonFile,
} from "../chat/chat-storage.io";
import { reportStorageIssue } from "../storage/storage-journal";

type MigrationState = {
  completed: string[];
  updatedAt: string;
};

export type DataMigrationResult = {
  actions: string[];
  skipped: boolean;
};

const USER_DATA_MIGRATION = "user-data-v1";
const PLANNER_AGENT_MIGRATION = "diagnostic-agent-v1";

export async function migrateApplicationData(
  legacyRoot: string,
  userDataRoot: string,
): Promise<DataMigrationResult> {
  const statePath = path.join(userDataRoot, "migration-state.json");
  const state = (await readJsonFile<MigrationState>(statePath)) ?? {
    completed: [],
    updatedAt: new Date(0).toISOString(),
  };
  const actions: string[] = [];

  if (!state.completed.includes(USER_DATA_MIGRATION)) {
    await migrateLegacyRoot(legacyRoot, userDataRoot, actions);
    state.completed.push(USER_DATA_MIGRATION);
  }

  if (!state.completed.includes(PLANNER_AGENT_MIGRATION)) {
    await migratePlannerAgent(userDataRoot, actions);
    state.completed.push(PLANNER_AGENT_MIGRATION);
  }

  if (actions.length > 0 || !(await pathExists(statePath))) {
    state.updatedAt = new Date().toISOString();
    await writeJsonFile(statePath, state);
  }

  return {
    actions,
    skipped: actions.length === 0,
  };
}

async function migrateLegacyRoot(
  legacyRoot: string,
  userDataRoot: string,
  actions: string[],
): Promise<void> {
  const resolvedLegacy = path.resolve(legacyRoot);
  const resolvedUserData = path.resolve(userDataRoot);
  if (resolvedLegacy === resolvedUserData) return;
  await mkdir(resolvedUserData, { recursive: true });

  await copyIfDestinationMissing(
    path.join(resolvedLegacy, "conversations"),
    path.join(resolvedUserData, "conversations"),
    actions,
  );
  await copyIfDestinationMissing(
    path.join(resolvedLegacy, "agents"),
    path.join(resolvedUserData, "agents"),
    actions,
  );
  await copyIfDestinationMissing(
    path.join(resolvedLegacy, "conversations.json"),
    path.join(resolvedUserData, "conversations.json"),
    actions,
  );

  const legacySettingsPath = path.join(resolvedLegacy, "settings.json");
  const userSettingsPath = path.join(resolvedUserData, "settings.json");
  const legacySettings = await readJsonObject(legacySettingsPath);
  if (legacySettings && !(await pathExists(userSettingsPath))) {
    await writeJsonFile(
      userSettingsPath,
      rewriteLegacySettings(legacySettings, resolvedLegacy, resolvedUserData),
    );
    actions.push(`settings:${legacySettingsPath}->${userSettingsPath}`);
  }

  const configuredSettingsPath = getConfiguredSettingsPath(legacySettings);
  if (configuredSettingsPath && await pathExists(configuredSettingsPath)) {
    const configuredSettings = await readJsonObject(configuredSettingsPath);
    if (configuredSettings) {
      await writeJsonFile(
        configuredSettingsPath,
        rewriteLegacySettings(configuredSettings, resolvedLegacy, resolvedUserData),
      );
      actions.push(`settings-rewritten:${configuredSettingsPath}`);
    }
  }
}

async function migratePlannerAgent(userDataRoot: string, actions: string[]): Promise<void> {
  const settingsPath = path.join(userDataRoot, "settings.json");
  const settings = await readJsonObject(settingsPath);
  if (settings) {
    const migrated = migrateDiagnosticAgentSetting(settings);
    if (migrated.changed) {
      await writeJsonFile(settingsPath, migrated.value);
      actions.push(`settings-agent:${settingsPath}`);
    }
  }

  const agentRoots = new Set<string>([path.join(userDataRoot, "agents")]);
  const configuredAgentRoot = getConfiguredAgentsDirectory(settings);
  if (configuredAgentRoot) agentRoots.add(configuredAgentRoot);

  for (const agentRoot of agentRoots) {
    if (await migrateDiagnosticAgentDirectory(agentRoot)) {
      actions.push(`agent-directory:${agentRoot}`);
    }
  }
}

export function rewriteLegacySettings(
  settings: Record<string, unknown>,
  legacyRoot: string,
  userDataRoot: string,
): Record<string, unknown> {
  const localFiles = isRecord(settings.localFiles) ? { ...settings.localFiles } : {};
  const mappings = new Map([
    [path.resolve(legacyRoot, "settings.json"), path.resolve(userDataRoot, "settings.json")],
    [path.resolve(legacyRoot, "conversations"), path.resolve(userDataRoot, "conversations")],
    [path.resolve(legacyRoot, "agents"), path.resolve(userDataRoot, "agents")],
  ]);
  for (const key of ["settingsPath", "conversationsDirectory", "agentsDirectory"]) {
    const value = localFiles[key];
    if (typeof value !== "string" || !path.isAbsolute(value)) continue;
    const replacement = mappings.get(path.resolve(value));
    if (replacement) localFiles[key] = replacement;
  }

  return migrateDiagnosticAgentSetting({
    ...settings,
    localFiles,
  }).value;
}

export async function migrateDiagnosticAgentDirectory(agentRoot: string): Promise<boolean> {
  const source = path.join(agentRoot, "diagnostic-agent");
  if (!(await pathExists(source))) return false;
  const target = path.join(agentRoot, "agent-planner");
  const backupRoot = path.join(agentRoot, ".migration-backups");
  await mkdir(backupRoot, { recursive: true });
  const backup = path.join(backupRoot, `diagnostic-agent-${formatTimestamp(new Date())}`);
  await rename(source, backup);

  if (!(await pathExists(target))) {
    await cp(backup, target, { recursive: true });
    return true;
  }

  await mergeAgentDirectory(backup, target);
  return true;
}

function migrateDiagnosticAgentSetting(settings: Record<string, unknown>): {
  changed: boolean;
  value: Record<string, unknown>;
} {
  if (!isRecord(settings.agents) || !isRecord(settings.agents["diagnostic-agent"])) {
    return { changed: false, value: settings };
  }
  const agents = { ...settings.agents };
  const legacy = agents["diagnostic-agent"];
  if (!isRecord(agents["agent-planner"])) {
    agents["agent-planner"] = legacy;
  }
  delete agents["diagnostic-agent"];
  return {
    changed: true,
    value: {
      ...settings,
      agents,
    },
  };
}

async function mergeAgentDirectory(source: string, target: string): Promise<void> {
  await cp(source, target, {
    errorOnExist: false,
    force: false,
    recursive: true,
  });

  const sourcePermissions = await readJsonFile<AgentPermissionsFile>(
    path.join(source, "permissions.json"),
  );
  const targetPermissions = await readJsonFile<AgentPermissionsFile>(
    path.join(target, "permissions.json"),
  );
  if (sourcePermissions) {
    const targetCommands = new Set(targetPermissions?.rules.map((rule) => rule.command) ?? []);
    await writeJsonFile(path.join(target, "permissions.json"), {
      rules: [
        ...(targetPermissions?.rules ?? []),
        ...sourcePermissions.rules.filter((rule) => !targetCommands.has(rule.command)),
      ],
    });
  }

  const sourceHistory = await readJsonFile<AgentHistoryEntry[]>(path.join(source, "historique.json"));
  const targetHistory = await readJsonFile<AgentHistoryEntry[]>(path.join(target, "historique.json"));
  if (sourceHistory) {
    const entries = dedupeByJson([...(targetHistory ?? []), ...sourceHistory])
      .sort((left, right) => right.at.localeCompare(left.at));
    await writeJsonFile(path.join(target, "historique.json"), entries);
  }

  const sourceConversations = await loadChatStateFromDirectoryWithRecovery(
    path.join(source, "conversations"),
  );
  const targetConversations = await loadChatStateFromDirectoryWithRecovery(
    path.join(target, "conversations"),
  );
  const issues = [...sourceConversations.issues, ...targetConversations.issues];
  if (issues.length > 0) {
    issues.forEach(reportStorageIssue);
    throw new Error("Migration diagnostic-agent interrompue : stockage de conversation invalide.");
  }
  if (sourceConversations.state) {
    await saveChatStateToDirectory(
      mergeConversationStates(targetConversations.state, sourceConversations.state),
      path.join(target, "conversations"),
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

async function copyIfDestinationMissing(
  source: string,
  destination: string,
  actions: string[],
): Promise<void> {
  if (!(await pathExists(source)) || await pathExists(destination)) return;
  await cp(source, destination, { recursive: true });
  actions.push(`copied:${source}->${destination}`);
}

async function readJsonObject(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8")) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      reportStorageIssue(createStorageIssue(
        filePath,
        "invalid-json",
        error instanceof Error ? error.message : "Settings invalides.",
      ));
    }
    return null;
  }
}

function getConfiguredSettingsPath(settings: Record<string, unknown> | null): string | null {
  if (!settings || !isRecord(settings.localFiles)) return null;
  const value = settings.localFiles.settingsPath;
  return typeof value === "string" && path.isAbsolute(value) ? value : null;
}

function getConfiguredAgentsDirectory(settings: Record<string, unknown> | null): string | null {
  if (!settings || !isRecord(settings.localFiles)) return null;
  const value = settings.localFiles.agentsDirectory;
  return typeof value === "string" && path.isAbsolute(value) ? value : null;
}

function dedupeByJson<T>(values: T[]): T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = JSON.stringify(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function formatTimestamp(value: Date): string {
  return value.toISOString().replace(/[:.]/g, "-");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
