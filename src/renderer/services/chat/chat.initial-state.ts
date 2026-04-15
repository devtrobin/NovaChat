import { createDefaultChatState } from "../conversation.service";
import { ChatState } from "./chat.types";

export function loadChatPageState(): ChatState {
  const storedState = createDefaultChatState();

  return {
    activeConversationId: storedState.activeConversationId,
    conversations: storedState.conversations,
  };
}
