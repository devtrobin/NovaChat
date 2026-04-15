import React from "react";
import { isProviderCategory } from "../../services/workspace/workspace.service";
import { AppSidebarProps } from "./AppSidebar.types";
import {
  AppSidebarAgentsSection,
  AppSidebarConversationsSection,
  AppSidebarSettingsSection,
} from "./AppSidebar.sections";
import "./AppSidebar.css";

export default function AppSidebar({
  activeAgentId,
  activeConversationId,
  activeSection,
  activeSettingsCategory,
  agents,
  conversationIndicators,
  conversations,
  isPreviewMode,
  onCreateConversation,
  onSelectAgent,
  onSelectConversation,
  onSelectSection,
  onSelectSettingsCategory,
}: AppSidebarProps) {
  const [isProviderGroupOpen, setIsProviderGroupOpen] = React.useState(isProviderCategory(activeSettingsCategory));

  React.useEffect(() => {
    if (activeSection === "settings" && isProviderCategory(activeSettingsCategory)) {
      setIsProviderGroupOpen(true);
    }
  }, [activeSection, activeSettingsCategory]);

  return (
    <aside className="app-sidebar">
      <div className="app-sidebar__brand">
        <p className="app-sidebar__eyebrow">Workspace</p>
        <h2 className="app-sidebar__title">Nova</h2>
      </div>

      <div className="app-sidebar__sections">
        <AppSidebarConversationsSection
          activeConversationId={activeConversationId}
          activeSection={activeSection}
          conversationIndicators={conversationIndicators}
          conversations={conversations}
          onCreateConversation={onCreateConversation}
          onSelectConversation={onSelectConversation}
          onSelectSection={onSelectSection}
        />
        <AppSidebarAgentsSection
          activeAgentId={activeAgentId}
          activeSection={activeSection}
          agents={agents}
          onSelectAgent={onSelectAgent}
          onSelectSection={onSelectSection}
        />
        <AppSidebarSettingsSection
          activeSection={activeSection}
          activeSettingsCategory={activeSettingsCategory}
          isPreviewMode={isPreviewMode}
          isProviderGroupOpen={isProviderGroupOpen}
          onSelectSection={onSelectSection}
          onSelectSettingsCategory={onSelectSettingsCategory}
          onToggleProviderGroup={() => {
            setIsProviderGroupOpen((current) => {
              const next = !current;
              if (next) onSelectSettingsCategory("provider");
              return next;
            });
          }}
        />
      </div>
    </aside>
  );
}
