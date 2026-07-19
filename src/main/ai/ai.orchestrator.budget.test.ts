import { describe, expect, it } from "vitest";
import { ChatMessage } from "../../shared/chat.types";
import {
  createOrchestrationBudget,
  MAX_DEVICE_EXECUTIONS,
  registerDeviceResult,
} from "./ai.orchestrator.budget";

function createDeviceMessage(command: string): ChatMessage {
  return {
    agentId: "device-agent",
    content: "Resultat",
    createdAt: "2026-07-19T12:00:00.000Z",
    from: "agent",
    id: crypto.randomUUID(),
    lifecycleLog: [{
      at: "2026-07-19T12:00:00.000Z",
      event: "created",
      metadata: { command },
    }],
    to: "assistant",
    visibility: "internal",
  };
}

describe("orchestration budget", () => {
  it("detects an equivalent repeated Device command", () => {
    const budget = createOrchestrationBudget();

    expect(registerDeviceResult(budget, createDeviceMessage("  RG   --files ")).duplicateCommand)
      .toBe(false);
    expect(registerDeviceResult(budget, createDeviceMessage("rg --files")).duplicateCommand)
      .toBe(true);
  });

  it("keeps a separate Device execution ceiling", () => {
    const budget = createOrchestrationBudget();
    let limitReached = false;

    for (let index = 0; index < MAX_DEVICE_EXECUTIONS; index += 1) {
      limitReached = registerDeviceResult(
        budget,
        createDeviceMessage(`echo ${index}`),
      ).deviceLimitReached;
    }

    expect(limitReached).toBe(true);
    expect(budget.deviceExecutions).toBe(MAX_DEVICE_EXECUTIONS);
  });

  it("does not count Planner results as Device executions", () => {
    const budget = createOrchestrationBudget();
    const decision = registerDeviceResult(budget, {
      agentId: "agent-planner",
      content: "Plan",
      createdAt: "2026-07-19T12:00:00.000Z",
      from: "agent",
      id: "planner-message",
      to: "assistant",
      visibility: "internal",
    });

    expect(decision).toEqual({
      duplicateCommand: false,
      deviceLimitReached: false,
    });
    expect(budget.deviceExecutions).toBe(0);
  });
});
