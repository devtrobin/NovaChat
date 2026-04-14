import { IpcMain } from "electron";
import { testOpenAIConnection } from "../ai/openai.service";
import {
  createDefaultSettings,
  loadSettingsFromDisk,
  saveSettingsToDisk,
} from "../settings/settings.service";
import { AppSettings } from "../../shared/settings.types";

export function registerSettingsHandlers(ipcMain: IpcMain): void {
  ipcMain.handle("nova:settings:load", async () => loadSettingsFromDisk());

  ipcMain.handle("nova:settings:test", async (_event, settings: AppSettings) => {
    if (settings.activeProvider !== "openai") {
      return {
        message: "Provider non supporte.",
        ok: false,
      };
    }

    return testOpenAIConnection(settings.openai);
  });

  ipcMain.handle("nova:settings:save", async (_event, settings: AppSettings) => {
    await saveSettingsToDisk(settings);
    return settings;
  });

  ipcMain.handle("nova:settings:reset", async () => {
    const defaults = createDefaultSettings();
    await saveSettingsToDisk(defaults);
    return defaults;
  });
}
