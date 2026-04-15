import { ChatMessage } from "../../types/chat.types";

export type MessageListProps = {
  containerRef?: React.RefObject<HTMLElement | null>;
  messages: ChatMessage[];
  onKillCommand?: (commandId: string) => void;
  onOpenSettings?: () => void;
  onSubmitCommandInput?: (commandId: string, value: string) => void;
  searchQuery?: string;
};
