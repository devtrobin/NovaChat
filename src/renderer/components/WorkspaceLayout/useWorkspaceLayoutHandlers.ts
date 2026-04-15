import React from "react";
import { SubmitPermissionDecisionRequest } from "../../../shared/ai.types";
import { AgentSettingsMap, AppSettings } from "../../../shared/settings.types";
import { WorkspaceLayoutController } from "./WorkspaceLayout.types";

type UseWorkspaceLayoutHandlersArgs = {
  setAgentSettings: React.Dispatch<React.SetStateAction<AgentSettingsMap>>;
  setActiveAgentId: React.Dispatch<React.SetStateAction<string | null>>;
  setActiveSection: React.Dispatch<React.SetStateAction<WorkspaceLayoutController["activeSection"]>>;
  setActiveSettingsCategory: React.Dispatch<React.SetStateAction<WorkspaceLayoutController["activeSettingsCategory"]>>;
  setIsPreviewMode: React.Dispatch<React.SetStateAction<boolean>>;
};

export function useWorkspaceLayoutHandlers({
  setAgentSettings,
  setActiveAgentId,
  setActiveSection,
  setActiveSettingsCategory,
  setIsPreviewMode,
}: UseWorkspaceLayoutHandlersArgs) {
  const handleSavedSettings = React.useCallback((settings: AppSettings) => {
    setAgentSettings(settings.agents);
    setIsPreviewMode(settings.previewMode);
  }, [setAgentSettings, setIsPreviewMode]);

  const handleSelectAgent = React.useCallback((agentId: string) => {
    setActiveAgentId(agentId);
    setActiveSection("agents");
  }, [setActiveAgentId, setActiveSection]);

  const handleKillCommand = React.useCallback(async (commandId: string) => {
    await window.nova.ai.killCommand(commandId);
  }, []);

  const handleSubmitCommandInput = React.useCallback(async (commandId: string, value: string) => {
    await window.nova.ai.submitCommandInput({ commandId, value });
  }, []);

  const handleSubmitPermissionDecision = React.useCallback(async (payload: SubmitPermissionDecisionRequest) => {
    await window.nova.ai.submitPermissionDecision(payload);
  }, []);

  return {
    handleKillCommand,
    handleSavedSettings,
    handleSelectAgent,
    handleSelectSection: setActiveSection,
    handleSelectSettingsCategory: setActiveSettingsCategory,
    handleSubmitPermissionDecision,
    handleSubmitCommandInput,
  };
}
