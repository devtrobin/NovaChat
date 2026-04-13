import { ChatMessage } from "../../types/chat.types";

export type MessageListProps = {
  messages: ChatMessage[];
  onKillCommand?: (commandId: string) => void;
  onOpenSettings?: () => void;
  onSubmitCommandInput?: (commandId: string, value: string) => void;
  searchQuery?: string;
  selectedMessageId?: string | null;
};
