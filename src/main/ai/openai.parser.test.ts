import { describe, expect, it } from "vitest";
import {
  extractText,
  normalizeDeviceCommand,
  parseProviderResponse,
  stripCodeFences,
} from "./openai.parser";

describe("OpenAI response parser", () => {
  it("extracts and joins text output items", () => {
    expect(extractText({
      output: [
        { content: [{ text: "Bon", type: "output_text" }] },
        { content: [{ text: "jour", type: "output_text" }] },
      ],
    })).toBe("Bonjour");
  });

  it("parses a fenced assistant response", () => {
    expect(parseProviderResponse([
      "```json",
      '{"from":"assistant","to":"user","content":"Réponse utile"}',
      "```",
    ].join("\n"))).toEqual({
      content: "Réponse utile",
      from: "assistant",
      to: "user",
    });
  });

  it("parses recursively stringified JSON", () => {
    const response = {
      agentId: "agent-planner",
      content: "Planifie la prochaine étape.",
      from: "assistant",
      to: "agent",
    };

    expect(parseProviderResponse(JSON.stringify(JSON.stringify(response)))).toEqual(response);
  });

  it("normalizes the legacy diagnostic agent id", () => {
    expect(parseProviderResponse(JSON.stringify({
      agentId: "diagnostic-agent",
      content: "Analyse ce problème.",
      from: "assistant",
      to: "agent",
    }))).toEqual({
      agentId: "agent-planner",
      content: "Analyse ce problème.",
      from: "assistant",
      to: "agent",
    });
  });

  it.each([
    ['{"from":"user","to":"assistant","content":"non"}'],
    ['{"from":"assistant","to":"user","content":""}'],
    ["not json"],
  ])("rejects an invalid Nova response: %s", (value) => {
    expect(parseProviderResponse(value)).toBeNull();
  });

  it("strips markdown fences and redundant POSIX shell wrappers", () => {
    expect(stripCodeFences("```json\nvalue\n```")).toBe("value");
    expect(normalizeDeviceCommand("bash -lc 'rg --files'")).toBe("rg --files");
  });
});
