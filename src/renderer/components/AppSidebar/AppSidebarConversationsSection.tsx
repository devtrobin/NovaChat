import React from "react";
import { AppSidebarProps } from "./AppSidebar.types";

type AppSidebarConversationsSectionProps = Pick<
  AppSidebarProps,
  "activeConversationId" | "activeSection" | "conversationIndicators" | "conversations" | "onCreateConversation" | "onSelectConversation" | "onSelectSection"
>;

export default function AppSidebarConversationsSection({
  activeConversationId,
  activeSection,
  conversationIndicators,
  conversations,
  onCreateConversation,
  onSelectConversation,
  onSelectSection,
}: AppSidebarConversationsSectionProps) {
  return (
    <section className={`app-sidebar__section${activeSection === "conversations" ? " app-sidebar__section--active" : ""}`}>
      <button className="app-sidebar__section-trigger" onClick={() => onSelectSection("conversations")} type="button">
        <span>Conversations</span>
        <span className="app-sidebar__section-arrow">{activeSection === "conversations" ? "−" : "+"}</span>
      </button>
      <div className="app-sidebar__section-body">
        <div className="app-sidebar__section-body-inner">
          <button className="app-sidebar__button" onClick={onCreateConversation} type="button">Nouvelle conversation</button>
          <div className="app-sidebar__list">
            {conversations.map((conversation) => {
              const active = conversation.id === activeConversationId;
              const indicators = conversationIndicators[conversation.id] ?? { hasRunningSystemMessage: false, unreadCount: 0 };
              return (
                <button
                  key={conversation.id}
                  className={`app-sidebar__item ${active ? "app-sidebar__item--active" : ""}${!active && indicators.hasRunningSystemMessage ? " app-sidebar__item--pending" : ""}`}
                  onClick={() => onSelectConversation(conversation.id)}
                  type="button"
                >
                  <div className="app-sidebar__item-row">
                    <span className="app-sidebar__item-title">{conversation.title}</span>
                    {indicators.unreadCount > 0 ? <span className="app-sidebar__item-badge">{indicators.unreadCount}</span> : null}
                  </div>
                  <div className="app-sidebar__item-row">
                    <span className="app-sidebar__item-meta">{conversation.messages.length} message{conversation.messages.length > 1 ? "s" : ""}</span>
                    {!active && indicators.hasRunningSystemMessage ? <span className="app-sidebar__item-loader" /> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
