import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  deleteAgentPermission,
  getAgentPermission,
  loadAgentWorkspace,
  recordAgentCommandExchange,
  saveAgentPermission,
} from "./agent-storage.service";
import { clearAgentStorageQueues } from "./agent-storage.queue";
import { clearStorageRecoveryRegistry } from "../storage/storage-recovery.registry";
import { AGENT_CONTEXT_SCHEMA_VERSION } from "../../shared/agent.types";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  clearAgentStorageQueues();
  clearStorageRecoveryRegistry();
  await Promise.all(temporaryDirectories.splice(0)
    .map((directory) => rm(directory, { force: true, recursive: true })));
});

describe("agent storage", () => {
  it("initializes a complete Device workspace", async () => {
    const rootDirectory = await createTemporaryDirectory();
    const workspace = await loadAgentWorkspace(rootDirectory, "device-agent");

    expect(workspace).toMatchObject({
      context: { schemaVersion: AGENT_CONTEXT_SCHEMA_VERSION },
      conversations: { activeConversationId: null, conversations: [] },
      history: [],
      id: "device-agent",
      permissions: { rules: [] },
    });
    expect(await readdir(path.join(rootDirectory, "device-agent"))).toEqual(expect.arrayContaining([
      "contexte.json",
      "conversations",
      "historique.json",
      "permissions.json",
    ]));
  });

  it("persists, resolves and deletes an exact permission", async () => {
    const rootDirectory = await createTemporaryDirectory();
    await saveAgentPermission(rootDirectory, "device-agent", "npm test", "allow", true);

    expect(await getAgentPermission(rootDirectory, "device-agent", "npm test")).toMatchObject({
      decision: "allow",
      matchedRule: {
        command: "npm test",
        decision: "allow",
        remember: true,
      },
    });

    await deleteAgentPermission(rootDirectory, "device-agent", "npm test");
    expect(await getAgentPermission(rootDirectory, "device-agent", "npm test")).toEqual({
      decision: null,
      matchedRule: null,
    });
  });

  it("persists an internal Device exchange and its history entry", async () => {
    const rootDirectory = await createTemporaryDirectory();
    const { agentConversationId } = await recordAgentCommandExchange({
      agentId: "device-agent",
      apiRequests: [{
        at: "2026-07-18T10:00:00.000Z",
        direction: "response",
        from: "openai",
        payload: { command: "rg --files" },
        to: "device-agent",
      }],
      assistantRequest: "GOAL: Inspecter les fichiers",
      command: "rg --files",
      result: {
        output: "package.json",
        status: "success",
      },
      rootDirectory,
      triggerMessageId: "trigger-1",
      userAssistantConversationId: "conversation-1",
      userPrompt: "Inspecte le projet",
    });

    const workspace = await loadAgentWorkspace(rootDirectory, "device-agent");
    expect(workspace.history[0]).toMatchObject({
      agentConversationId,
      command: "rg --files",
      result: "package.json",
      status: "success",
    });
    expect(workspace.conversations.conversations[0].messages).toMatchObject([
      { from: "assistant", to: "device" },
      {
        apiRequests: [{ payload: { command: "rg --files" } }],
        content: "rg --files",
        from: "device",
        result: "package.json",
        to: "assistant",
      },
    ]);
  });

  it("serializes concurrent writes for the same agent without losing data", async () => {
    const rootDirectory = await createTemporaryDirectory();

    await Promise.all([
      saveAgentPermission(rootDirectory, "device-agent", "npm test", "allow", true),
      saveAgentPermission(rootDirectory, "device-agent", "npm run lint", "deny", true),
    ]);

    const workspace = await loadAgentWorkspace(rootDirectory, "device-agent");
    expect(workspace.permissions.rules).toEqual(expect.arrayContaining([
      expect.objectContaining({ command: "npm test", decision: "allow" }),
      expect.objectContaining({ command: "npm run lint", decision: "deny" }),
    ]));
  });

  it("preserves concurrent history entries for one agent", async () => {
    const rootDirectory = await createTemporaryDirectory();
    const createExchange = (command: string) => recordAgentCommandExchange({
      agentId: "device-agent" as const,
      assistantRequest: `Executer ${command}`,
      command,
      result: {
        output: `${command} termine`,
        status: "success" as const,
      },
      rootDirectory,
      triggerMessageId: `trigger-${command}`,
      userAssistantConversationId: "conversation-1",
      userPrompt: command,
    });

    await Promise.all([
      createExchange("npm test"),
      createExchange("npm run lint"),
    ]);

    const workspace = await loadAgentWorkspace(rootDirectory, "device-agent");
    expect(workspace.history).toHaveLength(2);
    expect(workspace.history.map((entry) => entry.command)).toEqual(
      expect.arrayContaining(["npm test", "npm run lint"]),
    );
    expect(workspace.conversations.conversations).toHaveLength(2);
  });
});

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "novachat-agent-storage-"));
  temporaryDirectories.push(directory);
  return directory;
}
