import { readFile } from "node:fs/promises";
import path from "node:path";
import { writeJsonFile } from "../chat/chat-storage.io";
import { CredentialStore } from "./credential-store";

export type CredentialMigrationResult = {
  migrated: boolean;
  sanitizedFiles: string[];
};

export async function migratePlaintextOpenAIKey(
  credentialStore: CredentialStore,
  candidateSettingsPaths: string[],
): Promise<CredentialMigrationResult> {
  const settingsDocuments = await Promise.all(
    [...new Set(candidateSettingsPaths.map((filePath) => path.resolve(filePath)))]
      .map(async (filePath) => ({
        filePath,
        value: await readSettingsObject(filePath),
      })),
  );
  const configuredSettingsPath = settingsDocuments
    .map(({ value }) => getConfiguredSettingsPath(value))
    .find((value): value is string => Boolean(value));
  if (
    configuredSettingsPath
    && !settingsDocuments.some(({ filePath }) => filePath === path.resolve(configuredSettingsPath))
  ) {
    settingsDocuments.push({
      filePath: path.resolve(configuredSettingsPath),
      value: await readSettingsObject(configuredSettingsPath),
    });
  }

  const plaintextKey = [...settingsDocuments]
    .reverse()
    .map(({ value }) => getPlaintextKey(value))
    .find((value) => Boolean(value)) ?? "";
  let migrated = false;
  if (plaintextKey) {
    await credentialStore.set(plaintextKey);
    if (await credentialStore.get() !== plaintextKey) {
      throw new Error("La migration de la cle OpenAI n'a pas pu etre verifiee.");
    }
    migrated = true;
  }

  const sanitizedFiles: string[] = [];
  if (migrated || await credentialStore.has()) {
    for (const document of settingsDocuments) {
      if (!document.value || !getPlaintextKey(document.value)) continue;
      await writeJsonFile(
        document.filePath,
        removePlaintextKey(document.value),
        { createBackup: false },
      );
      sanitizedFiles.push(document.filePath);
      await sanitizeBackup(`${document.filePath}.bak`);
    }
  }

  return {
    migrated,
    sanitizedFiles,
  };
}

function removePlaintextKey(settings: Record<string, unknown>): Record<string, unknown> {
  if (!isRecord(settings.openai)) return settings;
  const openai = { ...settings.openai };
  delete openai.apiKey;
  delete openai.apiKeyUpdate;
  openai.apiKeyConfigured = true;
  return {
    ...settings,
    openai,
  };
}

async function sanitizeBackup(filePath: string): Promise<void> {
  const value = await readSettingsObject(filePath);
  if (!value || !getPlaintextKey(value)) return;
  await writeJsonFile(filePath, removePlaintextKey(value), { createBackup: false });
}

async function readSettingsObject(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8")) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function getPlaintextKey(settings: Record<string, unknown> | null): string {
  if (!settings || !isRecord(settings.openai)) return "";
  if (typeof settings.openai.apiKeyUpdate === "string" && settings.openai.apiKeyUpdate.trim()) {
    return settings.openai.apiKeyUpdate.trim();
  }
  return typeof settings.openai.apiKey === "string" ? settings.openai.apiKey.trim() : "";
}

function getConfiguredSettingsPath(settings: Record<string, unknown> | null): string | null {
  if (!settings || !isRecord(settings.localFiles)) return null;
  const value = settings.localFiles.settingsPath;
  return typeof value === "string" && path.isAbsolute(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
