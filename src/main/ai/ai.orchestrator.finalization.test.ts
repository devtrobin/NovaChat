import { beforeEach, describe, expect, it, vi } from "vitest";
import { RuntimeAppSettings } from "../../shared/settings.types";
import { requestFinalSynthesis } from "./ai.orchestrator.finalization";

const assistantMocks = vi.hoisted(() => ({
  requestAssistantReply: vi.fn(),
}));

vi.mock("./ai.orchestrator.assistant-request", () => assistantMocks);

const settings = {
  openai: {},
} as RuntimeAppSettings;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("reserved final synthesis", () => {
  it("requests a no-agent final response and returns it to the user", async () => {
    assistantMocks.requestAssistantReply.mockResolvedValue({
      apiRecords: [],
      providerResponse: {
        content: "Synthese des resultats partiels.",
        from: "assistant",
        to: "user",
      },
    });
    const emit = vi.fn();
    const userMessage = {
      content: "Inspecte la machine",
      createdAt: "2026-07-19T12:00:00.000Z",
      from: "user" as const,
      id: "user-message",
      to: "assistant" as const,
      visibility: "public" as const,
    };

    const result = await requestFinalSynthesis({
      conversationId: "conversation-1",
      emit,
      settings,
      step: 4,
      turnId: "turn-1",
      turnMessages: [userMessage],
      userMessage,
    });

    expect(assistantMocks.requestAssistantReply).toHaveBeenCalledWith(
      settings,
      "turn-1",
      [userMessage],
      true,
    );
    expect(result).toMatchObject({
      message: {
        content: "Synthese des resultats partiels.",
        from: "assistant",
        to: "user",
      },
      ok: true,
    });
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({
      messageId: "user-message",
      type: "replace-message",
    }));
  });

  it("stops instead of executing an agent handoff returned during finalization", async () => {
    assistantMocks.requestAssistantReply.mockResolvedValue({
      apiRecords: [],
      providerResponse: {
        agentId: "agent-ael",
        content: "rg --files",
        from: "assistant",
        to: "agent",
      },
    });

    const result = await requestFinalSynthesis({
      conversationId: "conversation-1",
      emit: vi.fn(),
      settings,
      step: 8,
      turnId: "turn-1",
      turnMessages: [],
      userMessage: {
        content: "Inspecte",
        createdAt: "2026-07-19T12:00:00.000Z",
        from: "user",
        id: "user-message",
        to: "assistant",
        visibility: "public",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.message.content).toContain("arrete les delegations");
  });
});
