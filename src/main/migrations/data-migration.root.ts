import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { writeJsonFile } from "../chat/chat-storage.io";
import {
  isRecord,
  pathExists,
  readJsonObject,
} from "./data-migration.shared";

export async function migrateLegacyRoot(
  legacyRoot: string,
  userDataRoot: string,
  actions: string[],
): Promise<void> {
  const resolvedLegacy = path.resolve(legacyRoot);
  const resolvedUserData = path.resolve(userDataRoot);
  if (resolvedLegacy === resolvedUserData) return;
  await mkdir(resolvedUserData, { recursive: true });

  for (const name of ["conversations", "conversations.json"]) {
    await copyIfDestinationMissing(
      path.join(resolvedLegacy, name),
      path.join(resolvedUserData, name),
      actions,
    );
  }

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

  const configuredPath = getConfiguredSettingsPath(legacySettings);
  if (configuredPath && await pathExists(configuredPath)) {
    const configuredSettings = await readJsonObject(configuredPath);
    if (configuredSettings) {
      await writeJsonFile(
        configuredPath,
        rewriteLegacySettings(configuredSettings, resolvedLegacy, resolvedUserData),
      );
      actions.push(`settings-rewritten:${configuredPath}`);
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
  const normalized: Record<string, unknown> = { ...settings, localFiles };
  delete normalized.agents;
  return normalized;
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

function getConfiguredSettingsPath(
  settings: Record<string, unknown> | null,
): string | null {
  if (!settings || !isRecord(settings.localFiles)) return null;
  const value = settings.localFiles.settingsPath;
  return typeof value === "string" && path.isAbsolute(value) ? value : null;
}
