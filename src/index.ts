import { app, BrowserWindow, ipcMain } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { runTurn } from "./main/ai/ai.orchestrator";
import { testOpenAIConnection } from "./main/ai/openai.service";
import { awaitDeviceCommand, killDeviceCommand, startDeviceCommand } from "./main/device/device.service";
import {
  createDefaultSettings,
  loadSettingsFromDisk,
  saveSettingsToDisk,
} from "./main/settings/settings.service";
import { PersistedChatState } from "./renderer/types/chat.types";
import { RunTurnRequest } from "./shared/ai.types";
import { AppSettings } from "./shared/settings.types";
import { createDefaultChatState } from "./renderer/services/conversation.service";

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
};

function getChatStoragePath(): string {
  return path.join(app.getPath("userData"), "nova-chat", "conversations.json");
}

async function loadChatStateFromDisk(): Promise<PersistedChatState> {
  const filePath = getChatStoragePath();

  try {
    const content = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(content) as PersistedChatState;
    return {
      activeConversationId: parsed.activeConversationId ?? null,
      conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return createDefaultChatState();
    }
    throw error;
  }
}

async function saveChatStateToDisk(state: PersistedChatState): Promise<void> {
  const filePath = getChatStoragePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf-8");
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle("nova:ping", async () => {
  return { ok: true, message: "pong", at: new Date().toISOString() };
});

ipcMain.handle("nova:chat:load", async () => {
  return loadChatStateFromDisk();
});

ipcMain.handle("nova:chat:save", async (_event, state: PersistedChatState) => {
  await saveChatStateToDisk(state);
});

ipcMain.handle("nova:settings:load", async () => {
  return loadSettingsFromDisk();
});

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

ipcMain.handle("nova:ai:run-turn", async (event, request: RunTurnRequest) => {
  const settings = await loadSettingsFromDisk();
  return runTurn(request, settings, (payload) => {
    event.sender.send("nova:ai:event", payload);
  });
});

ipcMain.handle("nova:ai:kill-command", async (_event, commandId: string) => {
  await killDeviceCommand(commandId);
});

ipcMain.handle("nova:device:start-command", async (_event, command: string) => {
  return startDeviceCommand(command);
});

ipcMain.handle("nova:device:await-command", async (_event, commandId: string) => {
  return awaitDeviceCommand(commandId);
});

ipcMain.handle("nova:device:kill-command", async (_event, commandId: string) => {
  await killDeviceCommand(commandId);
});
