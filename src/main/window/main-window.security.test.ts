import { describe, expect, it } from "vitest";
import {
  createContentSecurityPolicy,
  createMainWindowOptions,
  isAllowedMainWindowUrl,
  replaceContentSecurityPolicyHeader,
} from "./main-window.security";

describe("main window security", () => {
  it("enables explicit renderer isolation", () => {
    expect(createMainWindowOptions("preload.js").webPreferences).toMatchObject({
      contextIsolation: true,
      nodeIntegration: false,
      preload: "preload.js",
      sandbox: true,
      webSecurity: true,
      webviewTag: false,
    });

    const developmentPolicy = createContentSecurityPolicy(true);
    const productionPolicy = createContentSecurityPolicy(false);
    expect(developmentPolicy).toContain("script-src 'self' 'unsafe-eval'");
    expect(developmentPolicy).toContain("connect-src 'self' ws:");
    expect(productionPolicy).toContain("script-src 'self'");
    expect(productionPolicy).not.toContain("'unsafe-eval'");
    expect(productionPolicy).not.toContain("ws:");
    expect(productionPolicy).toContain("frame-ancestors 'none'");
    expect(replaceContentSecurityPolicyHeader({
      "content-security-policy": ["old-policy"],
      "X-Test": ["preserved"],
    }, productionPolicy)).toEqual({
      "Content-Security-Policy": [productionPolicy],
      "X-Test": ["preserved"],
    });
  });

  it("allows only the application document and its fragments", () => {
    const entry = "http://localhost:9000/index.html";

    expect(isAllowedMainWindowUrl(`${entry}#settings`, entry)).toBe(true);
    expect(isAllowedMainWindowUrl("https://example.com", entry)).toBe(false);
    expect(isAllowedMainWindowUrl("http://localhost:9000/other.html", entry)).toBe(false);
    expect(isAllowedMainWindowUrl("not-a-url", entry)).toBe(false);
  });
});
