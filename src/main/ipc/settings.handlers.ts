import { IpcMain } from "electron";
import { testOpenAIConnection } from "../ai/openai.service";
import {
  loadSettingsFromDisk,
  saveSettingsToDisk,
} from "../settings/settings.service";
import { parseAppSettings } from "../validation/ipc-payload.validation";

export function registerSettingsHandlers(ipcMain: IpcMain): void {
  ipcMain.handle("nova:settings:load", async () => loadSettingsFromDisk());

  ipcMain.handle("nova:settings:test", async (_event, payload: unknown) => {
    const settings = parseAppSettings(payload);
    if (settings.activeProvider !== "openai") {
      return {
        message: "Provider non supporte.",
        ok: false,
      };
    }

    return testOpenAIConnection(settings.openai);
  });

  ipcMain.handle("nova:settings:save", async (_event, payload: unknown) => {
    const settings = parseAppSettings(payload);
    await saveSettingsToDisk(settings);
    return settings;
  });

}
