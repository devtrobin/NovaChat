import { ConversationSidebarProps } from "./ConversationSidebar.types";
import "./ConversationSidebar.css";

export default function ConversationSidebar({
  activeConversationId,
  conversations,
  onCreateConversation,
  onOpenSettings,
  onSelectConversation,
}: ConversationSidebarProps) {
  return (
    <aside className="conversation-sidebar">
      <div className="conversation-sidebar__header">
        <div>
          <p className="conversation-sidebar__eyebrow">Workspace</p>
          <h2 className="conversation-sidebar__title">Conversations</h2>
        </div>
        <button className="conversation-sidebar__button" onClick={onCreateConversation} type="button">
          Nouveau
        </button>
      </div>
      <div className="conversation-sidebar__list">
        {conversations.map((conversation) => {
          const active = conversation.id === activeConversationId;
          return (
            <button
              key={conversation.id}
              className={`conversation-sidebar__item ${active ? "conversation-sidebar__item--active" : ""}`}
              onClick={() => onSelectConversation(conversation.id)}
              type="button"
            >
              <span className="conversation-sidebar__item-title">{conversation.title}</span>
              <span className="conversation-sidebar__item-meta">
                {conversation.messages.length} message{conversation.messages.length > 1 ? "s" : ""}
              </span>
            </button>
          );
        })}
      </div>
      <div className="conversation-sidebar__footer">
        <button className="conversation-sidebar__settings" onClick={onOpenSettings} type="button">
          <span className="conversation-sidebar__settings-icon">⚙</span>
          <span className="conversation-sidebar__footer-label">Nova local session</span>
        </button>
      </div>
    </aside>
  );
}
