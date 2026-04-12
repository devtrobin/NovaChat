import { Conversation } from "../../types/chat.types";

export type ChatPageState = {
  activeConversationId: string | null;
  conversations: Conversation[];
  isSending: boolean;
};
