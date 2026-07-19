import { beforeEach, describe, expect, it, vi } from "vitest";
import { RuntimeAppSettings } from "../../shared/settings.types";
import { runDeviceAgentTask } from "./agent-task.device";
import { RunAgentTaskArgs } from "./agent-task.types";

const commandMocks = vi.hoisted(() => ({
  resolveDeviceAgentCommand: vi.fn(),
}));
const permissionMocks = vi.hoisted(() => ({
  resolveDevicePermission: vi.fn(),
}));
const storageMocks = vi.hoisted(() => ({
  recordAgentCommandExchange: vi.fn(),
}));
const executionMocks = vi.hoisted(() => ({
  executeDeviceCommand: vi.fn(),
}));

vi.mock("./agent-task.device-command", () => commandMocks);
vi.mock("./agent-task.device-permission", () => permissionMocks);
vi.mock("./agent-storage.service", () => storageMocks);
vi.mock("../ai/ai.device-flow", () => executionMocks);

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
      mode: "goal",
      request: "Lister les disques",
      triggerMessageId: "trigger-1",
      turnId: "turn-1",
      userAssistantConversationId: "conversation-1",
      userPrompt: "Analyse les composants",
    },
    turnId: "turn-1",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  commandMocks.resolveDeviceAgentCommand.mockResolvedValue({
    apiRecords: [],
    command: "echo list disk | diskpart",
  });
  storageMocks.recordAgentCommandExchange.mockResolvedValue({
    agentConversationId: "agent-conversation-1",
  });
});

describe("Device agent command profile integration", () => {
  it("rejects DiskPart before permission or execution", async () => {
    const execution = await runDeviceAgentTask(createArgs(), "task-1", null);

    expect(permissionMocks.resolveDevicePermission).not.toHaveBeenCalled();
    expect(executionMocks.executeDeviceCommand).not.toHaveBeenCalled();
    expect(storageMocks.recordAgentCommandExchange).toHaveBeenCalledOnce();
    expect(execution).toMatchObject({
      deviceMessage: {
        agentId: "device-agent",
        status: "error",
      },
      result: {
        kind: "completed",
        resolvedCommand: "echo list disk | diskpart",
        status: "error",
      },
    });
    expect(execution.deviceMessage.result).toContain("diskpart");
    expect(execution.deviceMessage.result).toContain("interactive");
  });
});
