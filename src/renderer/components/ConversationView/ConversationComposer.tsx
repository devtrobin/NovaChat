import ChatInput from "../ChatInput/ChatInput";
import { ConversationViewProps } from "./ConversationView.types";

type ConversationComposerProps = Pick<
  ConversationViewProps,
  "conversation" | "isSending" | "onSendMessage" | "onStopTurn" | "onUpdateDraft"
>;

export default function ConversationComposer({
  conversation,
  isSending,
  onSendMessage,
  onStopTurn,
  onUpdateDraft,
}: ConversationComposerProps) {
  return (
    <div className="conversation-view__composer">
      <ChatInput
        isSending={isSending}
        onChange={(value) => onUpdateDraft(conversation.id, value)}
        onStop={() => onStopTurn(conversation.id)}
        onSubmit={onSendMessage}
        value={conversation.draft ?? ""}
      />
    </div>
  );
}
