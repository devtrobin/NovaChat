import { describe, expect, it } from "vitest";
import { ChatMessage, PersistedChatState } from "../../shared/chat.types";
import {
  mergeMessageFiles,
  orderMessages,
  splitMessageFiles,
  toIndex,
} from "./chat-storage.serialization";

function createMessage(id: string, createdAt: string): ChatMessage {
  return {
    apiRequests: [{
      at: createdAt,
      direction: "request",
      from: "nova",
      payload: { id },
      to: "provider",
    }],
    content: id,
    createdAt,
    from: "assistant",
    id,
    lifecycleLog: [{
      at: createdAt,
      event: "created",
    }],
    to: "user",
  };
}

describe("chat storage serialization", () => {
  it("splits and merges message body, lifecycle and API traces", () => {
    const message = createMessage("message-1", "2026-07-18T10:00:00.000Z");
    const split = splitMessageFiles(message);

    expect(split.messageBody).not.toHaveProperty("apiRequests");
    expect(split.messageBody).not.toHaveProperty("lifecycleLog");
    expect(mergeMessageFiles(
      split.messageBody,
      split.lifecycleLog,
      split.apiRequests,
    )).toEqual(message);
  });

  it("deduplicates message ids in the conversation index", () => {
    const message = createMessage("message-1", "2026-07-18T10:00:00.000Z");
    const state: PersistedChatState = {
      activeConversationId: "conversation-1",
      conversations: [{
        createdAt: message.createdAt,
        id: "conversation-1",
        messages: [message, message],
        title: "Conversation",
        updatedAt: message.createdAt,
      }],
    };

    expect(toIndex(state).conversations[0].messageIds).toEqual(["message-1"]);
  });

  it("uses index order and removes duplicate message records", () => {
    const first = createMessage("first", "2026-07-18T10:00:00.000Z");
    const second = createMessage("second", "2026-07-18T11:00:00.000Z");

    expect(orderMessages(
      [first, second, { ...first }],
      {
        createdAt: first.createdAt,
        id: "conversation-1",
        messageIds: ["second", "first", "second"],
        title: "Conversation",
        updatedAt: second.createdAt,
      },
    ).map((message) => message.id)).toEqual(["second", "first"]);
  });
});
