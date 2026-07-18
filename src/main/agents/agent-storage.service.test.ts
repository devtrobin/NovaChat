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

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0)
    .map((directory) => rm(directory, { force: true, recursive: true })));
});

describe("agent storage", () => {
  it("initializes a complete Device workspace", async () => {
    const rootDirectory = await createTemporaryDirectory();
    const workspace = await loadAgentWorkspace(rootDirectory, "device-agent");

    expect(workspace).toMatchObject({
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
});

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "novachat-agent-storage-"));
  temporaryDirectories.push(directory);
  return directory;
}
