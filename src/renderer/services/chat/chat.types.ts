import { Conversation } from "../../../shared/chat.types";

export type ChatState = {
  activeConversationId: string | null;
  conversations: Conversation[];
};
