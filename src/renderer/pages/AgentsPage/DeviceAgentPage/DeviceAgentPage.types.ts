import { AppSettings } from "../../../../shared/settings.types";
import { AgentDefinition } from "../../../services/workspace/workspace.types";

export type DeviceAgentPageProps = {
  agent: AgentDefinition;
  onSavedSettings: (settings: AppSettings) => void;
};

export type DeviceAgentTab = "context" | "general" | "history" | "permissions";
