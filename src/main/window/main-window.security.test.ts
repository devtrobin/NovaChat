import { describe, expect, it } from "vitest";
import {
  createMainWindowOptions,
  isAllowedMainWindowUrl,
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
  });

  it("allows only the application document and its fragments", () => {
    const entry = "http://localhost:9000/index.html";

    expect(isAllowedMainWindowUrl(`${entry}#settings`, entry)).toBe(true);
    expect(isAllowedMainWindowUrl("https://example.com", entry)).toBe(false);
    expect(isAllowedMainWindowUrl("http://localhost:9000/other.html", entry)).toBe(false);
    expect(isAllowedMainWindowUrl("not-a-url", entry)).toBe(false);
  });
});
