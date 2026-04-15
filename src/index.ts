import { app, BrowserWindow, ipcMain } from "electron";
import { registerAiHandlers } from "./main/ipc/ai.handlers";
import { registerAgentsHandlers } from "./main/ipc/agents.handlers";
import { registerChatHandlers } from "./main/ipc/chat.handlers";
import { registerDeviceHandlers } from "./main/ipc/device.handlers";
import { registerSettingsHandlers } from "./main/ipc/settings.handlers";
import { createMainWindow } from "./main/window/create-main-window";

if (require("electron-squirrel-startup")) {
  app.quit();
}

app.on("ready", createMainWindow);

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
registerDeviceHandlers(ipcMain);
