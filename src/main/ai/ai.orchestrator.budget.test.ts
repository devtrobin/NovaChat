import { describe, expect, it } from "vitest";
import { ChatMessage } from "../../shared/chat.types";
import {
  createOrchestrationBudget,
  MAX_AEL_EXECUTIONS,
  registerAELResult,
} from "./ai.orchestrator.budget";

function createAELMessage(command: string): ChatMessage {
  return {
    agentId: "agent-ael",
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
  it("detects an equivalent repeated AEL command", () => {
    const budget = createOrchestrationBudget();

    expect(registerAELResult(budget, createAELMessage("  RG   --files ")).duplicateCommand)
      .toBe(false);
    expect(registerAELResult(budget, createAELMessage("rg --files")).duplicateCommand)
      .toBe(true);
  });

  it("keeps a separate AEL execution ceiling", () => {
    const budget = createOrchestrationBudget();
    let limitReached = false;

    for (let index = 0; index < MAX_AEL_EXECUTIONS; index += 1) {
      limitReached = registerAELResult(
        budget,
        createAELMessage(`echo ${index}`),
      ).aelLimitReached;
    }

    expect(limitReached).toBe(true);
    expect(budget.aelExecutions).toBe(MAX_AEL_EXECUTIONS);
  });

  it("does not count ACP results as AEL executions", () => {
    const budget = createOrchestrationBudget();
    const decision = registerAELResult(budget, {
      agentId: "agent-acp",
      content: "Plan",
      createdAt: "2026-07-19T12:00:00.000Z",
      from: "agent",
      id: "acp-message",
      to: "assistant",
      visibility: "internal",
    });

    expect(decision).toEqual({
      duplicateCommand: false,
      aelLimitReached: false,
    });
    expect(budget.aelExecutions).toBe(0);
  });
});
