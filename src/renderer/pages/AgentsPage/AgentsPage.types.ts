import { AppSettings } from "../../../shared/settings.types";
import { AgentDefinition } from "../../services/workspace/workspace.types";

export type AgentsPageProps = {
  activeAgent: AgentDefinition | null;
  onSavedSettings: (settings: AppSettings) => void;
};
