import { app, BrowserWindow, ipcMain } from "electron";
import { runTurn } from "./main/ai/ai.orchestrator";
import { testOpenAIConnection } from "./main/ai/openai.service";
import { loadChatStateFromDirectory, saveChatStateToDirectories } from "./main/chat/chat-storage.service";
import {
  awaitDeviceCommand,
  killDeviceCommand,
  startDeviceCommand,
  submitInputToCommand,
} from "./main/device/device.service";
import {
  createDefaultSettings,
  getConversationsPathFromSettings,
  getReferenceConversationsDirectory,
  getReferenceConversationsPath,
  loadSettingsFromDisk,
  saveSettingsToDisk,
} from "./main/settings/settings.service";
import { PersistedChatState } from "./renderer/types/chat.types";
import { RunTurnRequest, SubmitCommandInputRequest } from "./shared/ai.types";
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

let chatSaveQueue = Promise.resolve();

async function loadChatStateFromDisk(): Promise<PersistedChatState> {
  const configuredDirectory = await getConversationsPathFromSettings();
  const referenceDirectory = getReferenceConversationsDirectory();
  const candidateDirectories = configuredDirectory === referenceDirectory
    ? [configuredDirectory]
    : [configuredDirectory, referenceDirectory];

  for (const directory of candidateDirectories) {
    const state = await loadChatStateFromDirectory(directory);
    if (state) return state;
  }

  return createDefaultChatState();
}

async function saveChatStateToDisk(state: PersistedChatState): Promise<void> {
  await saveChatStateToDirectories(
    state,
    await getConversationsPathFromSettings(),
    getReferenceConversationsDirectory(),
    getReferenceConversationsPath(),
  );
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
  chatSaveQueue = chatSaveQueue.then(() => saveChatStateToDisk(state));
  await chatSaveQueue;
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

ipcMain.handle("nova:ai:submit-command-input", async (_event, payload: SubmitCommandInputRequest) => {
  return submitInputToCommand(payload.commandId, payload.value);
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
