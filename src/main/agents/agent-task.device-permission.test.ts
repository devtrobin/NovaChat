import { beforeEach, describe, expect, it, vi } from "vitest";
import { RuntimeAppSettings } from "../../shared/settings.types";
import { resolveDevicePermission } from "./agent-task.device-permission";
import { RunAgentTaskArgs } from "./agent-task.types";

const storageMocks = vi.hoisted(() => ({
  getAgentPermission: vi.fn(),
  recordAgentCommandExchange: vi.fn(),
  saveAgentPermission: vi.fn(),
}));
const permissionMocks = vi.hoisted(() => ({
  requestDevicePermission: vi.fn(),
}));

vi.mock("./agent-storage.service", () => storageMocks);
vi.mock("../ai/ai.permission.service", () => permissionMocks);

const settings: RuntimeAppSettings = {
  activeProvider: "openai",
  agents: {
    "agent-planner": { enabled: true },
    "device-agent": { enabled: true },
  },
  apiTrace: {
    enabled: false,
    maxEntriesPerMessage: 10,
    redactSensitiveData: true,
    retentionDays: 30,
  },
  deviceExecution: {
    maxOutputCharacters: 20_000,
    timeoutMs: 15_000,
  },
  hideInternalConversations: true,
  localFiles: {
    agentsDirectory: "agents",
    conversationsDirectory: "conversations",
    settingsPath: "settings.json",
  },
  openai: {
    apiKey: "test-key",
    apiKeyConfigured: true,
    baseUrl: "https://api.openai.com/v1",
    model: "test-model",
    provider: "openai",
  },
  previewMode: false,
};

function createArgs(): RunAgentTaskArgs {
  return {
    conversationId: "conversation-1",
    emit: vi.fn(),
    messageId: "message-1",
    onPipelineStageChange: vi.fn(),
    settings,
    task: {
      agentId: "device-agent",
      mode: "command",
      request: "Inspecter",
      triggerMessageId: "trigger-1",
      turnId: "turn-1",
      userAssistantConversationId: "conversation-1",
      userPrompt: "Inspecte la machine",
    },
    turnId: "turn-1",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  storageMocks.getAgentPermission.mockResolvedValue({
    decision: null,
    matchedRule: null,
  });
  permissionMocks.requestDevicePermission.mockResolvedValue({ decision: "allow" });
});

describe("Device permission resolution", () => {
  it("executes an allowed read without consulting or prompting permissions", async () => {
    await expect(resolveDevicePermission(
      createArgs(),
      "task-1",
      null,
      "rg --files",
      [],
    )).resolves.toBeNull();

    expect(storageMocks.getAgentPermission).not.toHaveBeenCalled();
    expect(permissionMocks.requestDevicePermission).not.toHaveBeenCalled();
  });

  it("reuses a stored permission for commands classified as ask", async () => {
    storageMocks.getAgentPermission.mockResolvedValue({
      decision: "allow",
      matchedRule: {
        command: "npm test",
        createdAt: "2026-07-19T12:00:00.000Z",
        decision: "allow",
        remember: true,
      },
    });

    await expect(resolveDevicePermission(
      createArgs(),
      "task-1",
      null,
      "npm test",
      [],
    )).resolves.toBeNull();

    expect(storageMocks.getAgentPermission).toHaveBeenCalledOnce();
    expect(permissionMocks.requestDevicePermission).not.toHaveBeenCalled();
  });

  it("always prompts for commands the policy cannot classify safely", async () => {
    await expect(resolveDevicePermission(
      createArgs(),
      "task-1",
      null,
      "unknown-device-tool --inspect",
      [],
    )).resolves.toBeNull();

    expect(storageMocks.getAgentPermission).not.toHaveBeenCalled();
    expect(permissionMocks.requestDevicePermission).toHaveBeenCalledOnce();
  });
});
