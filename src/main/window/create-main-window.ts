import {
  app,
  BrowserWindow,
  dialog,
} from "electron";
import {
  configureMainWindowContentSecurityPolicy,
  configureMainWindowNavigation,
  createMainWindowOptions,
} from "./main-window.security";

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow(
    createMainWindowOptions(MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY),
  );
  configureMainWindowNavigation(
    mainWindow.webContents,
    MAIN_WINDOW_WEBPACK_ENTRY,
  );
  configureMainWindowContentSecurityPolicy(
    mainWindow.webContents,
    !app.isPackaged,
  );
  void mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY).catch((error: unknown) => {
    dialog.showErrorBox(
      "Chargement de NovaChat impossible",
      error instanceof Error ? error.message : "Erreur Electron inconnue.",
    );
    mainWindow.destroy();
  });
  return mainWindow;
}
