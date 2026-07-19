import { beforeEach, describe, expect, it, vi } from "vitest";

const postOpenAIResponse = vi.hoisted(() => vi.fn());

vi.mock("./openai.client", () => ({ postOpenAIResponse }));

import { testOpenAIConnection } from "./openai.connection";

const settings = {
  apiKey: "test-key",
  apiKeyConfigured: true,
  baseUrl: "https://api.openai.test/v1",
  model: "test-model",
  provider: "openai" as const,
};

beforeEach(() => {
  postOpenAIResponse.mockReset();
});

describe("OpenAI connection test", () => {
  it("returns success for a valid provider response", async () => {
    postOpenAIResponse.mockResolvedValue({
      response: new Response("", { status: 200 }),
    });

    await expect(testOpenAIConnection(settings)).resolves.toEqual({
      message: "Connexion OpenAI valide.",
      ok: true,
    });
  });

  it("turns an aborted request into a controlled timeout result", async () => {
    postOpenAIResponse.mockImplementation((
      _baseUrl: string,
      _apiKey: string,
      _payload: unknown,
      signal: AbortSignal,
    ) => Promise.reject(
      signal.reason ?? new DOMException("Aborted", "AbortError"),
    ));
    const signal = AbortSignal.abort(new DOMException("Aborted", "AbortError"));

    await expect(testOpenAIConnection(settings, signal)).resolves.toMatchObject({
      ok: false,
      message: expect.stringContaining("10 secondes"),
    });
  });
});
