import { app } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppSettings } from "../../shared/settings.types";

export function createDefaultSettings(): AppSettings {
  return {
    activeProvider: "openai",
    openai: {
      apiKey: "",
      baseUrl: "https://api.openai.com/v1",
      model: "",
      provider: "openai",
    },
  };
}

export async function loadSettingsFromDisk(): Promise<AppSettings> {
  const filePath = getSettingsPath();

  try {
    const content = await readFile(filePath, "utf-8");
    return {
      ...createDefaultSettings(),
      ...JSON.parse(content),
      openai: {
        ...createDefaultSettings().openai,
        ...JSON.parse(content).openai,
      },
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return createDefaultSettings();
    }
    throw error;
  }
}

export async function saveSettingsToDisk(settings: AppSettings): Promise<void> {
  const filePath = getSettingsPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(settings, null, 2), "utf-8");
}

function getSettingsPath(): string {
  return path.join(app.getPath("userData"), "nova-chat", "settings.json");
}
