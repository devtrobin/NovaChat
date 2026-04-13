import { ChatMessage } from "../../types/chat.types";

export type MessageItemProps = {
  message: ChatMessage;
  onKillCommand?: (commandId: string) => void;
  onOpenSettings?: () => void;
  onSubmitCommandInput?: (commandId: string, value: string) => void;
};
