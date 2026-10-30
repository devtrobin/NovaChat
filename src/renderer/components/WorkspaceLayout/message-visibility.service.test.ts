import { describe, expect, it } from "vitest";
import { ChatMessage, Conversation } from "../../../shared/chat.types";
import {
  filterConversationForUser,
  resolveMessageVisibility,
} from "./message-visibility.service";

describe("message visibility", () => {
  it("keeps direct commands and compact public progress", () => {
    expect(resolveMessageVisibility(createMessage({
      from: "user",
      to: "ael",
    }))).toBe("public");
    expect(resolveMessageVisibility(createMessage({
      from: "ael",
      to: "user",
    }))).toBe("public");
    expect(resolveMessageVisibility(createMessage({
      from: "system",
      to: "user",
    }))).toBe("public");
  });

  it("hides agent delegations and their ael details", () => {
    expect(resolveMessageVisibility(createMessage({
      from: "assistant",
      to: "agent",
    }))).toBe("internal");
    expect(resolveMessageVisibility(createMessage({
      from: "assistant",
      to: "ael",
    }))).toBe("internal");
    expect(resolveMessageVisibility(createMessage({
      from: "ael",
      to: "assistant",
    }))).toBe("internal");
  });

  it("prefers an explicit visibility and filters without mutating storage", () => {
    const publicMessage = createMessage({
      from: "agent",
      to: "assistant",
      visibility: "public",
    });
    const internalMessage = createMessage({
      from: "assistant",
      to: "user",
      visibility: "internal",
    });
    const conversation: Conversation = {
      createdAt: "2026-07-19T00:00:00.000Z",
      id: "conversation-1",
      messages: [publicMessage, internalMessage],
      title: "Test",
      updatedAt: "2026-07-19T00:00:00.000Z",
    };

    expect(filterConversationForUser(conversation)?.messages).toEqual([publicMessage]);
    expect(conversation.messages).toHaveLength(2);
  });
});

function createMessage(
  partial: Pick<ChatMessage, "from" | "to"> & Partial<ChatMessage>,
): ChatMessage {
  return {
    content: "message",
    createdAt: "2026-07-19T00:00:00.000Z",
    id: crypto.randomUUID(),
    ...partial,
  };
}
