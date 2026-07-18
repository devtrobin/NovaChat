import { describe, expect, it } from "vitest";
import { ChatMessage, Conversation } from "../../../shared/chat.types";
import { applyChatTurnEvent } from "./chat.events";

const initialConversation: Conversation = {
  createdAt: "2026-07-18T10:00:00.000Z",
  id: "conversation-1",
  messages: [],
  title: "Initial",
  updatedAt: "2026-07-18T10:00:00.000Z",
};

function createMessage(id: string, content = id): ChatMessage {
  return {
    content,
    createdAt: "2026-07-18T11:00:00.000Z",
    from: "assistant",
    id,
    to: "user",
  };
}

describe("chat turn events", () => {
  it("appends messages and updates the conversation timestamp", () => {
    const message = createMessage("message-1");
    const result = applyChatTurnEvent([initialConversation], {
      conversationId: initialConversation.id,
      messages: [message],
      type: "append-messages",
    });

    expect(result[0].messages).toEqual([message]);
    expect(result[0].updatedAt).toBe(message.createdAt);
  });

  it("creates a missing target conversation", () => {
    const message = createMessage("message-1");
    const result = applyChatTurnEvent([], {
      conversationId: "new-conversation",
      messages: [message],
      type: "append-messages",
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("new-conversation");
    expect(result[0].messages).toEqual([message]);
  });

  it("replaces an existing message", () => {
    const previous = createMessage("message-1", "avant");
    const next = createMessage("message-1", "après");
    const result = applyChatTurnEvent([{
      ...initialConversation,
      messages: [previous],
    }], {
      conversationId: initialConversation.id,
      message: next,
      messageId: previous.id,
      type: "replace-message",
    });

    expect(result[0].messages).toEqual([next]);
  });

  it("appends a replacement when the message is not present", () => {
    const message = createMessage("message-1");
    const result = applyChatTurnEvent([initialConversation], {
      conversationId: initialConversation.id,
      message,
      messageId: message.id,
      type: "replace-message",
    });

    expect(result[0].messages).toEqual([message]);
  });

  it("removes a message", () => {
    const message = createMessage("message-1");
    const result = applyChatTurnEvent([{
      ...initialConversation,
      messages: [message],
    }], {
      conversationId: initialConversation.id,
      messageId: message.id,
      type: "remove-message",
    });

    expect(result[0].messages).toEqual([]);
  });

  it("updates the conversation title", () => {
    const result = applyChatTurnEvent([initialConversation], {
      conversationId: initialConversation.id,
      title: "Nouveau titre",
      type: "set-title",
    });

    expect(result[0].title).toBe("Nouveau titre");
  });
});
