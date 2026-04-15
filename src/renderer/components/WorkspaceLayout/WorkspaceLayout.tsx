import React from "react";
import AppSidebar from "../AppSidebar/AppSidebar";
import AgentsPage from "../../pages/AgentsPage/AgentsPage";
import ChatPage from "../../pages/ChatPage/ChatPage";
import SettingsPage from "../../pages/SettingsPage/SettingsPage";
import { useWorkspaceLayoutController } from "./WorkspaceLayout.service";
import "./WorkspaceLayout.css";

export default function WorkspaceLayout() {
  const workspace = useWorkspaceLayoutController();

  if (!workspace.isHydrated) {
    return null;
  }

  return (
    <div className="workspace-layout">
      <AppSidebar
        activeAgentId={workspace.activeAgentId}
        activeConversationId={workspace.activeConversationId}
        activeSection={workspace.activeSection}
        activeSettingsCategory={workspace.activeSettingsCategory}
        agents={workspace.agents}
        conversationIndicators={workspace.conversationIndicators}
        conversations={workspace.conversations}
        isPreviewMode={workspace.isPreviewMode}
        onCreateConversation={workspace.onCreateConversation}
        onSelectAgent={workspace.onSelectAgent}
        onSelectConversation={workspace.onSelectConversation}
        onSelectSection={workspace.onSelectSection}
        onSelectSettingsCategory={workspace.onSelectSettingsCategory}
      />
      <div className="workspace-layout__page">
        {workspace.activeSection === "conversations" ? (
          <ChatPage
            activeConversation={workspace.activeConversation}
            isSending={workspace.isSending}
            onDeleteConversation={workspace.onDeleteConversation}
            onKillCommand={workspace.onKillCommand}
            onMarkConversationAsRead={workspace.onMarkConversationAsRead}
            onOpenSettings={() => workspace.onSelectSection("settings")}
            onRenameConversation={workspace.onRenameConversation}
            onSendMessage={workspace.onSendMessage}
            onSubmitCommandInput={workspace.onSubmitCommandInput}
            onUpdateConversationDraft={workspace.onUpdateConversationDraft}
          />
        ) : null}
        {workspace.activeSection === "agents" ? (
          <AgentsPage activeAgent={workspace.agents.find((agent) => agent.id === workspace.activeAgentId) ?? null} />
        ) : null}
        {workspace.activeSection === "settings" ? (
          <SettingsPage
            activeCategory={workspace.activeSettingsCategory}
            onSaved={workspace.onSavedSettings}
          />
        ) : null}
      </div>
    </div>
  );
}
