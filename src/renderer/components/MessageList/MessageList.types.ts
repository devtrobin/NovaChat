import { ChatMessage } from "../../types/chat.types";
import { SubmitPermissionDecisionRequest } from "../../../shared/ai.types";

export type MessageListProps = {
  containerRef?: React.RefObject<HTMLElement | null>;
  messages: ChatMessage[];
  onKillCommand?: (commandId: string) => void;
  onOpenSettings?: () => void;
  onSubmitPermissionDecision?: (payload: SubmitPermissionDecisionRequest) => void;
  onSubmitCommandInput?: (commandId: string, value: string) => void;
  searchQuery?: string;
};
