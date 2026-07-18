import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { writeJsonFile } from "../chat/chat-storage.io";
import {
  migrateApplicationData,
  migrateDiagnosticAgentDirectory,
  rewriteLegacySettings,
} from "./data-migration.service";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0)
    .map((directory) => rm(directory, { force: true, recursive: true })));
});

describe("application data migrations", () => {
  it("copies legacy defaults to userData, rewrites paths and migrates diagnostic-agent once", async () => {
    const legacyRoot = await createTemporaryDirectory("legacy");
    const userDataRoot = await createTemporaryDirectory("user-data");
    await writeJsonFile(path.join(legacyRoot, "settings.json"), {
      activeProvider: "openai",
      agents: {
        "diagnostic-agent": { enabled: false },
        "device-agent": { enabled: true },
      },
      localFiles: {
        agentsDirectory: path.join(legacyRoot, "agents"),
        conversationsDirectory: path.join(legacyRoot, "conversations"),
        settingsPath: path.join(legacyRoot, "settings.json"),
      },
    });
    await writeJsonFile(
      path.join(legacyRoot, "agents", "diagnostic-agent", "permissions.json"),
      { rules: [{ command: "npm test", decision: "allow" }] },
    );
    await writeJsonFile(path.join(legacyRoot, "conversations", "conversations.json"), {
      activeConversationId: null,
      conversations: [],
    });

    const first = await migrateApplicationData(legacyRoot, userDataRoot);
    const second = await migrateApplicationData(legacyRoot, userDataRoot);
    const settings = JSON.parse(await readFile(path.join(userDataRoot, "settings.json"), "utf8"));

    expect(first.skipped).toBe(false);
    expect(second).toEqual({ actions: [], skipped: true });
    expect(settings.localFiles).toEqual({
      agentsDirectory: path.join(userDataRoot, "agents"),
      conversationsDirectory: path.join(userDataRoot, "conversations"),
      settingsPath: path.join(userDataRoot, "settings.json"),
    });
    expect(settings.agents).toEqual({
      "agent-planner": { enabled: false },
      "device-agent": { enabled: true },
    });
    expect(JSON.parse(await readFile(
      path.join(userDataRoot, "agents", "agent-planner", "permissions.json"),
      "utf8",
    ))).toMatchObject({
      rules: [expect.objectContaining({ command: "npm test" })],
    });
    expect(await readFile(path.join(userDataRoot, "migration-state.json"), "utf8"))
      .toContain("diagnostic-agent-v1");
  });

  it("preserves explicitly configured custom paths", () => {
    const legacyRoot = path.resolve("legacy-root");
    const userDataRoot = path.resolve("user-data-root");
    const customAgents = path.resolve("custom-agents");

    expect(rewriteLegacySettings({
      agents: {},
      localFiles: {
        agentsDirectory: customAgents,
        conversationsDirectory: path.join(legacyRoot, "conversations"),
        settingsPath: path.join(legacyRoot, "settings.json"),
      },
    }, legacyRoot, userDataRoot)).toMatchObject({
      localFiles: {
        agentsDirectory: customAgents,
        conversationsDirectory: path.join(userDataRoot, "conversations"),
        settingsPath: path.join(userDataRoot, "settings.json"),
      },
    });
  });

  it("merges legacy agent permissions into an existing planner workspace", async () => {
    const agentRoot = await createTemporaryDirectory("agents");
    await writeJsonFile(path.join(agentRoot, "diagnostic-agent", "permissions.json"), {
      rules: [{ command: "npm test", decision: "allow", remember: true }],
    });
    await writeJsonFile(path.join(agentRoot, "agent-planner", "permissions.json"), {
      rules: [{ command: "npm run lint", decision: "deny", remember: true }],
    });
    await mkdir(path.join(agentRoot, "agent-planner", "conversations"), { recursive: true });

    await expect(migrateDiagnosticAgentDirectory(agentRoot)).resolves.toBe(true);
    await expect(migrateDiagnosticAgentDirectory(agentRoot)).resolves.toBe(false);

    const permissions = JSON.parse(await readFile(
      path.join(agentRoot, "agent-planner", "permissions.json"),
      "utf8",
    ));
    expect(permissions.rules).toEqual(expect.arrayContaining([
      expect.objectContaining({ command: "npm test" }),
      expect.objectContaining({ command: "npm run lint" }),
    ]));
  });
});

async function createTemporaryDirectory(label: string): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), `novachat-${label}-`));
  temporaryDirectories.push(directory);
  return directory;
}
