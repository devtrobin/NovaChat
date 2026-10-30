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
  it("persists file creation as an agent action instead of a terminal command", async () => {
    const rootDirectory = await createTemporaryDirectory();
    await recordAgentCommandExchange({
      agentId: "agent-ael", operation: "write-file", assistantRequest: "Creer coucou.py", command: "Creer desktop/coucou.py",
      result: { output: "Fichier cree et contenu verifie : coucou.py", status: "success" }, rootDirectory,
      triggerMessageId: "trigger", userAssistantConversationId: "conversation", userPrompt: "Creer un programme",
    });
    const workspace = await loadAgentWorkspace(rootDirectory, "agent-ael");
    expect(workspace.history[0]).toMatchObject({ operation: "write-file", status: "success" });
    expect(workspace.conversations.conversations[0].messages).toMatchObject([
      { from: "assistant", to: "agent", agentId: "agent-ael" },
      { from: "agent", to: "assistant", agentId: "agent-ael", content: "Fichier cree et contenu verifie : coucou.py" },
    ]);
  });
  it("initializes a complete AEL workspace", async () => {
    const rootDirectory = await createTemporaryDirectory();
    const workspace = await loadAgentWorkspace(rootDirectory, "agent-ael");

    expect(workspace).toMatchObject({
      context: { schemaVersion: AGENT_CONTEXT_SCHEMA_VERSION },
      conversations: { activeConversationId: null, conversations: [] },
      history: [],
      id: "agent-ael",
      permissions: { rules: [] },
    });
    expect(await readdir(path.join(rootDirectory, "agent-ael"))).toEqual(expect.arrayContaining([
      "contexte.json",
      "conversations",
      "historique.json",
      "permissions.json",
    ]));
  });

  it("persists, resolves and deletes an exact permission", async () => {
    const rootDirectory = await createTemporaryDirectory();
    await saveAgentPermission(rootDirectory, "agent-ael", "npm test", "allow", true);

    expect(await getAgentPermission(rootDirectory, "agent-ael", "npm test")).toMatchObject({
      decision: "allow",
      matchedRule: {
        command: "npm test",
        decision: "allow",
        remember: true,
      },
    });

    await deleteAgentPermission(rootDirectory, "agent-ael", "npm test");
    expect(await getAgentPermission(rootDirectory, "agent-ael", "npm test")).toEqual({
      decision: null,
      matchedRule: null,
    });
  });

  it("persists an internal AEL exchange and its history entry", async () => {
    const rootDirectory = await createTemporaryDirectory();
    const { agentConversationId } = await recordAgentCommandExchange({
      agentId: "agent-ael",
      apiRequests: [{
        at: "2026-07-18T10:00:00.000Z",
        direction: "response",
        from: "openai",
        payload: { command: "rg --files" },
        to: "agent-ael",
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

    const workspace = await loadAgentWorkspace(rootDirectory, "agent-ael");
    expect(workspace.history[0]).toMatchObject({
      agentConversationId,
      command: "rg --files",
      result: "package.json",
      status: "success",
    });
    expect(workspace.conversations.conversations[0].messages).toMatchObject([
      { from: "assistant", to: "ael" },
      {
        apiRequests: [{ payload: { command: "rg --files" } }],
        content: "rg --files",
        from: "ael",
        result: "package.json",
        to: "assistant",
      },
    ]);
  });

  it("serializes concurrent writes for the same agent without losing data", async () => {
    const rootDirectory = await createTemporaryDirectory();

    await Promise.all([
      saveAgentPermission(rootDirectory, "agent-ael", "npm test", "allow", true),
      saveAgentPermission(rootDirectory, "agent-ael", "npm run lint", "deny", true),
    ]);

    const workspace = await loadAgentWorkspace(rootDirectory, "agent-ael");
    expect(workspace.permissions.rules).toEqual(expect.arrayContaining([
      expect.objectContaining({ command: "npm test", decision: "allow" }),
      expect.objectContaining({ command: "npm run lint", decision: "deny" }),
    ]));
  });

  it("preserves concurrent history entries for one agent", async () => {
    const rootDirectory = await createTemporaryDirectory();
    const createExchange = (command: string) => recordAgentCommandExchange({
      agentId: "agent-ael" as const,
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

    const workspace = await loadAgentWorkspace(rootDirectory, "agent-ael");
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
