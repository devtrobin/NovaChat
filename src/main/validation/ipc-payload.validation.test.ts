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
      "agent-planner": { enabled: true },
      "device-agent": { enabled: true },
    },
    deviceExecution: {
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
      apiKey: "",
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
});
