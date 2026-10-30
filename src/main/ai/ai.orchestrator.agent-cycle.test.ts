import { describe, expect, it } from "vitest";
import { ChatMessage } from "../../shared/chat.types";
import { finalizeAgentCycleMessage } from "./ai.orchestrator.agent-cycle";

describe("agent cycle trace finalization", () => {
  it("preserves delegation and agent API traces before emission", () => {
    const message = createMessage("agent", "assistant");
    message.apiRequests = [{
      at: "2026-07-18T10:01:00.000Z",
      direction: "response",
      from: "agent-ael",
      payload: { command: "rg --files" },
      to: "openai",
    }];
    const delegation = createMessage("assistant", "agent");
    delegation.apiRequests = [{
      at: "2026-07-18T10:00:00.000Z",
      direction: "response",
      from: "openai",
      payload: { to: "agent-ael" },
      to: "nova",
    }];

    finalizeAgentCycleMessage(message, delegation, "agent-ael");

    expect(message.apiRequests).toHaveLength(2);
    expect(message.lifecycleLog?.[message.lifecycleLog.length - 1]).toMatchObject({
      event: "assistant-agent-cycle-complete",
    });
  });
});

function createMessage(
  from: ChatMessage["from"],
  to: ChatMessage["to"],
): ChatMessage {
  return {
    content: "test",
    createdAt: "2026-07-18T10:00:00.000Z",
    from,
    id: crypto.randomUUID(),
    to,
  };
}
