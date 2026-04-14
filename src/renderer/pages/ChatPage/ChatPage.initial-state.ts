import { createDefaultChatState } from "../../services/conversation.service";
import { ChatPageState } from "./ChatPage.types";

export function loadChatPageState(): ChatPageState {
  const storedState = createDefaultChatState();

  return {
    activeConversationId: storedState.activeConversationId,
    conversations: storedState.conversations,
    isSending: false,
  };
}
