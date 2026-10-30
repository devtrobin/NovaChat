import { describe, expect, it } from "vitest";
import { AGENT_CONTEXT_SCHEMA_VERSION } from "../../shared/agent.types";
import { parseProviderResponse } from "./openai.parser";
import { parseAELWriteFileOperation } from "../validation/ael-file.validation";
import {
  buildAELAgentInput,
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
  it("provides usable file creation examples for Nova and the ACP goal fallback", () => {
    const nova = buildInput([], ["agent-ael"], { runtimeContext: runtime })[0].content[0].text;
    const ael = buildAELAgentInput(context, runtime, "Creer coucou.py sur le Bureau", "Creer un programme")[0].content[0].text;
    const novaExample = nova.match(/structured action: (\{.*?\})\. directory/)?.[1];
    const aelExample = ael.match(/strict JSON object: (\{.*?\})\. directory/)?.[1];
    expect(parseProviderResponse(novaExample ?? "")).toMatchObject({ action: "write-file", content: 'print("coucou")\n' });
    expect(parseAELWriteFileOperation(JSON.parse(aelExample ?? "null"))).toMatchObject({ action: "write-file", content: 'print("coucou")\n' });
    expect(buildInput([], [], { runtimeContext: runtime })[0].content[0].text).not.toContain('"action":"write-file"');
  });
  it("keeps assistant messages structured and truncates oversized command results", () => {
    const payload = buildInput([{
      content: "Resultat",
      createdAt: "2026-07-19T10:00:00.000Z",
      from: "ael",
      id: "message-1",
      result: "x".repeat(4500),
      to: "assistant",
      visibility: "internal",
    }], ["agent-acp"], { runtimeContext: runtime });
    const conversation = JSON.parse(payload[1].content[0].text) as {
      conversation: Array<{ result: string }>;
    };

    expect(payload.map((message) => message.role)).toEqual(["developer", "user"]);
    expect(conversation.conversation[0].result).toContain("[output truncated: 500 chars omitted]");
  });

  it("builds distinct AEL and ACP instructions", () => {
    const ael = buildAELAgentInput(context, runtime, "Inspecter", "Diagnostic");
    const acp = buildGenericAgentInput(
      "agent-acp",
      context,
      runtime,
      "Planifier",
      "Diagnostic",
    );

    expect(ael[0].content[0].text).toContain("Return only the shell command");
    expect(ael[0].content[0].text).toContain("Use cmd.exe syntax only");
    expect(ael[0].content[0].text).toContain("Never use diskpart");
    expect(ael[0].content[0].text).toContain("at most three terminal segments");
    expect(acp[0].content[0].text).toContain("STATUS: ready|needs-info|blocked");
    expect(acp[0].content[0].text).toContain("Never write shell syntax");
    expect(acp[1].content[0].text).toContain('"source":"assistant"');
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
