import path from "node:path";
import { describe, expect, it } from "vitest";
import { ChatMessage } from "../../shared/chat.types";
import {
  InvalidIpcPayloadError,
  parseAppSettings,
  parsePersistedChatState,
  parseRunTurnRequest,
  parseSubmitCommandInputRequest,
  parseSubmitPermissionDecisionRequest,
} from "./ipc-payload.validation";

const timestamp = "2026-07-18T18:00:00.000Z";

function createMessage(): ChatMessage {
  return {
    apiRequests: [],
    content: "Bonjour",
    createdAt: timestamp,
    from: "user",
    id: "message-1",
    lifecycleLog: [],
    status: "success",
    to: "assistant",
  };
}

function createSettings() {
  return {
    activeProvider: "openai",
    agents: {
      "agent-acp": { enabled: true },
      "agent-ael": { enabled: true },
    },
    apiTrace: {
      enabled: true,
      maxEntriesPerMessage: 50,
      redactSensitiveData: true,
      retentionDays: 30,
    },
    aelExecution: {
      maxOutputCharacters: 200_000,
      timeoutMs: 15_000,
    },
    hideInternalConversations: false,
    localFiles: {
      agentsDirectory: path.resolve("agents"),
      conversationsDirectory: path.resolve("conversations"),
      settingsPath: path.resolve("settings.json"),
    },
    openai: {
      apiKeyConfigured: false,
      baseUrl: "https://api.openai.com/v1",
      model: "",
      provider: "openai",
    },
    previewMode: false,
  };
}

describe("IPC payload validation", () => {
  it("accepts a structurally valid chat state and turn request", () => {
    const message = createMessage();
    const chatState = {
      activeConversationId: "conversation-1",
      conversations: [{
        createdAt: timestamp,
        id: "conversation-1",
        messages: [message],
        title: "Discussion",
        updatedAt: timestamp,
      }],
    };

    expect(parsePersistedChatState(chatState)).toMatchObject(chatState);
    expect(parseRunTurnRequest({
      conversationId: "conversation-1",
      messages: [message],
      title: "Discussion",
      userInput: "Bonjour",
    })).toMatchObject({ conversationId: "conversation-1", userInput: "Bonjour" });
  });

  it("normalizes legacy agent identifiers found in conversation messages", () => {
    const messages = [
      { ...createMessage(), agentId: "agent-planner", id: "message-planner" },
      { ...createMessage(), agentId: "diagnostic-agent", id: "message-diagnostic", to: "device" },
      { ...createMessage(), agentId: "device-agent", from: "device", id: "message-device", to: "user" },
    ];
    const chatState = {
      activeConversationId: "conversation-1",
      conversations: [{
        createdAt: timestamp,
        id: "conversation-1",
        messages,
        title: "Discussion",
        updatedAt: timestamp,
      }],
    };

    expect(parsePersistedChatState(chatState).conversations[0].messages.map(({ agentId }) => agentId))
      .toEqual(["agent-acp", "agent-acp", "agent-ael"]);
    expect(parsePersistedChatState(chatState).conversations[0].messages.map(({ from, to }) => [from, to]))
      .toEqual([["user", "assistant"], ["user", "ael"], ["ael", "user"]]);
    expect(parseRunTurnRequest({
      conversationId: "conversation-1",
      messages,
      title: "Discussion",
      userInput: "Continuer",
    }).messages.map(({ agentId }) => agentId))
      .toEqual(["agent-acp", "agent-acp", "agent-ael"]);
  });

  it("still rejects unknown agent identifiers in conversation messages", () => {
    expect(() => parsePersistedChatState({
      activeConversationId: "conversation-1",
      conversations: [{
        createdAt: timestamp,
        id: "conversation-1",
        messages: [{ ...createMessage(), agentId: "agent-unknown" }],
        title: "Discussion",
        updatedAt: timestamp,
      }],
    })).toThrow("chatState.conversations[0].messages[0].agentId");
  });

  it.each(["../outside", "nested/id", "C:\\outside"])("rejects unsafe conversation identifiers", (conversationId) => {
    expect(() => parseRunTurnRequest({
      conversationId,
      messages: [createMessage()],
      title: "Discussion",
      userInput: "Bonjour",
    })).toThrow(InvalidIpcPayloadError);
  });

  it("rejects unknown permission decisions and oversized interactive input", () => {
    expect(() => parseSubmitPermissionDecisionRequest({
      decision: "maybe",
      requestId: "request-1",
    })).toThrow("permissionDecision.decision");
    expect(() => parseSubmitCommandInputRequest({
      commandId: "command-1",
      value: "x".repeat(65_537),
    })).toThrow("commandInput.value");
  });

  it("rejects malformed or relative settings paths", () => {
    expect(() => parseAppSettings({
      ...createSettings(),
      localFiles: {
        ...createSettings().localFiles,
        conversationsDirectory: "../outside",
      },
    })).toThrow("settings.localFiles.conversationsDirectory");
  });

  it("normalizes valid absolute settings paths", () => {
    expect(parseAppSettings(createSettings()).localFiles.conversationsDirectory)
      .toBe(path.normalize(path.resolve("conversations")));
  });

  it("rejects providers that are only planned", () => {
    expect(() => parseAppSettings({
      ...createSettings(),
      activeProvider: "ollama",
    })).toThrow("settings.activeProvider");
  });

  it("never returns a plaintext API key supplied as an unknown renderer field", () => {
    const settings = createSettings();
    const parsed = parseAppSettings({
      ...settings,
      openai: {
        ...settings.openai,
        apiKey: "sk-should-not-cross-the-ipc-boundary",
      },
    });

    expect(parsed.openai).not.toHaveProperty("apiKey");
  });
});
