import { describe, expect, it } from "vitest";
import { AGENT_CONTEXT_SCHEMA_VERSION } from "../../shared/agent.types";
import {
  buildDeviceAgentInput,
  buildGenericAgentInput,
  buildInput,
} from "./openai.payload";

const runtime = {
  activeProvider: "openai" as const,
  platform: "win32" as const,
  shell: "cmd.exe",
  shellFamily: "cmd" as const,
};
const context = {
  description: "Description",
  instructions: "Instructions",
  name: "Agent",
  schemaVersion: AGENT_CONTEXT_SCHEMA_VERSION,
};

describe("OpenAI payload builders", () => {
  it("keeps assistant messages structured and truncates oversized command results", () => {
    const payload = buildInput([{
      content: "Resultat",
      createdAt: "2026-07-19T10:00:00.000Z",
      from: "device",
      id: "message-1",
      result: "x".repeat(4500),
      to: "assistant",
      visibility: "internal",
    }], ["agent-planner"], { runtimeContext: runtime });
    const conversation = JSON.parse(payload[1].content[0].text) as {
      conversation: Array<{ result: string }>;
    };

    expect(payload.map((message) => message.role)).toEqual(["developer", "user"]);
    expect(conversation.conversation[0].result).toContain("[output truncated: 500 chars omitted]");
  });

  it("builds distinct Device and Planner instructions", () => {
    const device = buildDeviceAgentInput(context, runtime, "Inspecter", "Diagnostic");
    const planner = buildGenericAgentInput(
      "agent-planner",
      context,
      runtime,
      "Planifier",
      "Diagnostic",
    );

    expect(device[0].content[0].text).toContain("Return only the shell command");
    expect(device[0].content[0].text).toContain("Use cmd.exe syntax only");
    expect(device[0].content[0].text).toContain("Never use diskpart");
    expect(device[0].content[0].text).toContain("at most three terminal segments");
    expect(planner[0].content[0].text).toContain("STATUS: ready|needs-info|blocked");
    expect(planner[0].content[0].text).toContain("Never write shell syntax");
    expect(planner[1].content[0].text).toContain('"source":"assistant"');
  });

  it("forces the reserved synthesis cycle to answer without agents", () => {
    const payload = buildInput([], [], {
      finalResponseOnly: true,
      runtimeContext: runtime,
    });

    expect(payload[0].content[0].text).toContain("reserved final synthesis cycle");
    expect(payload[0].content[0].text).toContain("Do not delegate to any agent");
  });
});
