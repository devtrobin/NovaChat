import { IpcMain } from "electron";
import { testOpenAIConnection } from "../ai/openai.service";
import {
  clearOpenAIApiKey,
  loadSettingsFromDisk,
  saveSettingsToDisk,
} from "../settings/settings.service";
import { parseAppSettings } from "../validation/ipc-payload.validation";
import { getOpenAICredentialStore } from "../credentials/electron-credential.service";

export function registerSettingsHandlers(ipcMain: IpcMain): void {
  ipcMain.handle("nova:settings:load", async () => loadSettingsFromDisk());

  ipcMain.handle("nova:settings:clear-openai-key", async () => clearOpenAIApiKey());

  ipcMain.handle("nova:settings:test", async (_event, payload: unknown) => {
    const settings = parseAppSettings(payload);
    if (settings.activeProvider !== "openai") {
      return {
        message: "Provider non supporte.",
        ok: false,
      };
    }

    const apiKey = settings.openai.apiKeyUpdate?.trim()
      || await getOpenAICredentialStore().get();
    return testOpenAIConnection({
      ...settings.openai,
      apiKey,
    });
  });

  ipcMain.handle("nova:settings:save", async (_event, payload: unknown) => {
    const settings = parseAppSettings(payload);
    return saveSettingsToDisk(settings);
  });

}
