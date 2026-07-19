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

export function configureMainWindowContentSecurityPolicy(
  webContents: WebContents,
  isDevelopment: boolean,
): void {
  const policy = createContentSecurityPolicy(isDevelopment);
  webContents.session.webRequest.onHeadersReceived((details, callback) => {
    if (details.resourceType !== "mainFrame") {
      callback({});
      return;
    }
    callback({
      responseHeaders: replaceContentSecurityPolicyHeader(
        details.responseHeaders,
        policy,
      ),
    });
  });
}

export function createContentSecurityPolicy(isDevelopment: boolean): string {
  const scriptSources = isDevelopment
    ? "script-src 'self' 'unsafe-eval'"
    : "script-src 'self'";
  const connectSources = isDevelopment
    ? "connect-src 'self' ws:"
    : "connect-src 'self'";

  return [
    "default-src 'self'",
    scriptSources,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    connectSources,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function replaceContentSecurityPolicyHeader(
  responseHeaders: Record<string, string[]> | undefined,
  policy: string,
): Record<string, string | string[]> {
  const headers = Object.fromEntries(
    Object.entries(responseHeaders ?? {}).filter(
      ([name]) => name.toLowerCase() !== "content-security-policy",
    ),
  );
  return {
    ...headers,
    "Content-Security-Policy": [policy],
  };
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
