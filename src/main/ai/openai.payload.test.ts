import { describe, expect, it } from "vitest";
import {
  buildDeviceAgentInput,
  buildGenericAgentInput,
  buildInput,
} from "./openai.payload";

const runtime = {
  activeProvider: "openai" as const,
  platform: "win32" as const,
  shell: "powershell",
};
const context = {
  description: "Description",
  instructions: "Instructions",
  name: "Agent",
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
    }], ["agent-planner"]);
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
    expect(planner[0].content[0].text).toContain("STATUS: ready|needs-info|blocked");
    expect(planner[1].content[0].text).toContain('"source":"assistant"');
  });
});
