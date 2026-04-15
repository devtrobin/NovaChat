import ConversationComposer from "./ConversationComposer";
import ConversationMessages from "./ConversationMessages";
import { ConversationViewProps } from "./ConversationView.types";
import "./ConversationView.css";

export default function ConversationView(props: ConversationViewProps) {
  return (
    <section className="conversation-view">
      <ConversationMessages
        conversation={props.conversation}
        initialScrollState={props.initialScrollState}
        onKillCommand={props.onKillCommand}
        onMarkConversationAsRead={props.onMarkConversationAsRead}
        onOpenSettings={props.onOpenSettings}
        onScrollStateChange={props.onScrollStateChange}
        onSubmitCommandInput={props.onSubmitCommandInput}
        searchQuery={props.searchQuery}
        selectedSearchMessageId={props.selectedSearchMessageId}
      />
      <ConversationComposer
        conversation={props.conversation}
        isSending={props.isSending}
        onSendMessage={props.onSendMessage}
        onUpdateDraft={props.onUpdateDraft}
      />
    </section>
  );
}
