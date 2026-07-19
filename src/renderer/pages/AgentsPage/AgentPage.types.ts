import { AppSettings } from "../../../shared/settings.types";
import { AgentDefinition } from "../../services/workspace/workspace.types";

export type AgentPageProps = {
  agent: AgentDefinition;
  onSavedSettings: (settings: AppSettings) => void;
};

export type AgentPageStatus = {
  kind: "error" | "success";
  message: string;
} | null;

export type AgentPageTab = "context" | "general" | "history" | "permissions";
