import { beforeEach, describe, expect, it, vi } from "vitest";
import { RuntimeAppSettings } from "../../shared/settings.types";
import { runAELAgentTask } from "./agent-task.ael";
import { RunAgentTaskArgs } from "./agent-task.types";

const commandMocks = vi.hoisted(() => ({
  resolveAELAgentCommand: vi.fn(),
}));
const permissionMocks = vi.hoisted(() => ({
  resolveAELPermission: vi.fn(),
}));
const storageMocks = vi.hoisted(() => ({
  recordAgentCommandExchange: vi.fn(),
}));
const executionMocks = vi.hoisted(() => ({
  executeAELCommand: vi.fn(),
}));

vi.mock("./agent-task.ael-command", () => commandMocks);
vi.mock("./agent-task.ael-permission", () => permissionMocks);
vi.mock("./agent-storage.service", () => storageMocks);
vi.mock("../ai/ai.ael-flow", () => executionMocks);

const settings: RuntimeAppSettings = {
  activeProvider: "openai",
  agents: {
    "agent-acp": { enabled: true },
    "agent-ael": { enabled: true },
  },
  apiTrace: {
    enabled: false,
    maxEntriesPerMessage: 10,
    redactSensitiveData: true,
    retentionDays: 30,
  },
  aelExecution: {
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
      agentId: "agent-ael",
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
  commandMocks.resolveAELAgentCommand.mockResolvedValue({
    apiRecords: [],
    command: "echo list disk | diskpart",
  });
  storageMocks.recordAgentCommandExchange.mockResolvedValue({
    agentConversationId: "agent-conversation-1",
  });
});

describe("AEL agent command profile integration", () => {
  it("rejects DiskPart before permission or execution", async () => {
    const execution = await runAELAgentTask(createArgs(), "task-1", null);

    expect(permissionMocks.resolveAELPermission).not.toHaveBeenCalled();
    expect(executionMocks.executeAELCommand).not.toHaveBeenCalled();
    expect(storageMocks.recordAgentCommandExchange).toHaveBeenCalledOnce();
    expect(execution).toMatchObject({
      aelMessage: {
        agentId: "agent-ael",
        status: "error",
      },
      result: {
        kind: "completed",
        resolvedCommand: "echo list disk | diskpart",
        status: "error",
      },
    });
    expect(execution.aelMessage.result).toContain("diskpart");
    expect(execution.aelMessage.result).toContain("interactive");
  });
});
