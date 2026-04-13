import { ConversationSidebarProps } from "./ConversationSidebar.types";
import "./ConversationSidebar.css";

export default function ConversationSidebar({
  activeAgentId,
  activeConversationId,
  activeSection,
  agents,
  conversations,
  isPreviewMode,
  onCreateConversation,
  onSelectAgent,
  onSelectConversation,
  onSelectSection,
}: ConversationSidebarProps) {
  return (
    <aside className="conversation-sidebar">
      <div className="conversation-sidebar__brand">
        <p className="conversation-sidebar__eyebrow">Workspace</p>
        <h2 className="conversation-sidebar__title">Nova</h2>
      </div>

      <div className="conversation-sidebar__sections">
        <section className={`conversation-sidebar__section${activeSection === "conversations" ? " conversation-sidebar__section--active" : ""}`}>
          <button
            className="conversation-sidebar__section-trigger"
            onClick={() => onSelectSection("conversations")}
            type="button"
          >
            <span>Conversations</span>
            <span className="conversation-sidebar__section-arrow">{activeSection === "conversations" ? "−" : "+"}</span>
          </button>
          <div className="conversation-sidebar__section-body">
            <div className="conversation-sidebar__section-body-inner">
              <button className="conversation-sidebar__button" onClick={onCreateConversation} type="button">
                Nouvelle conversation
              </button>
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
            </div>
          </div>
        </section>

        {isPreviewMode ? (
          <section className={`conversation-sidebar__section${activeSection === "agents" ? " conversation-sidebar__section--active" : ""}`}>
            <button
              className="conversation-sidebar__section-trigger"
              onClick={() => onSelectSection("agents")}
              type="button"
            >
              <span>Agents</span>
              <span className="conversation-sidebar__section-arrow">{activeSection === "agents" ? "−" : "+"}</span>
            </button>
            <div className="conversation-sidebar__section-body">
              <div className="conversation-sidebar__section-body-inner">
                <div className="conversation-sidebar__list">
                  {agents.map((agent) => {
                    const active = agent.id === activeAgentId;
                    return (
                      <button
                        key={agent.id}
                        className={`conversation-sidebar__item ${active ? "conversation-sidebar__item--active" : ""}`}
                        onClick={() => onSelectAgent(agent.id)}
                        type="button"
                      >
                        <span className="conversation-sidebar__item-title">{agent.name}</span>
                        <span className="conversation-sidebar__item-meta">{agent.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className={`conversation-sidebar__section${activeSection === "settings" ? " conversation-sidebar__section--active" : ""}`}>
          <button
            className="conversation-sidebar__section-trigger"
            onClick={() => onSelectSection("settings")}
            type="button"
          >
            <span>Parametres</span>
            <span className="conversation-sidebar__section-arrow">{activeSection === "settings" ? "−" : "+"}</span>
          </button>
        </section>
      </div>
    </aside>
  );
}
