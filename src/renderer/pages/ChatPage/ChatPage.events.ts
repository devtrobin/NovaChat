import { ChatTurnEvent } from "../../../shared/ai.types";
import { Conversation } from "../../types/chat.types";
import {
  createConversationRecord,
  replaceConversation,
} from "./ChatPage.conversation-records";
import { removeMessage, replaceOrAppendMessage } from "./ChatPage.message-records";

function getTargetConversation(
  conversations: Conversation[],
  conversationId: string,
): Conversation {
  return conversations.find((conversation) => conversation.id === conversationId)
    ?? createConversationRecord(conversationId);
}

function ensureConversationExists(
  conversations: Conversation[],
  targetConversation: Conversation,
): Conversation[] {
  return conversations.some((conversation) => conversation.id === targetConversation.id)
    ? conversations
    : [targetConversation, ...conversations];
}

export function applyChatTurnEvent(
  conversations: Conversation[],
  event: ChatTurnEvent,
): Conversation[] {
  const targetConversation = getTargetConversation(conversations, event.conversationId);
  const baseConversations = ensureConversationExists(conversations, targetConversation);

  if (event.type === "append-messages") {
    const lastMessage = event.messages[event.messages.length - 1];
    return replaceConversation(baseConversations, {
      ...targetConversation,
      messages: [...targetConversation.messages, ...event.messages],
      updatedAt: lastMessage?.createdAt ?? targetConversation.updatedAt,
    });
  }

  if (event.type === "replace-message") {
    return replaceConversation(baseConversations, {
      ...targetConversation,
      messages: replaceOrAppendMessage(targetConversation.messages, event.messageId, event.message),
      updatedAt: event.message.createdAt,
    });
  }

  if (event.type === "remove-message") {
    return replaceConversation(baseConversations, {
      ...targetConversation,
      messages: removeMessage(targetConversation.messages, event.messageId),
    });
  }

  return replaceConversation(baseConversations, {
    ...targetConversation,
    title: event.title,
    updatedAt: new Date().toISOString(),
  });
}
