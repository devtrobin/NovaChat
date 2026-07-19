import path from "node:path";
import { readJsonFile, writeJsonFile } from "../chat/chat-storage.io";
import { migratePlannerAgent } from "./data-migration.agent";
import { migrateLegacyRoot } from "./data-migration.root";
import { pathExists } from "./data-migration.shared";

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
  return { actions, skipped: actions.length === 0 };
}

export { migrateDiagnosticAgentDirectory } from "./data-migration.agent";
export { rewriteLegacySettings } from "./data-migration.root";
