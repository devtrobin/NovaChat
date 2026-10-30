import { describe, expect, it } from "vitest";
import {
  extractText,
  normalizeAELCommand,
  parseProviderResponse,
  stripCodeFences,
} from "./openai.parser";

describe("OpenAI response parser", () => {
  it.each(['\n  print("coucou")\n', ""])("parses structured creation without trimming content", (content) => {
    const response = { from: "assistant", to: "agent", agentId: "agent-ael", action: "write-file", target: { directory: "desktop", name: "coucou.py" }, content, overwrite: false };
    expect(parseProviderResponse(JSON.stringify(response))).toEqual(response);
    for (const invalid of [{ ...response, agentId: "agent-acp" }, { ...response, overwrite: true }, { ...response, path: "C:\\x" }]) {
      expect(parseProviderResponse(JSON.stringify(invalid))).toBeNull();
    }
  });
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
      agentId: "agent-acp",
      content: "Planifie la prochaine étape.",
      from: "assistant",
      to: "agent",
    };

    expect(parseProviderResponse(JSON.stringify(JSON.stringify(response)))).toEqual(response);
  });

  it("rejects an unknown agent id", () => {
    expect(parseProviderResponse(JSON.stringify({
      agentId: "agent-unknown",
      content: "Analyse ce problème.",
      from: "assistant",
      to: "agent",
    }))).toBeNull();
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
    expect(normalizeAELCommand("bash -lc 'rg --files'")).toBe("rg --files");
  });
});
