import React from "react";
import { AppSettings } from "../../../shared/settings.types";
import SettingsPanel from "../../components/SettingsPanel/SettingsPanel";
import { AgentDefinition, SettingsCategory } from "../../services/workspace/workspace.types";

type SettingsPageProps = {
  activeCategory: SettingsCategory;
  agents: AgentDefinition[];
  onOpenConversation: (conversationId: string) => void;
  onSaved: (settings: AppSettings) => void;
  onSelectAgent: (agentId: string) => void;
};

export default function SettingsPage({ activeCategory, agents, onOpenConversation, onSaved, onSelectAgent }: SettingsPageProps) {
  return (
    <SettingsPanel
      activeCategory={activeCategory}
      agents={agents}
      onOpenConversation={onOpenConversation}
      onSaved={onSaved}
      onSelectAgent={onSelectAgent}
    />
  );
}
