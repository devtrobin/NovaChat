import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { writeJsonFile } from "../chat/chat-storage.io";
import {
  migrateApplicationData,
  rewriteLegacySettings,
} from "./data-migration.service";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0)
    .map((directory) => rm(directory, { force: true, recursive: true })));
});

describe("application data migrations", () => {
  it("copies legacy defaults to userData and resets incompatible agent settings", async () => {
    const legacyRoot = await createTemporaryDirectory("legacy");
    const userDataRoot = await createTemporaryDirectory("user-data");
    await writeJsonFile(path.join(legacyRoot, "settings.json"), {
      activeProvider: "openai",
      agents: {
        "agent-acp": { enabled: false },
        "agent-ael": { enabled: true },
      },
      localFiles: {
        agentsDirectory: path.join(legacyRoot, "agents"),
        conversationsDirectory: path.join(legacyRoot, "conversations"),
        settingsPath: path.join(legacyRoot, "settings.json"),
      },
    });
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
    expect(settings).not.toHaveProperty("agents");
    expect(await readFile(path.join(userDataRoot, "migration-state.json"), "utf8"))
      .toContain("user-data-v1");
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

});

async function createTemporaryDirectory(label: string): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), `novachat-${label}-`));
  temporaryDirectories.push(directory);
  return directory;
}
