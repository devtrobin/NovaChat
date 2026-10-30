import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import { registerAiHandlers } from "./main/ipc/ai.handlers";
import { registerAgentsHandlers } from "./main/ipc/agents.handlers";
import { registerChatHandlers } from "./main/ipc/chat.handlers";
import { registerSettingsHandlers } from "./main/ipc/settings.handlers";
import { createMainWindow } from "./main/window/create-main-window";
import { configureStorageJournal } from "./main/storage/storage-journal";
import { migrateApplicationData } from "./main/migrations/data-migration.service";
import {
  getLegacyApplicationDirectory,
  getUserDataDirectory,
} from "./main/settings/settings.service";
import { getOpenAICredentialStore } from "./main/credentials/electron-credential.service";
import { migratePlaintextOpenAIKey } from "./main/credentials/credential-migration.service";

// Squirrel exposes a CommonJS startup flag, evaluated before app readiness.
// eslint-disable-next-line @typescript-eslint/no-require-imports
if (require("electron-squirrel-startup")) {
  app.quit();
}

void app.whenReady().then(async () => {
  const userDataDirectory = getUserDataDirectory();
  configureStorageJournal(path.join(userDataDirectory, "logs", "storage-errors.jsonl"));
  try {
    const legacyDirectory = getLegacyApplicationDirectory();
    await migrateApplicationData(legacyDirectory, userDataDirectory);
    await migratePlaintextOpenAIKey(getOpenAICredentialStore(), [
      path.join(legacyDirectory, "settings.json"),
      path.join(userDataDirectory, "settings.json"),
    ]);
  } catch (error) {
    dialog.showErrorBox(
      "Migration des donnees incomplete",
      error instanceof Error ? error.message : "Une erreur inconnue a interrompu la migration.",
    );
  }
  createMainWindow();
}).catch((error: unknown) => {
  dialog.showErrorBox(
    "Demarrage de Nova impossible",
    error instanceof Error ? error.message : "Une erreur inconnue a interrompu le demarrage.",
  );
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

ipcMain.handle("nova:ping", async () => {
  return { ok: true, message: "pong", at: new Date().toISOString() };
});

registerChatHandlers(ipcMain);
registerSettingsHandlers(ipcMain);
registerAiHandlers(ipcMain);
registerAgentsHandlers(ipcMain);
