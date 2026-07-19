import type {
  BrowserWindowConstructorOptions,
  WebContents,
} from "electron";

export function createMainWindowOptions(
  preload: string,
): BrowserWindowConstructorOptions {
  return {
    height: 2560,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload,
      sandbox: true,
      webSecurity: true,
      webviewTag: false,
    },
    width: 1600,
  };
}

export function configureMainWindowNavigation(
  webContents: WebContents,
  applicationEntry: string,
): void {
  webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  webContents.on("will-navigate", (event, navigationUrl) => {
    if (!isAllowedMainWindowUrl(navigationUrl, applicationEntry)) {
      event.preventDefault();
    }
  });
  webContents.on("will-redirect", (event, navigationUrl) => {
    if (!isAllowedMainWindowUrl(navigationUrl, applicationEntry)) {
      event.preventDefault();
    }
  });
}

export function isAllowedMainWindowUrl(
  navigationUrl: string,
  applicationEntry: string,
): boolean {
  try {
    const navigation = new URL(navigationUrl);
    const application = new URL(applicationEntry);
    return navigation.origin === application.origin
      && navigation.pathname === application.pathname
      && navigation.search === application.search;
  } catch {
    return false;
  }
}
