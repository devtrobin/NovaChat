import { Conversation } from "../../types/chat.types";

export type ChatState = {
  activeConversationId: string | null;
  conversations: Conversation[];
};
