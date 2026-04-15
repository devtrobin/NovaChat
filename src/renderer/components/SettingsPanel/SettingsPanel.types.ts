import { AppSettings } from "../../../shared/settings.types";
import { AgentDefinition, SettingsCategory } from "../../services/workspace/workspace.types";

export type SettingsPanelProps = {
  activeCategory: SettingsCategory;
  agents?: AgentDefinition[];
  onOpenConversation?: (conversationId: string) => void;
  onSaved: (settings: AppSettings) => void;
  onSelectAgent?: (agentId: string) => void;
};
