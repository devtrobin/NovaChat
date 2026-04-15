import ChatInput from "../ChatInput/ChatInput";
import { ConversationViewProps } from "./ConversationView.types";

type ConversationComposerProps = Pick<
  ConversationViewProps,
  "conversation" | "isSending" | "onSendMessage" | "onUpdateDraft"
>;

export default function ConversationComposer({
  conversation,
  isSending,
  onSendMessage,
  onUpdateDraft,
}: ConversationComposerProps) {
  return (
    <div className="conversation-view__composer">
      <ChatInput
        isSending={isSending}
        onChange={(value) => onUpdateDraft(conversation.id, value)}
        onSubmit={onSendMessage}
        value={conversation.draft ?? ""}
      />
    </div>
  );
}
