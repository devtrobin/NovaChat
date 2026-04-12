import { ChatMessage } from "../../types/chat.types";

export type MessageListProps = {
  messages: ChatMessage[];
  onKillCommand?: (commandId: string) => void;
  onOpenSettings?: () => void;
};
